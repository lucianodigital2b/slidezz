<?php

namespace App\Services\AI;

use App\Services\Video\GroqTranscriber;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ReferenceVideoReader
{
    /**
     * @return array{
     *   caption: ?string,
     *   transcript: ?string,
     *   views: int,
     *   likes: int,
     *   comments: int,
     *   shares: int,
     *   bookmarks: int,
     *   duration: ?float,
     *   play_url: ?string
     * }
     */
    public function read(string $url): array
    {
        if (! $this->isTikTokUrl($url)) {
            throw new RuntimeException('Por enquanto só leio vídeo de referência do TikTok.');
        }

        return $this->fetchTikTok($url);
    }

    /**
     * @return array{
     *   caption: ?string,
     *   transcript: ?string,
     *   views: int,
     *   likes: int,
     *   comments: int,
     *   shares: int,
     *   bookmarks: int,
     *   duration: ?float,
     *   play_url: ?string
     * }
     */
    private function fetchTikTok(string $url): array
    {
        $response = Http::timeout(30)->asForm()->post('https://www.tikwm.com/api/', [
            'url' => $url,
            'hd' => 1,
        ]);

        $data = $response->json('data');

        if (! is_array($data) || $data === []) {
            throw new RuntimeException('Não foi possível ler o vídeo de referência.');
        }

        $playUrl = isset($data['play']) && is_string($data['play']) ? $data['play'] : null;
        $transcript = null;

        if ($playUrl && app(GroqTranscriber::class)->isConfigured()) {
            $transcript = $this->transcribe($playUrl);
        }

        return [
            'caption' => isset($data['title']) && is_string($data['title']) ? $data['title'] : null,
            'transcript' => $transcript,
            'views' => (int) ($data['play_count'] ?? 0),
            'likes' => (int) ($data['digg_count'] ?? 0),
            'comments' => (int) ($data['comment_count'] ?? 0),
            'shares' => (int) ($data['share_count'] ?? 0),
            'bookmarks' => (int) ($data['collect_count'] ?? 0),
            'duration' => isset($data['duration']) ? (float) $data['duration'] : null,
            'play_url' => $playUrl,
        ];
    }

    private function transcribe(string $playUrl): ?string
    {
        $tempVideo = tempnam(sys_get_temp_dir(), 'slidezz-ref-');

        if ($tempVideo === false) {
            return null;
        }

        $tempVideo .= '.mp4';

        try {
            Http::timeout(60)->withOptions(['sink' => $tempVideo])->get($playUrl);

            if (! is_file($tempVideo) || filesize($tempVideo) === 0) {
                return null;
            }

            $result = app(GroqTranscriber::class)->transcribe($tempVideo);

            return is_string($result['text'] ?? null) ? $result['text'] : null;
        } catch (\Throwable $e) {
            Log::info('Reference video transcription failed: '.$e->getMessage());

            return null;
        } finally {
            if (file_exists($tempVideo)) {
                unlink($tempVideo);
            }
        }
    }

    private function isTikTokUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && str_ends_with(strtolower($host), 'tiktok.com');
    }
}
