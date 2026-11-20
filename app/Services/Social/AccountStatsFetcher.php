<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;

class AccountStatsFetcher
{
    private const MAX_PAGES = 4;

    private const PER_PAGE = 50;

    public function __construct(private readonly TikTokPublisher $tiktokPublisher) {}

    /**
     * Fetch normalized account profile and recent posts for Phase 1 analytics.
     *
     * @return array{profile: array{followers:?int, following:?int, posts_count:?int, total_likes:?int}, posts: list<array{platform_post_id:string, media_type:string, caption:?string, permalink:?string, thumbnail_url:?string, posted_at:?string, views:?int, likes:?int, comments:?int, shares:?int, saves:?int}>}
     */
    public function fetch(SocialAccount $account): array
    {
        return match ($account->provider) {
            'instagram' => $this->fetchInstagram($account),
            'facebook' => $this->fetchFacebook($account),
            'tiktok' => $this->fetchTikTok($account),
            default => throw new \InvalidArgumentException("Unsupported provider: {$account->provider}"),
        };
    }

    private function fetchInstagram(SocialAccount $account): array
    {
        $base = 'https://graph.instagram.com/v21.0';

        $profile = Http::withToken($account->access_token)
            ->acceptJson()
            ->get("{$base}/me", [
                'fields' => 'followers_count,follows_count,media_count',
            ])
            ->throw()
            ->json();

        $posts = $this->fetchInstagramPosts($account, $base);

        return [
            'profile' => [
                'followers' => isset($profile['followers_count']) ? (int) $profile['followers_count'] : null,
                'following' => isset($profile['follows_count']) ? (int) $profile['follows_count'] : null,
                'posts_count' => isset($profile['media_count']) ? (int) $profile['media_count'] : null,
                'total_likes' => null,
            ],
            'posts' => $posts,
        ];
    }

    /**
     * Instagram media paging returns a full URL for `next`, so the second
     * page hits that URL directly.
     *
     * @return list<array<string, mixed>>
     */
    private function fetchInstagramPosts(SocialAccount $account, string $base): array
    {
        $items = [];
        $url = "{$base}/me/media";

        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            $query = [
                'fields' => 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
                'limit' => self::PER_PAGE,
            ];

            if ($page > 0 && isset($nextUrl)) {
                $response = Http::withToken($account->access_token)
                    ->acceptJson()
                    ->get($nextUrl)
                    ->throw()
                    ->json();
            } else {
                $response = Http::withToken($account->access_token)
                    ->acceptJson()
                    ->get($url, $query)
                    ->throw()
                    ->json();
            }

            $data = $response['data'] ?? [];
            $items = array_merge($items, $data);

            $nextUrl = $response['paging']['next'] ?? null;
            if (! $nextUrl) {
                break;
            }
        }

