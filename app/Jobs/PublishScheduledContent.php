<?php

namespace App\Jobs;

use App\Enums\ScheduleStatus;
use App\Models\Schedule;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Sends one claimed schedule (status publishing, see Schedule::claimDue) to its
 * network. Never retried: a second attempt could post twice.
 */
class PublishScheduledContent implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public Schedule $schedule
    ) {}

    public function handle(): void
    {
        $schedule = $this->schedule->fresh();

        // Only a claimed row that was not sent yet goes out. Anything else is a
        // job for a row that was deleted, moved, failed by the sweep or already sent.
        if (! $schedule || $schedule->status !== ScheduleStatus::Publishing || $schedule->platform_post_id) {
            return;
        }

        $provider = $schedule->socialAccount->provider;

        try {
            $platformPostId = SocialPublisherFactory::make($provider)
                ->publish($schedule->contentProject, $schedule);
        } catch (\Throwable $th) {
            Log::error("Failed to publish schedule ID {$schedule->id}", [
                'error' => $th->getMessage(),
            ]);

            $schedule->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => $th->getMessage(),
            ]);

            return;
        }

        if ($provider === 'tiktok') {
            // TikTok only accepted the request: it downloads the media and
            // delivers the draft afterwards, so the row stays publishing until
            // the status check (or the webhook) confirms it reached the inbox.
            $schedule->update(['platform_post_id' => $platformPostId]);
            CheckTikTokPublishStatus::dispatch($schedule)->delay(now()->addSeconds(CheckTikTokPublishStatus::INTERVAL));

            return;
        }

        $schedule->update([
            'status' => ScheduleStatus::Published,
            'platform_post_id' => $platformPostId,
            'error_log' => null,
        ]);
    }
}
