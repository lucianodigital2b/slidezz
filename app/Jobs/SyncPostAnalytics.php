<?php

namespace App\Jobs;

use App\Models\PostAnalytic;
use App\Models\Schedule;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncPostAnalytics implements ShouldQueue
{
    use Queueable;

    public function __construct(public Schedule $schedule) {}

    public function handle(): void
    {
        if (! $this->schedule->platform_post_id) {
            return;
        }

        try {
            $provider = $this->schedule->socialAccount->provider;
            $data = SocialPublisherFactory::make($provider)
                ->getAnalytics($this->schedule->platform_post_id);

            PostAnalytic::updateOrCreate(
                ['schedule_id' => $this->schedule->id],
                [
                    'views' => $data['views'] ?? 0,
                    'likes' => $data['likes'] ?? 0,
                    'comments' => $data['comments'] ?? 0,
                    'shares' => $data['shares'] ?? 0,
                    'bookmarks' => $data['bookmarks'] ?? 0,
                    'last_synced_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning("Failed to sync analytics for schedule {$this->schedule->id}: {$e->getMessage()}");
        }
    }
}
