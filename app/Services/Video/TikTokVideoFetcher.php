<?php

namespace App\Services\Video;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class TikTokVideoFetcher
{
    public function isSupportedUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && str_ends_with(strtolower($host), 'tiktok.com');
    }

    /**
     * @return array{
     *     video_id: string,
     *     caption: string,
     *     views: int,
     *     likes: int,
     *     comments: int,
     *     shares: int,
     *     duration: float,
     *     play_url: string,
     *     author: array{handle: string, name: string, avatar: ?string, followers: null}
     * }
     */
    public function fetch(string $url): array
    {
        $response = Http::timeout(30)->asForm()->post('https://www.tikwm.com/api/', [
            'url' => $url,
            'hd' => 1,
        ]);

        $data = $response->json('data');

        if (! is_array($data) || $data === []) {
            throw new RuntimeException('Não foi possível ler esse vídeo do TikTok.');
        }

        $playUrl = $this->nonEmptyString($data['hdplay'] ?? null)
            ?? $this->nonEmptyString($data['play'] ?? null);

        if ($playUrl === null) {
            throw new RuntimeException('Esse vídeo não tem um arquivo de vídeo (é carrossel de fotos?).');
        }

        $author = is_array($data['author'] ?? null) ? $data['author'] : [];
        $avatar = isset($author['avatar']) && is_string($author['avatar']) && $author['avatar'] !== ''
            ? $author['avatar']
            : null;

        return [
            'video_id' => (string) ($data['id'] ?? ''),
            'caption' => isset($data['title']) && is_string($data['title']) ? $data['title'] : '',
            'views' => (int) ($data['play_count'] ?? 0),
            'likes' => (int) ($data['digg_count'] ?? 0),
            'comments' => (int) ($data['comment_count'] ?? 0),
            'shares' => (int) ($data['share_count'] ?? 0),
            'duration' => isset($data['duration']) ? (float) $data['duration'] : 0.0,
            'play_url' => $playUrl,
            'author' => [
                'handle' => trim((string) ($author['unique_id'] ?? '')),
                'name' => trim((string) ($author['nickname'] ?? '')),
                'avatar' => $avatar,
                'followers' => null,
            ],
        ];
    }

    public function followers(string $handle): ?int
    {
        usleep(1_100_000);

        try {
            $response = Http::timeout(20)->get('https://www.tikwm.com/api/user/info', [
                'unique_id' => $handle,
            ]);

            $data = $response->json();

            if (is_array($data) && isset($data['data']['stats']['followerCount'])) {
                return (int) $data['data']['stats']['followerCount'];
            }
        } catch (\Throwable $e) {
            Log::info('[Breakdown] Failed to fetch TikTok followers for '.$handle.': '.$e->getMessage());
        }

        return null;
    }

    public function download(string $remoteUrl, string $localPath): void
    {
        $response = Http::timeout(120)->withOptions(['sink' => $localPath])->get($remoteUrl);

        if ($response->failed() || ! is_file($localPath) || filesize($localPath) === 0) {
            throw new RuntimeException('Falha ao baixar o vídeo.');
        }
    }

    private function nonEmptyString(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }
}
