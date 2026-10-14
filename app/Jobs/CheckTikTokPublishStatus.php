<?php

namespace App\Jobs;

use App\Enums\ScheduleStatus;
use App\Models\Schedule;
use App\Services\Social\TikTokPublisher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Follows a TikTok publish_id until the draft reaches the inbox or TikTok
 * refuses it, re-dispatching itself every INTERVAL seconds.
 *
 * @see https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
 */
class CheckTikTokPublishStatus implements ShouldQueue
{
    use Queueable;

    public const INTERVAL = 15;

    /** 40 checks 15 s apart: TikTok gets 10 minutes to deliver. */
    public const MAX_CHECKS = 40;

    public int $tries = 1;

    public function __construct(
        public Schedule $schedule,
        public int $check = 1,
    ) {}

    public function handle(TikTokPublisher $publisher): void
    {
        $schedule = $this->schedule->fresh();

        // The webhook may have settled it, or the user deleted it meanwhile.
        if (! $schedule || $schedule->status !== ScheduleStatus::Publishing || ! $schedule->platform_post_id) {
            return;
        }

        try {
            $result = $publisher->fetchStatus($schedule->socialAccount, $schedule->platform_post_id);
        } catch (\Throwable) {
            $result = ['status' => 'UNKNOWN', 'fail_reason' => ''];
        }

        if (in_array($result['status'], ['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE'], true)) {
            $schedule->update(['status' => ScheduleStatus::Published, 'error_log' => null]);
        } elseif ($result['status'] === 'FAILED') {
            $schedule->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => $publisher->describeFailure($result['fail_reason']),
            ]);
        } elseif ($this->check >= self::MAX_CHECKS) {
            $schedule->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => 'O TikTok não confirmou a entrega em 10 minutos. Confira o inbox do app antes de reenviar.',
            ]);
        } else {
            self::dispatch($schedule, $this->check + 1)->delay(now()->addSeconds(self::INTERVAL));
        }
    }
}
