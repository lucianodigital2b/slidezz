<?php

namespace Tests\Feature;

use App\Jobs\SyncAccountStats;
use App\Models\AccountPost;
use App\Models\AccountSnapshot;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Social\AccountStatsFetcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccountStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // CI has no .env: the publishers need these to construct.
        config([
            'services.tiktok.client_id' => 'tt-app',
            'services.tiktok.client_secret' => 'tt-secret',
            'services.tiktok.redirect' => '/social-accounts/tiktok/callback',
        ]);

        Http::preventStrayRequests();
    }

    private function createWorkspaceAccount(string $provider = 'instagram', string $providerId = 'acc-1'): SocialAccount
    {
        $workspace = Workspace::factory()->create();

        return SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => $provider,
            'provider_id' => $providerId,
            'access_token' => 'token',
        ]);
    }

    public function test_instagram_fetch_maps_profile_and_carousel_reel_image_types_and_paginates_once(): void
    {
        $account = $this->createWorkspaceAccount('instagram', 'ig-user-1');

        Http::fake([
            'https://graph.instagram.com/v21.0/media-2/insights?*' => Http::response([
                'data' => [
                    ['name' => 'views', 'values' => [['value' => 900]]],
                    ['name' => 'shares', 'values' => [['value' => 7]]],
                    ['name' => 'saved', 'values' => [['value' => 4]]],
                ],
            ]),
            'https://graph.instagram.com/v21.0/media-1/insights?*' => Http::response(['error' => ['message' => 'no permission']], 400),
            '*/insights?*' => Http::response(['data' => []]),
            'https://graph.instagram.com/v21.0/me/media?cursor=abc' => Http::response([
                'data' => [
                    [
                        'id' => 'media-3',
                        'caption' => 'Image',
                        'media_type' => 'IMAGE',
                        'permalink' => 'https://instagram.com/p/3',
                        'media_url' => 'https://image3.jpg',
                        'timestamp' => '2026-11-03T12:00:00+0000',
                        'like_count' => 5,
                        'comments_count' => 1,
                    ],
                ],
            ]),
            'https://graph.instagram.com/v21.0/me/media?*' => Http::response([
                'data' => [
                    [
                        'id' => 'media-1',
                        'caption' => 'First',
                        'media_type' => 'CAROUSEL_ALBUM',
                        'media_product_type' => 'FEED',
                        'permalink' => 'https://instagram.com/p/1',
                        'thumbnail_url' => 'https://thumb1.jpg',
                        'media_url' => 'https://media1.jpg',
                        'timestamp' => '2026-11-01T12:00:00+0000',
                        'like_count' => 10,
                        'comments_count' => 2,
                    ],
                    [
                        'id' => 'media-2',
                        'caption' => 'Reel',
                        'media_type' => 'VIDEO',
                        'media_product_type' => 'REELS',
                        'permalink' => 'https://instagram.com/reel/2',
                        'thumbnail_url' => 'https://thumb2.jpg',
                        'media_url' => 'https://video2.mp4',
                        'timestamp' => '2026-11-02T12:00:00+0000',
                        'like_count' => 20,
                        'comments_count' => 3,
                    ],
                ],
                'paging' => ['next' => 'https://graph.instagram.com/v21.0/me/media?cursor=abc'],
            ]),
            'https://graph.instagram.com/v21.0/me?*' => Http::response([
                'followers_count' => 1000,
                'follows_count' => 500,
                'media_count' => 35,
            ]),
        ]);

        $result = app(AccountStatsFetcher::class)->fetch($account);

        $this->assertSame(1000, $result['profile']['followers']);
        $this->assertSame(500, $result['profile']['following']);
        $this->assertSame(35, $result['profile']['posts_count']);
        $this->assertNull($result['profile']['total_likes']);
        $this->assertCount(3, $result['posts']);
        $this->assertSame('carousel', $result['posts'][0]['media_type']);
        $this->assertSame('reel', $result['posts'][1]['media_type']);
        $this->assertSame('image', $result['posts'][2]['media_type']);
        $this->assertNull($result['posts'][0]['views']);
        $this->assertSame(900, $result['posts'][1]['views']);
        $this->assertSame(7, $result['posts'][1]['shares']);
        $this->assertSame(4, $result['posts'][1]['saves']);
    }

    public function test_facebook_fetch_maps_followers_shares_and_types(): void
    {
        $account = $this->createWorkspaceAccount('facebook', 'page-1');

        Http::fake([
            'https://graph.facebook.com/v21.0/page-1_100/insights?*' => Http::response([
                'data' => [['name' => 'post_media_view', 'values' => [['value' => 321]]]],
            ]),
            'https://graph.facebook.com/v21.0/page-1/posts?*' => Http::response([
                'data' => [
                    [
                        'id' => 'page-1_100',
                        'message' => 'Album post',
                        'created_time' => '2026-11-01T12:00:00+0000',
                        'permalink_url' => 'https://facebook.com/page/posts/100',
                        'full_picture' => 'https://fbimg.jpg',
                        'attachments' => ['data' => [['media_type' => 'album']]],
                        'shares' => ['count' => 3],
                        'likes' => ['summary' => ['total_count' => 12]],
                        'comments' => ['summary' => ['total_count' => 4]],
                    ],
                    [
                        'id' => 'page-1_101',
                        'message' => 'Video post',
                        'created_time' => '2026-11-02T12:00:00+0000',
                        'permalink_url' => 'https://facebook.com/reel/123',
                        'full_picture' => 'https://fbimg2.jpg',
                        'attachments' => ['data' => [['media_type' => 'video']]],
                        'shares' => ['count' => 0],
                        'likes' => ['summary' => ['total_count' => 8]],
                        'comments' => ['summary' => ['total_count' => 2]],
                    ],
                ],
            ]),
            '*/insights?*' => Http::response(['data' => []]),
            'https://graph.facebook.com/v21.0/page-1?*' => Http::response([
                'followers_count' => 5000,
                'fan_count' => 4800,
            ]),
        ]);

        $result = app(AccountStatsFetcher::class)->fetch($account);

        $this->assertSame(5000, $result['profile']['followers']);
        $this->assertNull($result['profile']['following']);
        $this->assertNull($result['profile']['posts_count']);
        $this->assertCount(2, $result['posts']);
        $this->assertSame('carousel', $result['posts'][0]['media_type']);
        $this->assertSame('reel', $result['posts'][1]['media_type']);
        $this->assertSame(3, $result['posts'][0]['shares']);
        $this->assertSame(0, $result['posts'][1]['shares']);
        $this->assertSame(321, $result['posts'][0]['views']);
        $this->assertNull($result['posts'][1]['views']);
    }

    public function test_job_stores_one_snapshot_per_day_and_upserts_posts(): void
    {
        $account = $this->createWorkspaceAccount('instagram', 'ig-user-1');

        Http::fake([
            '*/insights?*' => Http::response(['data' => []]),
            'https://graph.instagram.com/v21.0/me?*' => Http::response([
                'followers_count' => 100,
                'follows_count' => 50,
                'media_count' => 1,
            ]),
            'https://graph.instagram.com/v21.0/me/media?*' => Http::response([
                'data' => [
                    [
                        'id' => 'media-1',
                        'media_type' => 'IMAGE',
                        'permalink' => 'https://instagram.com/p/1',
                        'media_url' => 'https://image1.jpg',
                        'timestamp' => '2026-11-01T12:00:00+0000',
                        'like_count' => 10,
                        'comments_count' => 2,
                    ],
                ],
            ]),
        ]);

        SyncAccountStats::dispatchSync($account);
        SyncAccountStats::dispatchSync($account);

        $this->assertDatabaseCount('account_snapshots', 1);
        $this->assertDatabaseCount('account_posts', 1);
        $this->assertDatabaseHas('account_posts', [
            'social_account_id' => $account->id,
            'platform_post_id' => 'media-1',
            'media_type' => 'image',
        ]);

        // A second sync with different data updates the same post, not duplicate.
        // Earlier fakes win over later ones, so start from a clean client.
        Http::swap(new HttpFactory);
        Http::preventStrayRequests();
        Http::fake([
            '*/insights?*' => Http::response(['data' => []]),
            'https://graph.instagram.com/v21.0/me?*' => Http::response([
                'followers_count' => 120,
                'follows_count' => 55,
                'media_count' => 2,
            ]),
            'https://graph.instagram.com/v21.0/me/media?*' => Http::response([
                'data' => [
                    [
                        'id' => 'media-1',
                        'media_type' => 'IMAGE',
                        'permalink' => 'https://instagram.com/p/1',
                        'media_url' => 'https://image1-updated.jpg',
                        'timestamp' => '2026-11-01T12:00:00+0000',
                        'like_count' => 15,
                        'comments_count' => 3,
                    ],
                ],
            ]),
        ]);

        SyncAccountStats::dispatchSync($account);

        $this->assertDatabaseCount('account_snapshots', 1);
        $this->assertDatabaseHas('account_snapshots', [
            'social_account_id' => $account->id,
            'snapshot_date' => today()->toDateString(),
            'followers' => 120,
        ]);
        $this->assertDatabaseCount('account_posts', 1);
        $this->assertDatabaseHas('account_posts', [
            'social_account_id' => $account->id,
            'platform_post_id' => 'media-1',
            'likes' => 15,
            'thumbnail_url' => 'https://image1-updated.jpg',
        ]);
    }

    public function test_job_swallows_http_error_and_stores_nothing(): void
    {
        $account = $this->createWorkspaceAccount('instagram', 'ig-user-1');

        Http::fake(['*' => Http::response(['error' => ['message' => 'nope']], 500)]);

        SyncAccountStats::dispatchSync($account);

        $this->assertDatabaseCount('account_snapshots', 0);
        $this->assertDatabaseCount('account_posts', 0);
    }

    public function test_analytics_index_returns_growth_with_gained_and_content_types(): void
    {
        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'instagram',
            'provider_id' => 'ig-user-1',
            'access_token' => 'token',
        ]);

        // Two snapshots inside the 30-day period to compute gained.
        AccountSnapshot::create([
            'social_account_id' => $account->id,
            'snapshot_date' => now()->subDays(5)->toDateString(),
            'followers' => 100,
            'following' => 50,
            'posts_count' => 10,
        ]);
        AccountSnapshot::create([
            'social_account_id' => $account->id,
            'snapshot_date' => now()->toDateString(),
            'followers' => 150,
            'following' => 55,
            'posts_count' => 12,
        ]);

        // One post of each media type for contentTypes.
        $types = ['image', 'carousel', 'video', 'reel'];
        foreach ($types as $i => $type) {
            AccountPost::create([
                'social_account_id' => $account->id,
                'platform_post_id' => "post-{$i}",
                'media_type' => $type,
                'caption' => 'Caption',
                'permalink' => 'https://instagram.com/p/'.$i,
                'thumbnail_url' => 'https://thumb'.$i.'.jpg',
                'posted_at' => now()->subDays(2),
                'views' => 1000,
                'likes' => 10,
                'comments' => 2,
                'shares' => 1,
                'saves' => 0,
                'last_synced_at' => now(),
            ]);
        }

        $response = $this->actingAs($user)->get('/analytics?period=30');

        $response->assertInertia(fn (Assert $page) => $page
            ->has('growth', 1)
            ->where('growth.0.gained', 50)
            ->where('growth.0.current_followers', 150)
            ->has('growth.0.series', 2)
            ->has('accountPosts.data', 4)
            ->where('accountPosts.total', 4)
            ->has('contentTypes', 4)
            // 10 likes + 2 comments + 1 share over 1000 views.
            ->where('accountPosts.data.0.engagement_rate', 1.3)
            ->where('accountPosts.data.0.engagement_rate_basis', 'views')
        );
    }

    public function test_account_posts_are_sorted_and_paginated_on_the_server(): void
    {
        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            // Not TikTok: the page would call TikTok's API for its panel.
            'provider' => 'facebook',
            'provider_id' => 'fb-1',
        ]);

        foreach (range(1, 30) as $i) {
            AccountPost::create([
                'social_account_id' => $account->id,
                'platform_post_id' => "p{$i}",
                'media_type' => 'video',
                'posted_at' => now()->subDays(1)->subMinutes($i),
                // Post 7 has no views: it must sort last even descending.
                'views' => $i === 7 ? null : $i * 100,
                'likes' => $i,
            ]);
        }

        $this->actingAs($user)->get('/analytics?period=30&ap_sort=views&ap_dir=desc')
            ->assertInertia(fn (Assert $page) => $page
                ->has('accountPosts.data', 25)
                ->where('accountPosts.total', 30)
                ->where('accountPosts.last_page', 2)
                ->where('accountPosts.sort', 'views')
                ->where('accountPosts.data.0.views', 3000));

        $this->get('/analytics?period=30&ap_sort=views&ap_dir=desc&ap_page=2')
            ->assertInertia(fn (Assert $page) => $page
                ->has('accountPosts.data', 5)
                ->where('accountPosts.data.4.views', null));

        // Unknown columns fall back to the newest first.
        $this->get('/analytics?period=30&ap_sort=password&ap_dir=asc')
            ->assertInertia(fn (Assert $page) => $page->where('accountPosts.sort', 'posted_at'));
    }
}
