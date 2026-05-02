<?php

namespace App\Services\Social\Instagram;

use Illuminate\Support\Facades\Http;

class InstagramSdk
{
    private string $apiVersion;

    private string $baseUrl;

    public function __construct(string $apiVersion = 'v21.0', string $baseUrl = 'https://graph.instagram.com')
    {
        $this->apiVersion = $apiVersion;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function createImageContainer(string $accessToken, string $igUserId, string $imageUrl, string $caption = '', ?string $altText = null): string
    {
        $payload = [
            'image_url' => $imageUrl,
        ];

        if ($caption !== '') {
            $payload['caption'] = $caption;
        }

        if ($altText !== null && $altText !== '') {
            $payload['alt_text'] = $altText;
        }

        $response = $this->post($accessToken, "/{$igUserId}/media", $payload);

        return $this->extractId($response, 'image container');
    }

    public function createVideoContainer(string $accessToken, string $igUserId, string $videoUrl, string $caption = '', string $mediaType = 'REELS'): string
    {
        $payload = [
            'video_url' => $videoUrl,
            'media_type' => $mediaType,
        ];

        if ($caption !== '') {
            $payload['caption'] = $caption;
        }

        $response = $this->post($accessToken, "/{$igUserId}/media", $payload);

        return $this->extractId($response, 'video container');
    }

    public function createCarouselItemImageContainer(string $accessToken, string $igUserId, string $imageUrl): string
    {
        $response = $this->post($accessToken, "/{$igUserId}/media", [
            'image_url' => $imageUrl,
            'is_carousel_item' => true,
        ]);

        return $this->extractId($response, 'carousel child container');
    }

    public function createCarouselContainer(string $accessToken, string $igUserId, array $childContainerIds, string $caption = ''): string
    {
        $payload = [
            'media_type' => 'CAROUSEL',
            'children' => implode(',', $childContainerIds),
        ];

        if ($caption !== '') {
            $payload['caption'] = $caption;
        }

        $response = $this->post($accessToken, "/{$igUserId}/media", $payload);

        return $this->extractId($response, 'carousel container');
    }

    public function getContainerStatus(string $accessToken, string $containerId): string
    {
        $response = $this->get($accessToken, "/{$containerId}", [
            'fields' => 'status_code',
        ]);

        return (string) ($response['status_code'] ?? '');
    }

    public function publishContainer(string $accessToken, string $igUserId, string $containerId): string
    {
        $response = $this->post($accessToken, "/{$igUserId}/media_publish", [
            'creation_id' => $containerId,
        ]);

        return $this->extractId($response, 'published post');
    }

    public function getMediaInsights(string $accessToken, string $mediaId, string $metricsCsv): array
    {
        return $this->get($accessToken, "/{$mediaId}/insights", [
            'metric' => $metricsCsv,
        ]);
    }

    public function getMedia(string $accessToken, string $mediaId, string $fieldsCsv): array
    {
        return $this->get($accessToken, "/{$mediaId}", [
            'fields' => $fieldsCsv,
        ]);
    }

    private function get(string $accessToken, string $path, array $query = []): array
    {
        return Http::withToken($accessToken)
            ->acceptJson()
            ->get($this->url($path), $query)
            ->throw()
            ->json();
    }

    private function post(string $accessToken, string $path, array $payload = []): array
    {
        return Http::withToken($accessToken)
            ->acceptJson()
            ->asJson()
            ->post($this->url($path), $payload)
            ->throw()
            ->json();
    }

    private function url(string $path): string
    {
        $path = '/'.ltrim($path, '/');

        return "{$this->baseUrl}/{$this->apiVersion}{$path}";
    }

    private function extractId(array $response, string $context): string
    {
        if (isset($response['error'])) {
            throw new \RuntimeException(
                "Instagram API error creating {$context}: ".($response['error']['message'] ?? json_encode($response['error']))
            );
        }

        $id = $response['id'] ?? null;

        if (! $id) {
            throw new \RuntimeException("Instagram API did not return an ID for {$context}. Response: ".json_encode($response));
        }

        return (string) $id;
    }
}
