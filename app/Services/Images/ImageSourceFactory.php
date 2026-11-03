<?php

namespace App\Services\Images;

use App\Contracts\ImageSource;
use App\Models\User;
use App\Services\AI\CarouselGenerationService;
use InvalidArgumentException;

class ImageSourceFactory
{
    /**
     * @param  string|null  $byokApiKey  The user's Gemini key: unlimited AI images, no credits spent.
     * @param  User|null  $owner  Who pays for AI images with credits when there is no key.
     */
    public static function make(string $source, ?string $byokApiKey = null, ?User $owner = null): ImageSource
    {
        return match ($source) {
            'pinterest' => new PinterestImageSource,
            'ai' => new AiImageSource(app(CarouselGenerationService::class), $byokApiKey, $owner),
            default => throw new InvalidArgumentException("Unsupported image source: {$source}"),
        };
    }
}
