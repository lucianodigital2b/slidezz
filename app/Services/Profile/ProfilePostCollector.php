<?php

namespace App\Services\Profile;

use App\Models\PostAnalytic;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\Instagram\InstagramSdk;
use App\Services\Social\TikTokPublisher;
use App\Services\Ugc\VideoStatsFetcher;
use Illuminate\Support\Facades\Log;

class ProfilePostCollector
{
    /**
     * @param  list<string>  $links
     * @return list<array{platform: string, url: ?string, caption: ?string, views: int, likes: int, comments: int, shares: int, published_at: ?string, source: string}>
     */
    public function collect(Workspace $workspace, array $links): array
    {
        $posts = [];

        foreach (array_slice(array_filter(array_map('trim', $links)), 0, 10) as $url) {
            try {
                $fetched = app(VideoStatsFetcher::class)->fetch($url);

                if ($fetched['fetch_status'] === 'unknown') {
                    continue;
                }

                $posts[] = $this->fromFetcher($fetched, $url);
            } catch (\Throwable $e) {
                Log::warning('[ProfilePostCollector] Link fetch failed', [
                    'url' => $url,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        foreach ($this->tiktokAccounts($workspace) as $account) {
            try {
                foreach (app(TikTokPublisher::class)->recentVideos($account, 20) as $video) {
                    $posts[] = [
                        'platform' => 'tiktok',
                        'url' => $video['url'] ?? null,
                        'caption' => $video['title'] ?? null,
                        'views' => (int) ($video['views'] ?? 0),
                        'likes' => (int) ($video['likes'] ?? 0),
                        'comments' => (int) ($video['comments'] ?? 0),
                        'shares' => (int) ($video['shares'] ?? 0),
                        'published_at' => $video['posted_at'] ?? null,
                        'source' => 'tiktok_account',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('[ProfilePostCollector] TikTok account collection failed', [
                    'social_account_id' => $account->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        foreach ($this->instagramAccounts($workspace) as $account) {
            try {
                $media = app(InstagramSdk::class)->listMedia($account->access_token, (string) $account->provider_id, 25);

                foreach ($media as $item) {
                    $posts[] = [
                        'platform' => 'instagram',
                        'url' => $item['permalink'] ?? null,
                        'caption' => $item['caption'] ?? null,
                        'views' => 0,
                        'likes' => (int) ($item['like_count'] ?? 0),
                        'comments' => (int) ($item['comments_count'] ?? 0),
                        'shares' => 0,
                        'published_at' => $item['timestamp'] ?? null,
                        'source' => 'instagram_account',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('[ProfilePostCollector] Instagram account collection failed', [
                    'social_account_id' => $account->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        foreach ($this->slidezzPosts($workspace) as $post) {
            $posts[] = $post;
        }

        return array_slice($this->dedupe($posts), 0, 60);
    }

    /**
     * @return list<SocialAccount>
     */
    private function tiktokAccounts(Workspace $workspace): array
    {
        return SocialAccount::query()
            ->where('workspace_id', $workspace->id)
            ->where('provider', 'tiktok')
            ->where('needs_reconnect', false)
            ->get()
            ->all();
    }

    /**
     * @return list<SocialAccount>
     */
    private function instagramAccounts(Workspace $workspace): array
    {
        return SocialAccount::query()
            ->where('workspace_id', $workspace->id)
            ->where('provider', 'instagram')
            ->where('needs_reconnect', false)
            ->get()
            ->all();
    }

    /**
     * @return list<array{platform: string, url: ?string, caption: ?string, views: int, likes: int, comments: int, shares: int, published_at: ?string, source: string}>
     */
    private function slidezzPosts(Workspace $workspace): array
    {
        $analytics = PostAnalytic::query()
            ->with(['schedule.contentProject', 'schedule.socialAccount'])
            ->whereHas('schedule.contentProject', fn ($query) => $query->where('workspace_id', $workspace->id))
            ->latest('last_synced_at')
            ->limit(30)
            ->get();

        $posts = [];

        foreach ($analytics as $analytic) {
            $schedule = $analytic->schedule;
            $provider = $schedule->socialAccount?->provider;
            $handle = $schedule->socialAccount?->handle;
            $url = $this->slidezzUrl($provider, $handle, $schedule->platform_post_id);

            $posts[] = [
                'platform' => $provider ?? 'slidezz',
                'url' => $url,
                'caption' => $schedule->contentProject?->title ?? null,
                'views' => (int) $analytic->views,
                'likes' => (int) $analytic->likes,
                'comments' => (int) $analytic->comments,
                'shares' => (int) $analytic->shares,
                'published_at' => $schedule->published_at?->toISOString() ?? $analytic->last_synced_at?->toISOString(),
                'source' => 'slidezz',
            ];
        }

        return $posts;
    }

    /**
     * @param  array<string, mixed>  $fetched
     * @return array{platform: string, url: string, caption: ?string, views: int, likes: int, comments: int, shares: int, published_at: ?string, source: string}
     */
    private function fromFetcher(array $fetched, string $url): array
    {
        return [
            'platform' => $fetched['platform'],
            'url' => $url,
            'caption' => $fetched['platform'] === 'instagram' ? null : $fetched['caption'],
            'views' => (int) ($fetched['views'] ?? 0),
            'likes' => (int) ($fetched['likes'] ?? 0),
            'comments' => (int) ($fetched['comments'] ?? 0),
            'shares' => (int) ($fetched['shares'] ?? 0),
            'published_at' => $fetched['posted_at'] ?? null,
            'source' => 'link',
        ];
    }

    private function slidezzUrl(?string $provider, ?string $handle, ?string $platformPostId): ?string
    {
        if ($platformPostId === null || $platformPostId === '') {
            return null;
        }

        return match ($provider) {
            'tiktok' => $handle ? "https://www.tiktok.com/@{$handle}/video/{$platformPostId}" : null,
            'instagram' => "https://www.instagram.com/p/{$platformPostId}/",
            default => null,
        };
    }

    /**
     * @param  list<array<string, mixed>>  $posts
     * @return list<array<string, mixed>>
     */
    private function dedupe(array $posts): array
    {
        $seen = [];
        $unique = [];

        foreach ($posts as $post) {
            $key = $post['url'] ?? ($post['platform'].':'.$post['published_at'].':'.$post['caption']);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $unique[] = $post;
        }

        return $unique;
    }
}
