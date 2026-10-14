<?php

namespace Tests\Unit;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncPostAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private const STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

    public function test_a_tiktok_draft_not_posted_yet_gets_no_made_up_stats(): void
    {
        Http::fake([self::STATUS_URL => Http::response([
            'data' => ['status' => 'SEND_TO_USER_INBOX'],
            'error' => ['code' => 'ok'],
        ])]);

        $schedule = $this->tiktokSchedule();

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertNull($schedule->fresh()->public_post_id);
        $this->assertDatabaseMissing('post_analytics', ['schedule_id' => $schedule->id]);
        Http::assertNotSent(fn ($request): bool => str_contains($request->url(), 'video/query'));
    }

    public function test_a_posted_tiktok_draft_is_linked_to_its_video_and_gets_its_stats(): void
    {
        Http::fake([
            self::STATUS_URL => Http::response(
                '{"data":{"publicaly_available_post_id":[7696526215116508424],"status":"SEND_TO_USER_INBOX"},"error":{"code":"ok"}}',
            ),
            'open.tiktokapis.com/v2/video/query/*' => Http::response([
                'data' => ['videos' => [[
                    'id' => '7696526215116508424',
                    'view_count' => 622,
                    'like_count' => 27,
                    'comment_count' => 3,
                    'share_count' => 1,
                ]]],
                'error' => ['code' => 'ok'],
            ]),
        ]);

        $schedule = $this->tiktokSchedule();

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertSame('7696526215116508424', $schedule->fresh()->public_post_id);
        $this->assertDatabaseHas('post_analytics', [
            'schedule_id' => $schedule->id,
            'views' => 622,
            'likes' => 27,
            'comments' => 3,
            'shares' => 1,
        ]);
        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'video/query')
            && $request->data()['filters']['video_ids'] === ['7696526215116508424']);
    }

    public function test_a_linked_tiktok_post_reads_its_stats_without_asking_for_the_id_again(): void
    {
        Http::fake(['open.tiktokapis.com/v2/video/query/*' => Http::response([
            'data' => ['videos' => [['id' => '42', 'view_count' => 85, 'like_count' => 2]]],
            'error' => ['code' => 'ok'],
        ])]);

        $schedule = $this->tiktokSchedule(['public_post_id' => '42']);

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertDatabaseHas('post_analytics', ['schedule_id' => $schedule->id, 'views' => 85, 'likes' => 2]);
        Http::assertNotSent(fn ($request): bool => $request->url() === self::STATUS_URL);
    }

    public function test_a_tiktok_video_gone_from_the_api_keeps_its_last_stats(): void
    {
        Http::fake(['open.tiktokapis.com/v2/video/query/*' => Http::response([
            'data' => ['videos' => []],
            'error' => ['code' => 'ok'],
        ])]);

        $schedule = $this->tiktokSchedule(['public_post_id' => '42']);
        $schedule->postAnalytic()->create(['views' => 85, 'likes' => 2, 'comments' => 0, 'shares' => 0, 'bookmarks' => 0]);

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertDatabaseHas('post_analytics', ['schedule_id' => $schedule->id, 'views' => 85]);
    }

    public function test_job_skips_schedule_without_platform_post_id(): void
    {
        $workspace = Workspace::factory()->create();
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'status' => ScheduleStatus::Published,
            'platform_post_id' => null,
        ]);

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertDatabaseMissing('post_analytics', ['schedule_id' => $schedule->id]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function tiktokSchedule(array $attributes = []): Schedule
    {
        $workspace = Workspace::factory()->create();

        return Schedule::factory()->published()->create([
            'social_account_id' => SocialAccount::factory()->create([
                'workspace_id' => $workspace->id,
                'provider' => 'tiktok',
                'expires_at' => now()->addDay(),
            ])->id,
            'content_project_id' => ContentProject::factory()->create(['workspace_id' => $workspace->id])->id,
            'platform_post_id' => 'p_inbox_url~v2.111',
            ...$attributes,
        ]);
    }
}
