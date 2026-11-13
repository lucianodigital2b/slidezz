<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Profile\ProfilePostCollector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProfilePostCollectorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_it_collects_pasted_tiktok_and_instagram_links(): void
    {
        $workspace = Workspace::factory()->create(['owner_id' => User::factory()]);

        Http::fake([
            'www.tikwm.com/*' => Http::response([
                'data' => [
                    'id' => '123',
                    'title' => 'TikTok caption',
                    'cover' => 'https://example.com/cover.jpg',
                    'create_time' => now()->timestamp,
                    'play_count' => 1000,
                    'digg_count' => 100,
                    'comment_count' => 20,
                    'share_count' => 5,
                    'collect_count' => 1,
                    'author' => ['unique_id' => 'creator'],
                ],
            ], 200),
            'www.instagram.com/*' => Http::response('<html><meta property="og:title" content="Creator on Instagram: &quot;Instagram caption&quot;"><meta property="og:image" content="https://example.com/ig.jpg"></html>', 200),
        ]);

        $links = [
            'https://www.tiktok.com/@creator/video/123',
            'https://www.instagram.com/p/abc/',
        ];

        $posts = app(ProfilePostCollector::class)->collect($workspace, $links);

        $this->assertCount(2, $posts);
        $this->assertSame('link', $posts[0]['source']);
        $this->assertSame('TikTok caption', $posts[0]['caption']);
        $this->assertSame(1000, $posts[0]['views']);

        $this->assertSame('link', $posts[1]['source']);
        $this->assertNull($posts[1]['caption']);
        $this->assertSame(0, $posts[1]['views']);
        $this->assertSame(0, $posts[1]['likes']);
    }

    public function test_it_collects_connected_tiktok_and_instagram_accounts(): void
    {
        $workspace = Workspace::factory()->create(['owner_id' => User::factory()]);

        SocialAccount::create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'provider_id' => 'tiktok-id',
            'handle' => 'tiktok_user',
            'access_token' => 'tiktok-token',
            'refresh_token' => 'tiktok-refresh',
            'expires_at' => now()->addDay(),
        ]);

        SocialAccount::create([
            'workspace_id' => $workspace->id,
            'provider' => 'instagram',
            'provider_id' => 'ig-id',
            'handle' => 'ig_user',
            'access_token' => 'ig-token',
            'refresh_token' => 'ig-token',
            'expires_at' => now()->addDay(),
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'data' => [
                    'videos' => [
                        [
                            'id' => 'v1',
                            'video_description' => 'TikTok video',
                            'share_url' => 'https://www.tiktok.com/@tiktok_user/video/v1',
                            'create_time' => now()->timestamp,
                            'view_count' => 10,
                            'like_count' => 2,
                            'comment_count' => 3,
                            'share_count' => 4,
                            'cover_image_url' => null,
                        ],
                    ],
                ],
                'error' => ['code' => 'ok'],
            ], 200),
            'graph.instagram.com/*' => Http::response([
                'data' => [
                    [
                        'id' => 'ig1',
                        'caption' => 'IG caption',
                        'media_type' => 'IMAGE',
                        'permalink' => 'https://www.instagram.com/p/abc/',
                        'timestamp' => now()->toISOString(),
                        'like_count' => 7,
                        'comments_count' => 8,
                    ],
                ],
            ], 200),
        ]);

        $posts = app(ProfilePostCollector::class)->collect($workspace, []);

        $this->assertCount(2, $posts);

        $tiktok = collect($posts)->first(fn ($post) => $post['source'] === 'tiktok_account');
        $instagram = collect($posts)->first(fn ($post) => $post['source'] === 'instagram_account');

        $this->assertNotNull($tiktok);
        $this->assertSame('TikTok video', $tiktok['caption']);
        $this->assertSame(10, $tiktok['views']);
        $this->assertSame('https://www.tiktok.com/@tiktok_user/video/v1', $tiktok['url']);

        $this->assertNotNull($instagram);
        $this->assertSame('IG caption', $instagram['caption']);
        $this->assertSame(0, $instagram['views']);
        $this->assertSame(7, $instagram['likes']);
    }
}
