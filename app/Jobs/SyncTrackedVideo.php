<?php

namespace App\Jobs;

use App\Models\TrackedVideo;
use App\Services\Ugc\VideoStatsFetcher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Refresh one UGC video's public metrics and append a history snapshot. Instagram
 * has no metrics source, so those rows stay on their manually-entered numbers and
 * are skipped here.
 */
class SyncTrackedVideo implements ShouldQueue
{
    use Queueable;

    public function __construct(public TrackedVideo $video) {}

    public function handle(VideoStatsFetcher $fetcher): void
    {
        if ($this->video->platform !== 'tiktok') {
            return;
        }

        $data = $fetcher->fetch($this->video->url);

        if (($data['fetch_status'] ?? 'error') !== 'ok') {
            $this->video->update(['fetch_status' => 'error', 'last_synced_at' => now()]);

            return;
        }

        $this->video->recordMetrics($data, 'ok');

        // Backfill metadata that may have been missing on first add.
        $this->video->fill(array_filter([
            'external_id' => $this->video->external_id ?: $data['external_id'],
            'thumbnail_url' => $this->video->thumbnail_url ?: $data['thumbnail_url'],
            'caption' => $this->video->caption ?: $data['caption'],
            'author_handle' => $this->video->author_handle ?: $data['author_handle'],
        ]))->save();
    }
}
