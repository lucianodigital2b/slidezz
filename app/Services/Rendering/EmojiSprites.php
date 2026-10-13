<?php

namespace App\Services\Rendering;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Supplies colour emoji bitmaps for the GD-based {@see SlideshowRenderer}.
 *
 * GD renders a TTF in a single colour, so emoji drawn from TikTok Sans come out as
 * tofu boxes. Every emoji cluster is instead composited from a Twemoji PNG, cached
 * on the local disk after the first download.
 */
class EmojiSprites
{
    private const CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/';

    private const CACHE_DIR = 'twemoji';

    /**
     * Matches one emoji "cluster": a flag (two regional indicators), or a pictograph
     * with its optional variation selector, skin-tone modifier and ZWJ continuations.
     */
    public const CLUSTER_PATTERN = '/\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\x{FE0F}|\x{FE0E})?(?:[\x{1F3FB}-\x{1F3FF}])?(?:\x{200D}\p{Extended_Pictographic}(?:\x{FE0F})?(?:[\x{1F3FB}-\x{1F3FF}])?)*|[0-9#*]\x{FE0F}?\x{20E3}/u';

    /**
     * PNG bytes for an emoji cluster, or null when Twemoji has no asset for it.
     */
    public function png(string $cluster): ?string
    {
        $name = $this->assetName($cluster);

        if ($name === '') {
            return null;
        }

        $path = self::CACHE_DIR."/{$name}.png";
        $disk = Storage::disk('local');

        if ($disk->exists($path)) {
            return $disk->get($path);
        }

        try {
            $response = Http::timeout(15)->get(self::CDN."{$name}.png");
        } catch (\Throwable $e) {
            Log::warning('[Slideshow] Twemoji download failed', ['emoji' => $name, 'message' => $e->getMessage()]);

            return null;
        }

        if ($response->failed()) {
            Log::warning('[Slideshow] Twemoji asset missing', ['emoji' => $name, 'status' => $response->status()]);

            return null;
        }

        $disk->put($path, $response->body());

        return $response->body();
    }

    /**
     * Twemoji filenames are dash-joined lowercase codepoints. U+FE0F is dropped
     * unless the cluster is a ZWJ sequence, matching Twemoji's own naming rule.
     */
    public function assetName(string $cluster): string
    {
        $hasZwj = str_contains($cluster, "\u{200D}");
        $codepoints = [];

        foreach (preg_split('//u', $cluster, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $char) {
            $code = mb_ord($char, 'UTF-8');

            if ($code === false) {
                continue;
            }

            if ($code === 0xFE0F && ! $hasZwj) {
                continue;
            }

            $codepoints[] = dechex($code);
        }

        return implode('-', $codepoints);
    }
}
