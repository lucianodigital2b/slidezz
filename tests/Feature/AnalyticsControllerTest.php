<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\ContentProject;
use App\Models\PostAnalytic;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/analytics')->assertRedirect('/login');
    }

    public function test_analytics_page_renders_with_stats(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/analytics')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Analytics')
                ->has('stats.total_views')
                ->has('stats.total_likes')
                ->has('stats.total_comments')
                ->has('stats.avg_engagement_rate')
                ->has('posts')
                ->has('period')
            );
    }

    public function test_only_published_posts_appear_in_analytics(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $published = Schedule::factory()->published()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
        ]);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'status' => ScheduleStatus::Pending,
        ]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->has('posts', 1)
                ->where('posts.0.id', $published->id)
            );
    }

    public function test_stats_aggregate_analytics_from_post_analytics(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->published()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
        ]);

        PostAnalytic::factory()->create([
            'schedule_id' => $schedule->id,
            'views' => 5000,
            'likes' => 300,
        ]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->where('stats.total_views', 5000)
                ->where('stats.total_likes', 300)
                ->where('posts.0.views', 5000)
                ->where('posts.0.likes', 300)
            );
    }

    public function test_posts_from_other_users_workspaces_are_excluded(): void
    {
        $user = User::factory()->create();

        $otherWorkspace = Workspace::factory()->create();
        $otherAccount = SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);
        $otherProject = ContentProject::factory()->create(['workspace_id' => $otherWorkspace->id]);

        Schedule::factory()->published()->create([
            'social_account_id' => $otherAccount->id,
            'content_project_id' => $otherProject->id,
        ]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->where('stats.total_views', 0)
                ->where('posts', [])
            );
    }

    public function test_sync_dispatches_jobs_for_published_posts(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        Schedule::factory()->published()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
        ]);

        $this->actingAs($user)
            ->post('/analytics/sync')
            ->assertRedirect('/analytics');

        Queue::assertPushed(SyncPostAnalytics::class, 1);
    }

    public function test_sync_does_not_dispatch_for_other_users_posts(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $otherWorkspace = Workspace::factory()->create();
        $otherAccount = SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);
        $otherProject = ContentProject::factory()->create(['workspace_id' => $otherWorkspace->id]);
        Schedule::factory()->published()->create([
            'social_account_id' => $otherAccount->id,
            'content_project_id' => $otherProject->id,
        ]);

        $this->actingAs($user)
            ->post('/analytics/sync')
            ->assertRedirect('/analytics');

        Queue::assertNothingPushed();
    }
}
