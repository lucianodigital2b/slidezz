<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use InvalidArgumentException;

class SocialPublisherFactory
{
    public static function make(string $provider): SocialPublisher
    {
        switch ($provider) {
            case 'tiktok':
                return new TikTokPublisher();
            // case 'instagram':
            //     return new InstagramPublisher();
            // case 'youtube':
            //     return new YouTubePublisher();
            default:
                throw new InvalidArgumentException("Unsupported social provider: {$provider}");
        }
    }
}