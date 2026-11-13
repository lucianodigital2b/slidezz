<?php

namespace App\Jobs;

use App\Models\VideoScript;
use App\Services\AI\ReferenceVideoReader;
use App\Services\AI\UrlContentExtractorService;
use App\Services\AI\VideoScriptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GenerateVideoScript implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(public VideoScript $videoScript) {}

    public function handle(VideoScriptService $service, ReferenceVideoReader $referenceReader, UrlContentExtractorService $extractor): void
    {
        $videoScript = $this->videoScript;

        if ($videoScript->status !== 'pending') {
            return;
        }

        $videoScript->update(['status' => 'running', 'error' => null]);

        try {
            $input = $this->buildInput($videoScript, $referenceReader, $extractor);
            $result = $service->generate($input, $videoScript->workspace);

            $videoScript->update([
                'status' => 'done',
                'reference' => $input['reference'],
                'result' => $result,
                'error' => null,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->markFailed($e);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        if ($this->videoScript->fresh()?->status === 'running') {
            $this->markFailed($exception);
        }
    }

    /**
     * @return array{
     *     topic: ?string,
     *     language: string,
     *     target_seconds: int,
     *     reference: ?array,
     *     source: ?array
     * }
     */
    private function buildInput(VideoScript $videoScript, ReferenceVideoReader $referenceReader, UrlContentExtractorService $extractor): array
    {
        $input = [
            'topic' => $videoScript->topic,
            'language' => $videoScript->language,
            'target_seconds' => $videoScript->target_seconds,
            'reference' => null,
            'source' => null,
        ];

        if ($videoScript->reference_url) {
            $input['reference'] = $referenceReader->read($videoScript->reference_url);
        }

        if ($videoScript->source_url) {
            $input['source'] = $extractor->extractArticle($videoScript->source_url);
        }

        return $input;
    }

    private function markFailed(\Throwable $exception): void
    {
        Log::error('[VideoScript] Generation failed', [
            'video_script_id' => $this->videoScript->id,
            'message' => $exception->getMessage(),
            'class' => $exception::class,
        ]);

        $this->videoScript->update([
            'status' => 'failed',
            'error' => Str::limit($exception->getMessage(), 1000),
        ]);
    }
}
