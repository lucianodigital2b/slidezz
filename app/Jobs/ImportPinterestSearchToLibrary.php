<?php

namespace App\Jobs;

use App\Models\Workspace;
use App\Services\Images\ImageSourceFactory;
use App\Services\Media\MediaLibrary;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Stocks the library from a keyword search, so a workspace can build up photos
 * before it ever generates a carousel.
 */
class ImportPinterestSearchToLibrary implements ShouldQueue
{
    use Queueable;

    /** Paging Pinterest and downloading files is slow. */
    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(
        public Workspace $workspace,
        public string $query,
        public int $limit = 20,
        public string $source = 'pinterest',
    ) {}

    public function handle(MediaLibrary $library): void
    {
        $source = ImageSourceFactory::make($this->source, $this->workspace->owner?->byokGeminiKey());
        $images = $source->search($this->query, $this->limit);
        $imported = 0;

        foreach ($images as $image) {
            try {
                $library->storeFromUrl($this->workspace, $image['url'], [
                    'source' => $source->name(),
                    'source_id' => $image['source_id'],
                    'query' => $this->query,
                ]);
                $imported++;
            } catch (\Throwable $e) {
                // One dead pin should not abort an otherwise good import.
                Log::warning('[MediaLibrary] Import skipped a photo', [
                    'workspace_id' => $this->workspace->id,
                    'url' => $image['url'],
                    'message' => $e->getMessage(),
                ]);
            }
        }

        Log::info('[MediaLibrary] Search import finished', [
            'workspace_id' => $this->workspace->id,
            'query' => $this->query,
            'imported' => $imported,
            'found' => count($images),
        ]);
    }
}
