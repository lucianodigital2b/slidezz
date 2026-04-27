<?php

namespace App\Jobs;

use App\Models\Schedule;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class PublishScheduledContent implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Schedule $schedule
    ) {}

    public function handle(): void
    {
        // 1. Mark as publishing
        $this->schedule->update(['status' => 'publishing']);

        try {
            // 2. Resolve the correct social publisher strategy (TikTok, IG, etc.)
            $provider = $this->schedule->socialAccount->provider;
            $publisher = SocialPublisherFactory::make($provider);

            // 3. Publish the video draft
            $platformPostId = $publisher->publish($this->schedule->contentProject);

            // 4. Mark as success
            $this->schedule->update([
                'status' => 'published',
                'platform_post_id' => $platformPostId,
            ]);

        } catch (\Throwable $th) {
            // 5. Handle failure gracefully
            Log::error("Failed to publish schedule ID {$this->schedule->id}", [
                'error' => $th->getMessage()
            ]);

            $this->schedule->update([
                'status' => 'failed',
                'error_log' => $th->getMessage(),
            ]);

            // Depending on requirements, we could re-throw or notify the user here.
        }
    }
}
