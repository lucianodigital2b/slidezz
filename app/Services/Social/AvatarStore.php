<?php

namespace App\Services\Social;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Re-hosts social profile pictures on the media disk.
 *
 * TikTok and Instagram hand out signed CDN URLs that expire after a few days,
 * so a saved URL eventually shows a broken image. We download the picture once
 * and keep our own copy.
 */
class AvatarStore
{
    /**
     * Download the avatar and return a permanent URL on the media disk. Falls
     * back to the original (expiring) URL if the download or upload fails.
     */
    public function store(?string $remoteUrl, string $provider, string $providerId): ?string
    {
        if (! $remoteUrl) {
            return null;
        }

        try {
            $response = Http::timeout(15)->get($remoteUrl);

            if ($response->failed()) {
                Log::warning('[Avatar] Download failed, keeping original URL', ['provider' => $provider, 'provider_id' => $providerId, 'status' => $response->status()]);

                return $remoteUrl;
            }

            $disk = Storage::disk(config('filesystems.media_disk'));
            $path = "{$provider}/avatars/".preg_replace('/[^A-Za-z0-9_-]/', '_', $providerId).'.jpg';

            $disk->put($path, $response->body(), 'public');

            // Cache-buster so a new picture shows up right away after re-linking.
            return $disk->url($path).'?v='.time();
        } catch (\Throwable $e) {
            Log::warning('[Avatar] Storage failed, keeping original URL', ['provider' => $provider, 'provider_id' => $providerId, 'message' => $e->getMessage()]);

            return $remoteUrl;
        }
    }

    /**
     * Whether the URL already points at our media disk (not an expiring CDN link).
     */
    public function isStored(?string $url): bool
    {
        if (! $url) {
            return false;
        }

        $base = Storage::disk(config('filesystems.media_disk'))->url('');

        return str_starts_with($url, rtrim($base, '/').'/');
    }
}
