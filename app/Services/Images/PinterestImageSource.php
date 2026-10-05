<?php

namespace App\Services\Images;

use App\Contracts\ImageSource;
use App\Exceptions\ImageSourceException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Pulls aesthetic photos from Pinterest search.
 *
 * Pinterest has no public search API, so this talks to the same JSON resource the
 * website itself calls. That endpoint rejects anonymous requests, so every search
 * first bootstraps a guest session (cookie jar + CSRF token) from the homepage and
 * reuses it for the rest of the hour.
 */
class PinterestImageSource implements ImageSource
{
    private const SESSION_CACHE_KEY = 'pinterest.guest_session';

    private const SEARCH_URL = 'https://www.pinterest.com/resource/BaseSearchResource/get/';

    /** Portrait photos only: TikTok slides are 9:16, a landscape pin crops to mush. */
    private const MIN_ASPECT_RATIO = 1.2;

    private const MIN_WIDTH = 700;

    /** Each page returns ~15-25 pins; four is plenty for a 10-slide deck. */
    private const MAX_PAGES = 4;

    public function name(): string
    {
        return 'pinterest';
    }

    /**
     * @param  list<string>  $excludeUrls
     * @return list<array{url: string, width: int, height: int, source_id: ?string}>
     */
    public function search(string $query, int $limit, array $excludeUrls = []): array
    {
        $session = $this->session();
        $excluded = array_flip($excludeUrls);
        $collected = [];
        $seen = [];
        $bookmark = '';

        for ($page = 0; $page < self::MAX_PAGES && count($collected) < $limit; $page++) {
            $payload = $this->fetchPage($query, $bookmark, $session);

            foreach ($payload['results'] as $pin) {
                $image = $this->usableImage($pin);

                if ($image === null) {
                    continue;
                }

                if (isset($excluded[$image['url']]) || isset($seen[$image['url']])) {
                    continue;
                }

                $seen[$image['url']] = true;
                $collected[] = $image;
            }

            $bookmark = $payload['bookmark'];

            if ($bookmark === '') {
                break;
            }
        }

        if ($collected === []) {
            throw new ImageSourceException("Pinterest returned no usable photos for \"{$query}\".");
        }

        // Two runs of the same automation share a keyword; shuffling keeps the top
        // pins from showing up in every single post.
        shuffle($collected);

        return array_slice($collected, 0, $limit);
    }

    /**
     * @param  array{cookie: string, csrf: string}  $session
     * @return array{results: array<int, array<string, mixed>>, bookmark: string}
     */
    private function fetchPage(string $query, string $bookmark, array $session): array
    {
        $data = json_encode([
            'options' => [
                'query' => $query,
                'scope' => 'pins',
                'bookmarks' => [$bookmark],
            ],
            'context' => (object) [],
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $sourceUrl = '/search/pins/?q='.rawurlencode($query);

        $response = Http::timeout(30)
            ->withHeaders([
                'User-Agent' => $this->userAgent(),
                'Accept' => 'application/json, text/javascript, */*, q=0.01',
                'Accept-Language' => 'en-US,en;q=0.9',
                'X-Requested-With' => 'XMLHttpRequest',
                'X-CSRFToken' => $session['csrf'],
                'X-Pinterest-PWS-Handler' => 'www/search/[scope].js',
                'Referer' => 'https://www.pinterest.com'.$sourceUrl,
                'Cookie' => $session['cookie'],
            ])
            ->get(self::SEARCH_URL, [
                'source_url' => $sourceUrl,
                'data' => $data,
            ]);

        if ($response->failed()) {
            // A blocked session is the common failure; drop it so the next attempt
            // bootstraps a fresh one instead of replaying a dead cookie for an hour.
            Cache::forget(self::SESSION_CACHE_KEY);

            throw new ImageSourceException("Pinterest search failed with HTTP {$response->status()}.");
        }

        return [
            'results' => $response->json('resource_response.data.results') ?? [],
            'bookmark' => (string) ($response->json('resource_response.bookmark') ?? ''),
        ];
    }

    /**
     * @param  array<string, mixed>  $pin
     * @return array{url: string, width: int, height: int, source_id: ?string}|null
     */
    private function usableImage(array $pin): ?array
    {
        if (($pin['type'] ?? null) !== 'pin') {
            return null;
        }

        $image = $pin['images']['orig'] ?? null;

        if (! is_array($image) || empty($image['url'])) {
            return null;
        }

        $width = (int) ($image['width'] ?? 0);
        $height = (int) ($image['height'] ?? 0);

        if ($width < self::MIN_WIDTH || $height <= 0) {
            return null;
        }

        if ($height / $width < self::MIN_ASPECT_RATIO) {
            return null;
        }

        return [
            'url' => (string) $image['url'],
            'width' => $width,
            'height' => $height,
            'source_id' => isset($pin['id']) ? (string) $pin['id'] : null,
        ];
    }

    /**
     * Guest cookies + CSRF token, cached just under Pinterest's own session window.
     *
     * @return array{cookie: string, csrf: string}
     */
    private function session(): array
    {
        return Cache::remember(self::SESSION_CACHE_KEY, now()->addMinutes(50), function (): array {
            $response = Http::timeout(20)
                ->withHeaders([
                    'User-Agent' => $this->userAgent(),
                    'Accept' => 'text/html,application/xhtml+xml',
                    'Accept-Language' => 'en-US,en;q=0.9',
                ])
                ->get('https://www.pinterest.com/');

            if ($response->failed()) {
                throw new ImageSourceException("Could not open a Pinterest session (HTTP {$response->status()}).");
            }

            $cookies = [];

            foreach ($response->headers()['Set-Cookie'] ?? [] as $header) {
                [$pair] = explode(';', $header, 2);
                [$name, $value] = array_pad(explode('=', trim($pair), 2), 2, '');

                if ($name !== '') {
                    $cookies[$name] = $value;
                }
            }

            if (! isset($cookies['csrftoken'])) {
                throw new ImageSourceException('Pinterest did not hand out a CSRF token.');
            }

            $cookieHeader = implode('; ', array_map(
                fn (string $name, string $value): string => "{$name}={$value}",
                array_keys($cookies),
                $cookies,
            ));

            return ['cookie' => $cookieHeader, 'csrf' => $cookies['csrftoken']];
        });
    }

    private function userAgent(): string
    {
        return config('services.pinterest.user_agent');
    }
}
