<?php

namespace App\Services\Images;

use App\Contracts\ImageSource;
use App\Exceptions\ImageSourceException;
use App\Services\AI\CarouselGenerationService;

/**
 * Generates slide backgrounds with Gemini instead of sourcing real photos.
 *
 * Used when a workspace wants imagery no stock or Pinterest search can produce
 * (a specific person, product, or scene). Images come back as data URIs, which the
 * renderer consumes directly — nothing is persisted, so failed runs leave no orphans.
 */
class AiImageSource implements ImageSource
{
    /**
     * @param  string|null  $byokApiKey  The user's own Gemini key; image generation is BYOK-only.
     */
    public function __construct(
        private readonly CarouselGenerationService $carousel,
        private readonly ?string $byokApiKey = null,
    ) {}

    public function name(): string
    {
        return 'ai';
    }

    /**
     * The query is a scene description, so each call produces exactly one image and
     * `$excludeUrls` is irrelevant — a fresh generation is never a repeat.
     *
     * Calls Gemini directly rather than going through
     * {@see CarouselGenerationService::generateImage()}: that entry point silently
     * substitutes an Unsplash stock photo when generation fails, which would put a
     * random picture in a carousel the user asked to be AI-generated. Here a failure
     * is a failure, and the run is marked as such.
     *
     * @param  list<string>  $excludeUrls
     * @return list<array{url: string, width: int, height: int, source_id: ?string}>
     */
    public function search(string $query, int $limit, array $excludeUrls = []): array
    {
        $images = [];

        for ($i = 0; $i < $limit; $i++) {
            try {
                $dataUri = $this->carousel->generateImageWithGemini($query, '9:16', $this->byokApiKey);
            } catch (\Throwable $e) {
                throw new ImageSourceException("Image generation failed: {$e->getMessage()}", previous: $e);
            }

            $images[] = [
                'url' => $dataUri,
                ...$this->dimensions($dataUri),
                'source_id' => null,
            ];
        }

        return $images;
    }

    /**
     * @return array{width: int, height: int}
     */
    private function dimensions(string $dataUri): array
    {
        $binary = base64_decode(substr($dataUri, (int) strpos($dataUri, ',') + 1), true);
        $size = $binary === false ? false : @getimagesizefromstring($binary);

        return [
            'width' => (int) ($size[0] ?? 0),
            'height' => (int) ($size[1] ?? 0),
        ];
    }
}
