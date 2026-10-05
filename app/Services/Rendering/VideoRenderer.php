<?php

namespace App\Services\Rendering;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Renders a video timeline to MP4 by shelling out to Remotion
 * (resources/js/remotion/render.mjs), which drives headless Chrome and ffmpeg.
 */
class VideoRenderer
{
    /**
     * @param  array{format: string, timeline: array<string, mixed>}  $props
     * @param  (callable(int): void)|null  $onProgress  Receives 0-100 as frames are rendered.
     * @return string Absolute path of a temporary MP4 the caller must move or delete.
     */
    public function render(array $props, ?callable $onProgress = null): string
    {
        $directory = storage_path('app/private/video-renders');
        File::ensureDirectoryExists($directory);

        $name = (string) Str::uuid();
        $propsPath = "{$directory}/{$name}.json";
        $outputPath = "{$directory}/{$name}.mp4";

        File::put($propsPath, json_encode($props, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));

        $command = array_values(array_filter([
            config('services.remotion.node_binary'),
            resource_path('js/remotion/render.mjs'),
            $propsPath,
            $outputPath,
            config('services.remotion.bundle_path'),
        ]));

        try {
            $result = Process::path(base_path())
                ->timeout((int) config('services.remotion.timeout'))
                ->env(array_filter(['REMOTION_CONCURRENCY' => config('services.remotion.concurrency')]))
                ->run($command, function (string $type, string $output) use ($onProgress): void {
                    $progress = $type === 'out' ? self::progressFrom($output) : null;

                    if ($onProgress && $progress !== null) {
                        $onProgress($progress);
                    }
                });

            if ($result->failed() || ! is_file($outputPath)) {
                File::delete($outputPath);
                $details = trim($result->errorOutput()) ?: trim($result->output());

                throw new RuntimeException('Video render failed: '.Str::limit($details, 1000));
            }

            return $outputPath;
        } finally {
            File::delete($propsPath);
        }
    }

    /**
     * The latest `progress:<0-100>` line in a chunk of render.mjs output, if any.
     * A chunk can hold several lines, or none, depending on how stdout was buffered.
     */
    public static function progressFrom(string $output): ?int
    {
        if (! preg_match_all('/^progress:(\d{1,3})\s*$/m', $output, $matches)) {
            return null;
        }

        return min(100, (int) end($matches[1]));
    }
}