        return array_map(function (array $media): array {
            $mediaType = (string) ($media['media_type'] ?? '');
            $productType = (string) ($media['media_product_type'] ?? '');

            $normalizedType = match (true) {
                $mediaType === 'CAROUSEL_ALBUM' => 'carousel',
                $mediaType === 'VIDEO' && $productType === 'REELS' => 'reel',
                $mediaType === 'VIDEO' => 'video',
                $mediaType === 'IMAGE' => 'image',
                default => 'image',
            };

            return [
                'platform_post_id' => (string) $media['id'],
                'media_type' => $normalizedType,
                'caption' => $media['caption'] ?? null,
                'permalink' => $media['permalink'] ?? null,
                'thumbnail_url' => $media['thumbnail_url'] ?? $media['media_url'] ?? null,
                'posted_at' => $media['timestamp'] ?? null,
                'views' => null,
                'likes' => isset($media['like_count']) ? (int) $media['like_count'] : null,
                'comments' => isset($media['comments_count']) ? (int) $media['comments_count'] : null,
                'shares' => null,
                'saves' => null,
            ];
        }, $items);
    }

    private function fetchFacebook(SocialAccount $account): array
    {
        $base = 'https://graph.facebook.com/v21.0';
        $pageId = $account->provider_id;

        $profile = Http::withToken($account->access_token)
            ->acceptJson()
            ->get("{$base}/{$pageId}", [
                'fields' => 'followers_count,fan_count',
            ])
            ->throw()
            ->json();

        $posts = $this->fetchFacebookPosts($account, $base, $pageId);

        return [
            'profile' => [
                'followers' => isset($profile['followers_count'])
                    ? (int) $profile['followers_count']
                    : (isset($profile['fan_count']) ? (int) $profile['fan_count'] : null),
                'following' => null,
                'posts_count' => null,
                'total_likes' => null,
            ],
            'posts' => $posts,
        ];
    }

    /**
     * Facebook post paging works the same way as Instagram: the API provides a
     * full `next` URL.
     *
     * @return list<array<string, mixed>>
     */
    private function fetchFacebookPosts(SocialAccount $account, string $base, string $pageId): array
    {
        $items = [];
        $url = "{$base}/{$pageId}/posts";

        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            $query = [
                'fields' => 'id,message,created_time,permalink_url,full_picture,attachments{media_type},shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
                'limit' => self::PER_PAGE,
            ];

            if ($page > 0 && isset($nextUrl)) {
                $response = Http::withToken($account->access_token)
                    ->acceptJson()
                    ->get($nextUrl)
                    ->throw()
                    ->json();
            } else {
                $response = Http::withToken($account->access_token)
                    ->acceptJson()
                    ->get($url, $query)
                    ->throw()
                    ->json();
            }

            $data = $response['data'] ?? [];
            $items = array_merge($items, $data);

            $nextUrl = $response['paging']['next'] ?? null;
            if (! $nextUrl) {
                break;
            }
        }

        return array_map(function (array $post): array {
            $attachments = $post['attachments']['data'][0] ?? null;
            $mediaType = (string) ($attachments['media_type'] ?? '');

            $normalizedType = match (true) {
                $mediaType === 'album' => 'carousel',
                $mediaType === 'video' && str_contains((string) ($post['permalink_url'] ?? ''), '/reel/') => 'reel',
                $mediaType === 'video' => 'video',
                default => 'image',
            };

            $shares = 0;
            if (isset($post['shares'])) {
                if (is_array($post['shares']) && isset($post['shares']['count'])) {
                    $shares = (int) $post['shares']['count'];
                } elseif (is_numeric($post['shares'])) {
                    $shares = (int) $post['shares'];
                }
            }

            return [
                'platform_post_id' => (string) $post['id'],
                'media_type' => $normalizedType,
                'caption' => $post['message'] ?? null,
                'permalink' => $post['permalink_url'] ?? null,
                'thumbnail_url' => $post['full_picture'] ?? null,
                'posted_at' => $post['created_time'] ?? null,
                'views' => null,
                'likes' => isset($post['likes']['summary']['total_count']) ? (int) $post['likes']['summary']['total_count'] : null,
                'comments' => isset($post['comments']['summary']['total_count']) ? (int) $post['comments']['summary']['total_count'] : null,
                'shares' => $shares,
                'saves' => null,
            ];
        }, $items);
    }

    private function fetchTikTok(SocialAccount $account): array
    {
        // Reuses TikTokPublisher's existing account insights (profile + latest
        // videos) so token refresh and error mapping stay in one place.
        $insights = $this->tiktokPublisher->accountInsights($account);

        return [
            'profile' => [
                'followers' => (int) $insights['followers'],
                'following' => (int) $insights['following'],
                'posts_count' => (int) $insights['videos'],
                'total_likes' => (int) $insights['likes'],
            ],
            'posts' => collect($insights['recent'])->map(fn (array $video): array => [
                'platform_post_id' => (string) $video['id'],
                'media_type' => 'video',
                'caption' => $video['title'] ?: null,
                'permalink' => $video['url'] ?? null,
                'thumbnail_url' => $video['cover'] ?? null,
                'posted_at' => $video['posted_at'],
                'views' => (int) $video['views'],
                'likes' => (int) $video['likes'],
                'comments' => (int) $video['comments'],
                'shares' => (int) $video['shares'],
                'saves' => null,
            ])->values()->all(),
        ];
    }
}
