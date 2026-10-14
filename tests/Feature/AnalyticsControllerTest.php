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
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
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

    public function test_connected_tiktok_accounts_load_their_totals_and_videos(): void
    {
        Http::fake([
            'open.tiktokapis.com/v2/user/info/*' => Http::response([
                'data' => ['user' => ['follower_count' => 1200, 'following_count' => 3, 'likes_count' => 45000, 'video_count' => 18]],
                'error' => ['code' => 'ok'],
            ]),
            'open.tiktokapis.com/v2/video/list/*' => Http::response([
                'data' => ['videos' => [['id' => '1', 'title' => 'Rotina', 'view_count' => 5300]]],
                'error' => ['code' => 'ok'],
            ]),
        ]);

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'handle' => 'dailyhair',
            'expires_at' => now()->addDay(),
        ]);
        SocialAccount::factory()->create(['provider' => 'tiktok', 'expires_at' => now()->addDay()]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->missing('tiktokAccounts')
                ->loadDeferredProps(fn ($reload) => $reload
                    ->has('tiktokAccounts', 1)
                    ->where('tiktokAccounts.0.handle', 'dailyhair')
                    ->where('tiktokAccounts.0.insights.followers', 1200)
                    ->where('tiktokAccounts.0.insights.recent.0.views', 5300)
                    ->where('tiktokAccounts.0.error', null)
                )
            );
    }

    public function test_a_tiktok_account_that_fails_shows_its_error(): void
    {
        Http::fake(['open.tiktokapis.com/*' => Http::response([
            'error' => ['code' => 'access_token_invalid', 'message' => ''],
        ], 401)]);

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->loadDeferredProps(fn ($reload) => $reload
                    ->where('tiktokAccounts.0.insights', null)
                    ->where('tiktokAccounts.0.error', fn ($error) => str_contains($error, 'Reconecte'))
                )
            );
    }

    public function test_a_tiktok_account_that_times_out_shows_a_friendly_message_and_the_others_still_load(): void
    {
        Http::fake(function (Request $request) {
            if ($request->hasHeader('Authorization', 'Bearer slow-token')) {
                return Http::failedConnection('cURL error 28: Operation timed out after 15001 milliseconds')($request);
            }

            return str_contains($request->url(), 'user/info/')
                ? Http::response(['data' => ['user' => ['follower_count' => 1200]], 'error' => ['code' => 'ok']])
                : Http::response(['data' => ['videos' => []], 'error' => ['code' => 'ok']]);
        });

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $fast = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'handle' => 'fast',
            'expires_at' => now()->addDay(),
        ]);
        $slow = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'handle' => 'slow',
            'access_token' => 'slow-token',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->get('/analytics')
            ->assertInertia(fn ($page) => $page
                ->loadDeferredProps(fn ($reload) => $reload
                    ->has('tiktokAccounts', 2)
                    ->where('tiktokAccounts.0.insights.followers', 1200)
                    ->where('tiktokAccounts.0.error', null)
                    ->where('tiktokAccounts.1.insights', null)
                    ->where('tiktokAccounts.1.error', fn ($error) => str_contains($error, 'demorou') && ! str_contains($error, 'cURL'))
                )
            );

        // Only the account that answered is cached, so the slow one retries next load.
        $this->assertTrue(Cache::has("tiktok-insights:{$fast->id}"));
        $this->assertFalse(Cache::has("tiktok-insights:{$slow->id}"));
    }
}
