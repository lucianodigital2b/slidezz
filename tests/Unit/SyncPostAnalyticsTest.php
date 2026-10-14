<?php

namespace Tests\Unit;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncPostAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_tiktok_posts_get_no_made_up_stats(): void
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

        $this->assertDatabaseMissing('post_analytics', ['schedule_id' => $schedule->id]);
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
}
