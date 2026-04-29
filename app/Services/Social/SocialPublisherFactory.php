<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use InvalidArgumentException;

class SocialPublisherFactory
{
    public static function make(string $provider): SocialPublisher
    {
        return match ($provider) {
            'tiktok' => new TikTokPublisher,
            'instagram' => new InstagramPublisher,
            default => throw new InvalidArgumentException("Unsupported social provider: {$provider}"),
        };
    }
}
