<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'instagram' => [
        'client_id' => env('INSTAGRAM_CLIENT_ID'),
        'client_secret' => env('INSTAGRAM_CLIENT_SECRET'),
        'redirect' => env('INSTAGRAM_REDIRECT_URI', '/social-accounts/instagram/callback'),
        // Comma-separated user IDs allowed to see/use the Instagram integration
        // while it is gated for Meta App Review (empty = nobody).
        'feature_user_ids' => env('INSTAGRAM_FEATURE_USER_IDS', ''),
    ],

    'tiktok' => [
        'client_id' => env('TIKTOK_CLIENT_ID'),
        'client_secret' => env('TIKTOK_CLIENT_SECRET'),
        'redirect' => env('TIKTOK_REDIRECT_URI', '/tiktok/callback'),
        'webhook_secret' => env('TIKTOK_WEBHOOK_SECRET'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    'unsplash' => [
        'access_key' => env('UNSPLASH_ACCESS_KEY'),
    ],

    'carousel_image' => [
        // Image generation driver: 'gemini' (gemini-2.5-flash-image, cinematic
        // subject-accurate), 'openai' (gpt-image-1, paid), or 'unsplash' (free stock search).
        'driver' => env('CAROUSEL_IMAGE_DRIVER', 'gemini'),
    ],

    'deepseek' => [
        'api_key' => env('DEEPSEEK_API_KEY'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

    'elevenlabs' => [
        'api_key' => env('ELEVENLABS_API_KEY'),
        'voice_id' => env('ELEVENLABS_VOICE_ID'),
    ],

    'meta' => [
        // Browser Pixel id (also used by the Conversions API endpoint).
        'pixel_id' => env('META_PIXEL_ID'),
        // Conversions API system-user access token.
        'capi_token' => env('META_CAPI_TOKEN'),
        // Optional: set while validating events in Events Manager > Test events.
        'test_event_code' => env('META_TEST_EVENT_CODE'),
        'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),
    ],

];
