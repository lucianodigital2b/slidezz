<?php

namespace App\Services\Ugc;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pulls public metrics for a UGC video from its link, no creator login needed.
 *
 * TikTok goes through tikwm (the same source the agent uses to pull a post), which
 * returns full stats. Instagram has no open metrics endpoint, so Reels come back
 * flagged `manual`: we grab whatever metadata the public page exposes (thumbnail,
 * author, caption) and the view count is typed in by hand.
 */
class VideoStatsFetcher
{
    /**
     * @return array{
     *   platform: string, external_id: ?string, thumbnail_url: ?string, caption: ?string,
     *   author_handle: ?string, posted_at: ?string, fetch_status: string,
     *   views: int, likes: int, comments: int, shares: int, bookmarks: int
     * }
     */
    public function fetch(string $url): array
    {
        $url = trim($url);

        return match ($this->platform($url)) {
            'tiktok' => $this->fetchTikTok($url),
            'instagram' => $this->fetchInstagram($url),
            default => $this->blank('unknown', 'error'),
        };
    }

    public function platform(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if (str_contains($host, 'tiktok')) {
            return 'tiktok';
        }

        if (str_contains($host, 'instagram') || str_contains($host, 'instagr.am')) {
            return 'instagram';
        }

        return 'unknown';
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchTikTok(string $url): array
    {
        try {
            $response = Http::timeout(30)->asForm()->post('https://www.tikwm.com/api/', [
                'url' => $url,
                'hd' => 1,
            ]);

            $data = $response->json('data');

            if (! is_array($data) || ($data === [])) {
                return $this->blank('tiktok', 'error');
            }

            return [
                'platform' => 'tiktok',
                'external_id' => isset($data['id']) ? (string) $data['id'] : null,
                'thumbnail_url' => $data['cover'] ?? $data['origin_cover'] ?? null,
                'caption' => $data['title'] ?? null,
                'author_handle' => $data['author']['unique_id'] ?? ($data['author']['id'] ?? null),
                'posted_at' => isset($data['create_time'])
                    ? now()->setTimestamp((int) $data['create_time'])->toISOString()
                    : null,
                'fetch_status' => 'ok',
                'views' => (int) ($data['play_count'] ?? 0),
                'likes' => (int) ($data['digg_count'] ?? 0),
                'comments' => (int) ($data['comment_count'] ?? 0),
                'shares' => (int) ($data['share_count'] ?? 0),
                'bookmarks' => (int) ($data['collect_count'] ?? 0),
            ];
        } catch (\Throwable $e) {
            Log::warning("UGC TikTok fetch failed for {$url}: {$e->getMessage()}");

            return $this->blank('tiktok', 'error');
        }
    }

    /**
     * Instagram exposes no public metrics API. We fetch the og: tags from the
     * public page for a thumbnail, author and caption, and leave the counts at 0
     * flagged `manual` for the user to fill in. Scraped-page shape changes often,
     * so every miss just degrades to a bare manual row rather than failing.
     *
     * @return array<string, mixed>
     */
    private function fetchInstagram(string $url): array
    {
        $result = $this->blank('instagram', 'manual');
        $result['external_id'] = $this->instagramShortcode($url);

        try {
            $html = Http::timeout(20)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept-Language' => 'en-US,en;q=0.9',
                ])
                ->get($url)
                ->body();

            if (preg_match('/<meta property="og:image" content="([^"]+)"/', $html, $m)) {
                $result['thumbnail_url'] = html_entity_decode($m[1]);
            }

            if (preg_match('/<meta property="og:title" content="([^"]+)"/', $html, $m)) {
                $title = html_entity_decode($m[1]);
                // "Creator Name on Instagram: \"caption...\"" — split handle from caption.
                if (preg_match('/^(.*?) on Instagram/u', $title, $mm)) {
                    $result['author_handle'] = trim($mm[1]);
                }
                $result['caption'] = $title;
            }
        } catch (\Throwable $e) {
            Log::info("UGC Instagram page fetch failed for {$url}: {$e->getMessage()}");
        }

        return $result;
    }

    private function instagramShortcode(string $url): ?string
    {
        return preg_match('#instagram\.com/(?:reel|reels|p|tv)/([^/?#]+)#', $url, $m) ? $m[1] : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function blank(string $platform, string $status): array
    {
        return [
            'platform' => $platform,
            'external_id' => null,
            'thumbnail_url' => null,
            'caption' => null,
            'author_handle' => null,
            'posted_at' => null,
            'fetch_status' => $status,
            'views' => 0,
            'likes' => 0,
            'comments' => 0,
            'shares' => 0,
            'bookmarks' => 0,
        ];
    }
}
