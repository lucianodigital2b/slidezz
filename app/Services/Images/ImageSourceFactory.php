<?php

namespace App\Services\Images;

use App\Contracts\ImageSource;
use App\Services\AI\CarouselGenerationService;
use InvalidArgumentException;

class ImageSourceFactory
{
    /**
     * @param  string|null  $byokApiKey  The user's Gemini key, required by the 'ai' source.
     */
    public static function make(string $source, ?string $byokApiKey = null): ImageSource
    {
        return match ($source) {
            'pinterest' => new PinterestImageSource,
            'ai' => new AiImageSource(app(CarouselGenerationService::class), $byokApiKey),
            default => throw new InvalidArgumentException("Unsupported image source: {$source}"),
        };
    }
}
