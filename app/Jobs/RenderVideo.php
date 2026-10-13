<?php

namespace App\Jobs;

use App\Models\VideoProject;
use App\Services\Rendering\VideoRenderer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Renders a video project's timeline to MP4 and publishes it on the media disk.
 */
class RenderVideo implements ShouldQueue
{
    use Queueable;

    /** Chrome renders frame by frame; a minute of 1080p video can take several. */
    public int $timeout = 1800;

    public int $tries = 1;

    /** Progress is written at most this often (in percentage points) to spare the DB. */
    private const PROGRESS_STEP = 5;

    public function __construct(public VideoProject $videoProject) {}

    public function handle(VideoRenderer $renderer): void
    {
        $project = $this->videoProject;
        $lastProgress = 0;
        $outputPath = null;

        try {
            $outputPath = $renderer->render(
                ['format' => $project->format, 'timeline' => $project->timeline],
                function (int $progress) use ($project, &$lastProgress): void {
                    if ($progress - $lastProgress >= self::PROGRESS_STEP) {
                        $lastProgress = $progress;
                        $project->update(['render_progress' => min(99, $progress)]);
                    }
                },
            );

            $disk = Storage::disk(config('filesystems.media_disk'));
            $path = $project->storageDirectory().'/render-'.now()->format('YmdHis').'.mp4';

            $stream = fopen($outputPath, 'r');
            // Social platforms pull the file by URL, so it must be world-readable.
            $disk->put($path, $stream, 'public');

            if (is_resource($stream)) {
                fclose($stream);
            }

            $previousPath = $project->video_path;

            $project->update([
                'status' => 'ready',
                'render_progress' => 100,
                'video_path' => $path,
                'render_error' => null,
                'rendered_at' => now(),
            ]);

            if ($previousPath && $previousPath !== $path) {
                $disk->delete($previousPath);
            }
        } catch (\Throwable $e) {
            $this->markFailed($e);

            throw $e;
        } finally {
            if ($outputPath) {
                File::delete($outputPath);
            }
        }
    }

    /**
     * Also reached when the worker kills the job on timeout, where `handle` never gets to catch.
     */
    public function failed(\Throwable $exception): void
    {
        if ($this->videoProject->fresh()?->isRendering()) {
            $this->markFailed($exception);
        }
    }

    private function markFailed(\Throwable $exception): void
    {
        Log::error('[Video] Render failed', [
            'video_project_id' => $this->videoProject->id,
            'message' => $exception->getMessage(),
            'class' => $exception::class,
        ]);

        $this->videoProject->update([
            'status' => 'failed',
            'render_error' => Str::limit($exception->getMessage(), 1000),
        ]);
    }
}
