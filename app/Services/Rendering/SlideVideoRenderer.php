<?php

namespace App\Services\Rendering;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Renders a timeline of still images to MP4 with plain ffmpeg: no headless Chrome,
 * so a carousel comes out in seconds instead of the minute Remotion takes.
 *
 * Only covers what a carousel needs (images, cuts, fade/slide/wipe transitions).
 * Text, zoom, video clips and music stay with {@see VideoRenderer}. Timing mirrors
 * resources/js/remotion/timeline.ts so both renderers produce the same cut.
 */
class SlideVideoRenderer
{
    private const FPS = 30;

    /** TRANSITION_SECONDS in timeline.ts, in frames. */
    private const TRANSITION_FRAMES = 15;

    private const SIZES = [
        'stories' => [1080, 1920],
        'post' => [1080, 1350],
    ];

    /** Remotion's slide() and wipe() enter from the left. */
    private const XFADE = [
        'fade' => 'fade',
        'slide' => 'slideright',
        'wipe' => 'wiperight',
    ];

    /**
     * Whether this renderer can draw the timeline on its own.
     *
     * @param  array<string, mixed>  $timeline
     */
    public static function supports(array $timeline): bool
    {
        if (! empty($timeline['audio']) || empty($timeline['clips'])) {
            return false;
        }

        foreach ($timeline['clips'] as $clip) {
            if ($clip['type'] !== 'image' || ! empty($clip['zoom']) || trim((string) ($clip['text'] ?? '')) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array{format: string, timeline: array<string, mixed>}  $props
     * @param  (callable(int): void)|null  $onProgress  Receives 0-100 as frames are encoded.
     * @return string Absolute path of a temporary MP4 the caller must move or delete.
     */
    public function render(array $props, ?callable $onProgress = null): string
    {
        $timeline = $props['timeline'];

        if (! self::supports($timeline)) {
            throw new RuntimeException('This timeline needs the Remotion renderer.');
        }

        [$width, $height] = self::SIZES[$props['format']] ?? self::SIZES['stories'];

        $directory = storage_path('app/private/video-renders');
        $name = (string) Str::uuid();
        $workDirectory = "{$directory}/{$name}";
        $outputPath = "{$directory}/{$name}.mp4";
        File::ensureDirectoryExists($workDirectory);

        try {
            $clips = array_values($timeline['clips']);
            $inputs = [];

            foreach ($clips as $index => $clip) {
                $inputs[] = $this->copyToLocal($clip['src'], "{$workDirectory}/{$index}");
            }

            [$filter, $label, $totalFrames] = self::filterGraph($clips, $width, $height);

            $command = [config('services.ffmpeg.binary'), '-y', '-v', 'error', '-nostats', '-progress', 'pipe:1'];

            foreach ($clips as $index => $clip) {
                $seconds = self::clipFrames($clip) / self::FPS;
                array_push($command, '-loop', '1', '-framerate', (string) self::FPS, '-t', (string) $seconds, '-i', $inputs[$index]);
            }

            array_push(
                $command,
                '-filter_complex', $filter,
                '-map', "[{$label}]",
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
                '-pix_fmt', 'yuv420p', '-r', (string) self::FPS,
                '-movflags', '+faststart',
                $outputPath,
            );

            $totalSeconds = $totalFrames / self::FPS;

            $result = Process::timeout((int) config('services.ffmpeg.timeout'))
                ->run($command, function (string $type, string $output) use ($onProgress, $totalSeconds): void {
                    $seconds = $type === 'out' ? self::secondsFrom($output) : null;

                    if ($onProgress && $seconds !== null) {
                        $onProgress(min(100, (int) floor($seconds / $totalSeconds * 100)));
                    }
                });

            if ($result->failed() || ! is_file($outputPath)) {
                File::delete($outputPath);

                throw new RuntimeException('Video render failed: '.Str::limit(trim($result->errorOutput()), 1000));
            }

            return $outputPath;
        } finally {
            File::deleteDirectory($workDirectory);
        }
    }

    /**
     * The ffmpeg filter graph: every image scaled to cover the frame, then chained with
     * xfade (transitions overlap, like Remotion's TransitionSeries) or concat (cuts).
     *
     * @param  list<array<string, mixed>>  $clips
     * @return array{0: string, 1: string, 2: int} Graph, output label and length in frames.
     */
    public static function filterGraph(array $clips, int $width, int $height): array
    {
        $parts = [];

        foreach ($clips as $index => $clip) {
            $parts[] = "[{$index}:v]scale={$width}:{$height}:force_original_aspect_ratio=increase,"
                ."crop={$width}:{$height},scale=out_range=tv,setsar=1,fps=".self::FPS.",format=yuv420p[v{$index}]";
        }

        $label = 'v0';
        $frames = self::clipFrames($clips[0]);

        for ($index = 1; $index < count($clips); $index++) {
            $transitionFrames = self::transitionFrames($clips, $index);
            $next = "x{$index}";

            if ($transitionFrames > 0) {
                $parts[] = sprintf(
                    '[%s][v%d]xfade=transition=%s:duration=%s:offset=%s[%s]',
                    $label,
                    $index,
                    self::XFADE[$clips[$index]['transition']] ?? 'fade',
                    self::seconds($transitionFrames),
                    self::seconds($frames - $transitionFrames),
                    $next,
                );
            } else {
                $parts[] = "[{$label}][v{$index}]concat=n=2:v=1:a=0[{$next}]";
            }

            $frames += self::clipFrames($clips[$index]) - $transitionFrames;
            $label = $next;
        }

        return [implode(';', $parts), $label, $frames];
    }

    /**
     * The latest `out_time_us` in a chunk of `-progress` output, in seconds.
     */
    public static function secondsFrom(string $output): ?float
    {
        if (! preg_match_all('/^out_time_us=(\d+)\s*$/m', $output, $matches)) {
            return null;
        }

        return (int) end($matches[1]) / 1_000_000;
    }

    /**
     * @param  array<string, mixed>  $clip
     */
    private static function clipFrames(array $clip): int
    {
        return max(1, (int) round((float) $clip['duration'] * self::FPS));
    }

    /**
     * Mirrors transitionFramesAt() in timeline.ts.
     *
     * @param  list<array<string, mixed>>  $clips
     */
    private static function transitionFrames(array $clips, int $index): int
    {
        if ($clips[$index]['transition'] === 'none') {
            return 0;
        }

        $shortest = min(self::clipFrames($clips[$index - 1]), self::clipFrames($clips[$index]));

        return max(0, min(self::TRANSITION_FRAMES, $shortest - 1));
    }

    private static function seconds(int $frames): string
    {
        return rtrim(rtrim(number_format($frames / self::FPS, 4, '.', ''), '0'), '.');
    }

    /**
     * Timeline sources are URLs on the media disk (VideoProjectController only accepts
     * those), so they are read straight from the disk instead of over HTTP.
     */
    private function copyToLocal(string $src, string $basePath): string
    {
        $disk = $this->disk();
        $baseUrl = Str::beforeLast(url($disk->url('_')), '_');

        if (! str_starts_with($src, $baseUrl)) {
            throw new RuntimeException("Clip source is not on the media disk: {$src}");
        }

        $path = rawurldecode(Str::after($src, $baseUrl));
        $stream = $disk->readStream($path);

        if (! is_resource($stream)) {
            throw new RuntimeException("Clip source is missing from the media disk: {$path}");
        }

        $localPath = $basePath.'.'.(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');
        $local = fopen($localPath, 'w');
        stream_copy_to_stream($stream, $local);
        fclose($local);
        fclose($stream);

        return $localPath;
    }

    private function disk(): Filesystem
    {
        return Storage::disk(config('filesystems.media_disk'));
    }
}
