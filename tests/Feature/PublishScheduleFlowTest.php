<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Jobs\CheckTikTokPublishStatus;
use App\Jobs\PublishScheduledContent;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PublishScheduleFlowTest extends TestCase
{
    use RefreshDatabase;

    private const INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/content/init/';

    private const STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake([CheckTikTokPublishStatus::class]);
    }

    public function test_a_due_post_is_claimed_once(): void
    {
        $due = $this->schedule(['publish_at' => now()->subMinute()]);
        $this->schedule(['publish_at' => now()->addHour()]);
        $this->schedule(['publish_at' => now()->subMinute(), 'status' => ScheduleStatus::Failed]);

        $this->assertEquals([$due->id], Schedule::claimDue()->pluck('id')->all());
        $this->assertSame(ScheduleStatus::Publishing, $due->fresh()->status);

        // The next scheduler run finds nothing left to hand out.
        $this->assertCount(0, Schedule::claimDue());
    }

    public function test_a_repeated_job_sends_the_post_only_once(): void
    {
        $this->fakeInit();
        $schedule = $this->schedule(['status' => ScheduleStatus::Publishing]);

        (new PublishScheduledContent($schedule))->handle();
        (new PublishScheduledContent($schedule))->handle();

        Http::assertSentCount(1);
    }

    public function test_a_job_for_an_unclaimed_post_does_nothing(): void
    {
        $this->fakeInit();
        $schedule = $this->schedule(['status' => ScheduleStatus::Pending]);

        (new PublishScheduledContent($schedule))->handle();

        Http::assertNothingSent();
        $this->assertSame(ScheduleStatus::Pending, $schedule->fresh()->status);
    }

    public function test_a_tiktok_post_waits_for_the_inbox_before_counting_as_published(): void
    {
        $this->fakeInit();
        $schedule = $this->schedule(['status' => ScheduleStatus::Publishing]);

        (new PublishScheduledContent($schedule))->handle();

        $schedule->refresh();
        $this->assertSame(ScheduleStatus::Publishing, $schedule->status);
        $this->assertSame('p_inbox_123', $schedule->platform_post_id);
        Queue::assertPushed(CheckTikTokPublishStatus::class, fn ($job): bool => $job->schedule->is($schedule) && $job->check === 1);
    }

    public function test_the_draft_reaching_the_inbox_publishes_the_post(): void
    {
        $this->fakeStatus(['status' => 'SEND_TO_USER_INBOX']);
        $schedule = $this->sentSchedule();

        app()->call([new CheckTikTokPublishStatus($schedule), 'handle']);

        $this->assertSame(ScheduleStatus::Published, $schedule->fresh()->status);
    }

    public function test_a_refused_download_fails_the_post_with_the_reason(): void
    {
        $this->fakeStatus(['status' => 'FAILED', 'fail_reason' => 'photo_pull_failed']);
        $schedule = $this->sentSchedule();

        app()->call([new CheckTikTokPublishStatus($schedule), 'handle']);

        $schedule->refresh();
        $this->assertSame(ScheduleStatus::Failed, $schedule->status);
        $this->assertStringContainsString('não conseguiu baixar', $schedule->error_log);
    }

    public function test_a_draft_still_processing_is_checked_again(): void
    {
        $this->fakeStatus(['status' => 'PROCESSING_DOWNLOAD']);
        $schedule = $this->sentSchedule();

        app()->call([new CheckTikTokPublishStatus($schedule, 3), 'handle']);

        $this->assertSame(ScheduleStatus::Publishing, $schedule->fresh()->status);
        Queue::assertPushed(CheckTikTokPublishStatus::class, fn ($job): bool => $job->check === 4);
    }

    public function test_tiktok_never_confirming_fails_the_post(): void
    {
        $this->fakeStatus(['status' => 'PROCESSING_DOWNLOAD']);
        $schedule = $this->sentSchedule();

        app()->call([new CheckTikTokPublishStatus($schedule, CheckTikTokPublishStatus::MAX_CHECKS), 'handle']);

        $this->assertSame(ScheduleStatus::Failed, $schedule->fresh()->status);
        Queue::assertNotPushed(CheckTikTokPublishStatus::class);
    }

    public function test_a_post_stuck_in_publishing_is_failed_after_an_hour(): void
    {
        $stuck = $this->schedule(['status' => ScheduleStatus::Publishing]);
        $recent = $this->schedule(['status' => ScheduleStatus::Publishing]);
        Schedule::whereKey($stuck->id)->update(['updated_at' => now()->subHours(2)]);

        $this->assertSame(1, Schedule::failStuck());

        $this->assertSame(ScheduleStatus::Failed, $stuck->fresh()->status);
        $this->assertSame(ScheduleStatus::Publishing, $recent->fresh()->status);
    }

    public function test_the_publish_command_uses_the_same_claim(): void
    {
        $this->fakeInit();
        $due = $this->schedule(['publish_at' => now()->subMinute()]);
        $claimedElsewhere = $this->schedule(['publish_at' => now()->subMinute(), 'status' => ScheduleStatus::Publishing]);

        $this->artisan('posts:publish')->assertSuccessful();

        $this->assertSame('p_inbox_123', $due->fresh()->platform_post_id);
        $this->assertNull($claimedElsewhere->fresh()->platform_post_id);
        Http::assertSentCount(1);
    }

    private function fakeInit(): void
    {
        Http::fake([self::INIT_URL => Http::response([
            'data' => ['publish_id' => 'p_inbox_123'],
            'error' => ['code' => 'ok', 'message' => ''],
        ])]);
    }

    /**
     * @param  array<string, string>  $data
     */
    private function fakeStatus(array $data): void
    {
        Http::fake([self::STATUS_URL => Http::response(['data' => $data])]);
    }

    private function sentSchedule(): Schedule
    {
        return $this->schedule(['status' => ScheduleStatus::Publishing, 'platform_post_id' => 'p_inbox_123']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function schedule(array $attributes = []): Schedule
    {
        $workspace = Workspace::factory()->create();

        return Schedule::factory()->create([
            'content_project_id' => ContentProject::factory()->create([
                'workspace_id' => $workspace->id,
                'type' => 'carousel',
                'status' => 'ready',
                'script_data' => [
                    'caption' => 'Uma legenda.',
                    'image_urls' => ['https://slidezz.test/01.jpg', 'https://slidezz.test/02.jpg'],
                ],
            ]),
            'social_account_id' => SocialAccount::factory()->create([
                'workspace_id' => $workspace->id,
                'provider' => 'tiktok',
                'expires_at' => now()->addDay(),
            ]),
            'publish_at' => now()->subMinute(),
            ...$attributes,
        ]);
    }
}
