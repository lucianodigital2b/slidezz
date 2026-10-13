<?php

namespace Tests\Unit;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\ContentProject;
use App\Models\PostAnalytic;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncPostAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_creates_post_analytic_record(): void
    {
        $workspace = Workspace::factory()->create();
        $socialAccount = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
        ]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->published()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
        ]);

        (new SyncPostAnalytics($schedule))->handle();

        $analytic = PostAnalytic::where('schedule_id', $schedule->id)->first();

        $this->assertNotNull($analytic);
        $this->assertGreaterThanOrEqual(0, $analytic->views);
        $this->assertGreaterThanOrEqual(0, $analytic->likes);
        $this->assertNotNull($analytic->last_synced_at);
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

    public function test_job_updates_existing_post_analytic_on_re_sync(): void
    {
        $workspace = Workspace::factory()->create();
        $socialAccount = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
        ]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->published()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
        ]);

        PostAnalytic::create([
            'schedule_id' => $schedule->id,
            'views' => 0,
            'likes' => 0,
            'last_synced_at' => now()->subHour(),
        ]);

        (new SyncPostAnalytics($schedule))->handle();

        $this->assertDatabaseCount('post_analytics', 1);

        $analytic = PostAnalytic::where('schedule_id', $schedule->id)->first();
        $this->assertTrue($analytic->last_synced_at->isAfter(now()->subMinute()));
    }
}
