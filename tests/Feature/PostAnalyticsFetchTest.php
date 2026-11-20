<?php

namespace Tests\Feature;

use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\FacebookPublisher;
use App\Services\Social\InstagramPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PostAnalyticsFetchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    private function publishedPost(string $provider, string $postId): void
    {
        $account = SocialAccount::factory()->create([
            'workspace_id' => Workspace::factory()->create()->id,
            'provider' => $provider,
            'provider_id' => '123456789',
            'access_token' => 'token',
        ]);

        Schedule::factory()->create([
            'social_account_id' => $account->id,
            'status' => 'published',
            'platform_post_id' => $postId,
        ]);
    }

    public function test_instagram_reads_views_shares_and_saves_from_insights(): void
    {
        $this->publishedPost('instagram', 'media-1');

        Http::fake([
            '*/media-1/insights*' => Http::response(['data' => [
                ['name' => 'views', 'values' => [['value' => 1200]]],
                ['name' => 'shares', 'values' => [['value' => 7]]],
                ['name' => 'saved', 'values' => [['value' => 30]]],
            ]]),
            '*/media-1?*' => Http::response(['like_count' => 80, 'comments_count' => 5]),
        ]);

        $stats = app(InstagramPublisher::class)->getAnalytics('media-1');

        $this->assertSame(['likes' => 80, 'comments' => 5, 'views' => 1200, 'shares' => 7, 'bookmarks' => 30], $stats);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/media-1/insights')
            && $request->data()['metric'] === 'views,shares,saved');
    }

    public function test_instagram_keeps_likes_and_comments_when_insights_fail(): void
    {
        $this->publishedPost('instagram', 'media-1');

        Http::fake([
            '*/media-1/insights*' => Http::response(['error' => ['message' => 'missing permission', 'code' => 10]], 400),
            '*/media-1?*' => Http::response(['like_count' => 80, 'comments_count' => 5]),
        ]);

        $this->assertSame(['likes' => 80, 'comments' => 5], app(InstagramPublisher::class)->getAnalytics('media-1'));
    }

    public function test_instagram_returns_nothing_when_the_post_cannot_be_read(): void
    {
        $this->publishedPost('instagram', 'media-1');

        Http::fake(['*' => Http::response(['error' => ['message' => 'gone', 'code' => 100]], 400)]);

        $this->assertSame([], app(InstagramPublisher::class)->getAnalytics('media-1'));
    }

    public function test_facebook_post_asks_for_shares(): void
    {
        $this->publishedPost('facebook', '123456789_555');

        Http::fake([
            '*/123456789_555/insights*' => Http::response(['data' => [['name' => 'post_media_view', 'values' => [['value' => 340]]]]]),
            '*/123456789_555*' => Http::response([
                'likes' => ['summary' => ['total_count' => 12]],
                'comments' => ['summary' => ['total_count' => 3]],
                'shares' => ['count' => 2],
            ]),
        ]);

        $this->assertSame(['likes' => 12, 'comments' => 3, 'shares' => 2, 'views' => 340], app(FacebookPublisher::class)->getAnalytics('123456789_555'));

        Http::assertSent(fn ($request) => str_contains($request->data()['fields'] ?? '', 'shares'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/insights') && $request->data()['metric'] === 'post_media_view');
    }

    public function test_facebook_video_does_not_ask_for_shares(): void
    {
        $this->publishedPost('facebook', '999');

        Http::fake([
            '*/999/video_insights*' => Http::response(['error' => ['message' => 'missing read_insights', 'code' => 10]], 403),
            '*/999*' => Http::response([
                'likes' => ['summary' => ['total_count' => 4]],
                'comments' => ['summary' => ['total_count' => 1]],
            ]),
        ]);

        $this->assertSame(['likes' => 4, 'comments' => 1, 'shares' => 0], app(FacebookPublisher::class)->getAnalytics('999'));

        Http::assertSent(fn ($request) => ! str_contains($request->data()['fields'] ?? '', 'shares'));
    }

    public function test_facebook_returns_nothing_on_error(): void
    {
        $this->publishedPost('facebook', '999');

        Http::fake(['*' => Http::response(['error' => ['message' => 'nope', 'code' => 100]], 400)]);

        $this->assertSame([], app(FacebookPublisher::class)->getAnalytics('999'));
    }
}
