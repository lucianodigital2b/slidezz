<?php

namespace App\Jobs;

use App\Models\VideoProject;
use App\Services\Video\AutoEditPlanner;
use App\Services\Video\GroqTranscriber;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Runs the automatic edit pipeline for a raw talking-head recording:
 * probe duration, transcribe with Groq, plan cuts/captions/zooms, and
 * replace the timeline with the result.
 */
class AutoEditRecording implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(public VideoProject $videoProject) {}

    public function handle(GroqTranscriber $transcriber, AutoEditPlanner $planner): void
    {
        $project = $this->videoProject;

        try {
            if ($project->source_recording_path === null) {
                $this->markFailed('Nenhuma gravação de origem foi enviada.');

                return;
            }

            $localPath = $this->localCopyOf($project->source_recording_path);

            if ($localPath === null) {
                $this->markFailed('A gravação de origem não pôde ser lida.');

                return;
            }

            $project->update(['auto_edit_status' => 'transcribing']);

            $duration = $transcriber->probeDuration($localPath);

            if ($duration > 600) {
                $this->markFailed('O vídeo precisa ter no máximo 10 minutos para edição automática.');

                return;
            }

            if (! $transcriber->isConfigured()) {
                $this->markFailed('Falta configurar a transcrição (GROQ_API_KEY).');

                return;
            }

            $transcript = $transcriber->transcribe($localPath, $project->autoEditLanguage());

            $project->update([
                'transcript' => $transcript,
                'auto_edit_status' => 'planning',
            ]);

            $plan = $planner->plan(
                $transcript,
                $duration,
                $project->autoEditLanguage() ?? 'pt',
            );

            $project->update(['auto_edit_plan' => $plan]);

            $timeline = $this->buildTimeline($project, $plan, $project->autoEditCaptionStyle());

            $project->update([
                'timeline' => $timeline,
                'auto_edit_status' => 'done',
                'auto_edit_error' => null,
            ]);
        } catch (\Throwable $e) {
            Log::error('[AutoEdit] Auto edit failed', [
                'video_project_id' => $project->id,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);

            $this->markFailed(Str::limit($e->getMessage(), 1000));
        }
    }

    public function failed(\Throwable $exception): void
    {
        $this->markFailed(Str::limit($exception->getMessage(), 1000));
    }

    private function markFailed(string $error): void
    {
        $this->videoProject->update([
            'auto_edit_status' => 'failed',
            'auto_edit_error' => $error,
        ]);
    }

    private function localCopyOf(string $path): ?string
    {
        $disk = Storage::disk(config('filesystems.media_disk'));

        if (is_file($disk->path($path))) {
            return $disk->path($path);
        }

        $temp = tempnam(sys_get_temp_dir(), 'slidezz_recording_');

        if ($temp === false) {
            return null;
        }

        $stream = $disk->readStream($path);

        if ($stream === null) {
            unlink($temp);

            return null;
        }

        file_put_contents($temp, $stream);

        if (is_resource($stream)) {
            fclose($stream);
        }

        return $temp;
    }

    /**
     * @param  array{keep: list<array{start: float, end: float}>, zooms: list<array{start: float, end: float}>, captions: list<array{text: string, start: float, end: float, words: list<array{text: string, start: float, end: float, highlight: bool}>}>}  $plan
     * @return array{clips: list<array<string, mixed>>, audio: null, captions: array{enabled: bool, style: string, position: string, items: list<array<string, mixed>>}}
     */
    private function buildTimeline(VideoProject $project, array $plan, string $captionStyle): array
    {
        $src = $project->sourceRecordingUrl();

        if ($src === null) {
            throw new \RuntimeException('A gravação de origem não tem URL pública.');
        }

        $clips = $this->buildClips($plan['keep'], $plan['zooms'], $src);
        $captions = [
            'enabled' => true,
            'style' => $captionStyle,
            'position' => 'center',
            'items' => $plan['captions'],
        ];

        return [
            'clips' => $clips,
            'audio' => null,
            'captions' => $captions,
        ];
    }

    /**
     * @param  list<array{start: float, end: float}>  $keep
     * @param  list<array{start: float, end: float}>  $zooms
     * @return list<array<string, mixed>>
     */
    private function buildClips(array $keep, array $zooms, string $src): array
    {
        $keep = $this->sanitizeKeepRanges($keep);
        $keep = $this->applyMinMax($keep);

        $clips = [];
        foreach ($keep as $range) {
            $clips[] = [
                'id' => (string) Str::uuid(),
                'type' => 'video',
                'src' => $src,
                'duration' => round($range['end'] - $range['start'], 3),
                'trimStart' => round($range['start'], 3),
                'transition' => 'none',
                'text' => '',
                'textPosition' => 'center',
                'zoom' => false,
                'punchIn' => false,
                'muted' => false,
            ];
        }

        if ($zooms === []) {
            return $clips;
        }

        return $this->splitClipsForZooms($clips, $zooms);
    }

    /**
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{start: float, end: float}>
     */
    private function sanitizeKeepRanges(array $keep): array
    {
        $valid = array_values(array_filter($keep, fn (array $range): bool => $range['end'] > $range['start']));
        usort($valid, fn ($a, $b): int => $a['start'] <=> $b['start']);

        return $valid;
    }

    /**
     * Splits long ranges and merges/drops short ones.
     *
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{start: float, end: float}>
     */
    private function applyMinMax(array $keep): array
    {
        $max = (float) config('remotion.max_clip_seconds', 60);
        $min = 0.5;
        $result = [];

        foreach ($keep as $range) {
            $start = $range['start'];
            $end = $range['end'];
            $duration = $end - $start;

            if ($duration < $min) {
                $previous = end($result);
                if ($previous !== false && $max >= $previous['end'] - $previous['start'] + $duration) {
                    $result[array_key_last($result)]['end'] = $end;
                }

                continue;
            }

            while ($start < $end) {
                $chunkDuration = min($max, $end - $start);
                $result[] = ['start' => $start, 'end' => $start + $chunkDuration];
                $start += $chunkDuration;
            }
        }

        return $result;
    }

    /**
     * @param  list<array<string, mixed>>  $clips
     * @param  list<array{start: float, end: float}>  $zooms
     * @return list<array<string, mixed>>
     */
    private function splitClipsForZooms(array $clips, array $zooms): array
    {
        $outputTime = 0.0;
        $splitted = [];

        foreach ($clips as $clip) {
            $clipStart = $outputTime;
            $clipEnd = $clipStart + $clip['duration'];
            $pieces = [];
            $cursor = $clipStart;

            foreach ($zooms as $zoom) {
                $zoomStart = $zoom['start'];
                $zoomEnd = $zoom['end'];

                if ($zoomEnd <= $clipStart || $zoomStart >= $clipEnd) {
                    continue;
                }

                $intersectStart = max($clipStart, $zoomStart);
                $intersectEnd = min($clipEnd, $zoomEnd);

                if ($intersectStart > $cursor) {
                    $pieces[] = [
                        'start' => $cursor,
                        'end' => $intersectStart,
                        'punchIn' => false,
                    ];
                }

                $pieces[] = [
                    'start' => $intersectStart,
                    'end' => $intersectEnd,
                    'punchIn' => true,
                ];
                $cursor = $intersectEnd;
            }

            if ($cursor < $clipEnd) {
                $pieces[] = [
                    'start' => $cursor,
                    'end' => $clipEnd,
                    'punchIn' => false,
                ];
            }

            foreach ($pieces as $piece) {
                $duration = round($piece['end'] - $piece['start'], 3);
                $trimStart = round($clip['trimStart'] + ($piece['start'] - $clipStart), 3);
                $splitted[] = [
                    'id' => (string) Str::uuid(),
                    'type' => 'video',
                    'src' => $clip['src'],
                    'duration' => $duration,
                    'trimStart' => $trimStart,
                    'transition' => 'none',
                    'text' => '',
                    'textPosition' => 'center',
                    'zoom' => false,
                    'punchIn' => $piece['punchIn'],
                    'muted' => false,
                ];
            }

            $outputTime = $clipEnd;
        }

        return $splitted;
    }
}
