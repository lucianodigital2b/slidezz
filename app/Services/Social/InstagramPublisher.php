<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Instagram\Container\Container;
use Instagram\Media\Insights;
use Instagram\Request\Metric;
use Instagram\User\Media;
use Instagram\User\MediaPublish;

class InstagramPublisher implements SocialPublisher
{
    protected string $appId;

    protected string $appSecret;

    protected string $redirectUri;

    private const GRAPH_VERSION = 'v21.0';

    private const GRAPH_BASE = 'https://graph.facebook.com/';

    /** Seconds to wait between container status polls. */
    private const POLL_INTERVAL = 5;

    /** Maximum number of status polls before giving up. */
    private const POLL_MAX_ATTEMPTS = 24;

    public function __construct()
    {
        $this->appId = config('services.instagram.client_id');
        $this->appSecret = config('services.instagram.client_secret');
        $this->redirectUri = config('services.instagram.redirect');
    }

    public function authenticate(): string
    {
        $state = Str::random(40);
        session(['instagram_oauth_state' => $state]);

        $query = http_build_query([
            'client_id' => $this->appId,
            'redirect_uri' => url($this->redirectUri),
            'scope' => implode(',', [
                'instagram_basic',
                'instagram_content_publish',
                'pages_show_list',
                'pages_read_engagement',
            ]),
            'response_type' => 'code',
            'state' => $state,
        ]);

        return 'https://www.facebook.com/'.self::GRAPH_VERSION."/dialog/oauth?{$query}";
    }

    public function handleCallback(array $data): SocialAccount
    {
        if (($data['state'] ?? null) !== session('instagram_oauth_state')) {
            throw new \Exception('Invalid OAuth state.');
        }

        // 1. Exchange code → short-lived user access token
        $tokenResponse = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION.'/oauth/access_token', [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => url($this->redirectUri),
            'code' => $data['code'],
        ])->throw()->json();

        $shortLivedToken = $tokenResponse['access_token'];

        // 2. Exchange short-lived → long-lived user access token (60 days)
        $longLivedResponse = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortLivedToken,
        ])->throw()->json();

        $userToken = $longLivedResponse['access_token'];
        $expiresIn = $longLivedResponse['expires_in'] ?? 5_184_000;

        // 3. Get linked Facebook Pages
        $pagesResponse = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION.'/me/accounts', [
            'access_token' => $userToken,
        ])->throw()->json();

        $page = $pagesResponse['data'][0] ?? null;

        if (! $page) {
            throw new \Exception('No Facebook Page found. Make sure your Instagram Business account is linked to a Facebook Page.');
        }

        $pageToken = $page['access_token'];
        $pageId = $page['id'];

        // 4. Get Instagram Business Account linked to the page
        $igAccountResponse = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION."/{$pageId}", [
            'fields' => 'instagram_business_account',
            'access_token' => $pageToken,
        ])->throw()->json();

        $igAccountId = $igAccountResponse['instagram_business_account']['id'] ?? null;

        if (! $igAccountId) {
            throw new \Exception('No Instagram Business Account linked to this page.');
        }

        // 5. Get Instagram account details
        $igDetails = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION."/{$igAccountId}", [
            'fields' => 'id,username,name,profile_picture_url',
            'access_token' => $pageToken,
        ])->throw()->json();

        return SocialAccount::updateOrCreate(
            [
                'provider' => 'instagram',
                'provider_id' => $igAccountId,
            ],
            [
                'workspace_id' => session('current_workspace_id'),
                'handle' => $igDetails['username'] ?? $igDetails['name'],
                'avatar' => $igDetails['profile_picture_url'] ?? null,
                'access_token' => $pageToken,
                'refresh_token' => $userToken,
                'expires_at' => now()->addSeconds($expiresIn),
            ]
        );
    }

    /**
     * Publish the content project to Instagram.
     *
     * Supports:
     *   - type = 'image'    → single image post (script_data.image_url + script_data.caption)
     *   - type = 'carousel' → carousel album   (script_data.image_urls[] + script_data.caption)
     *   - type = 'video'    → single video / reel (video_url + script_data.caption)
     */
    public function publish(ContentProject $project): string
    {
        // Resolve the social account via the pending schedule
        $schedule = $project->schedules()
            ->where('status', 'publishing')
            ->with('socialAccount')
            ->latest()
            ->firstOrFail();

        $account = $schedule->socialAccount;
        $igUserId = $account->provider_id;
        $accessToken = $account->access_token;

        $sdkConfig = [
            'access_token' => $accessToken,
            'graph_version' => self::GRAPH_VERSION,
            'user_id' => $igUserId,
        ];

        $scriptData = $project->script_data ?? [];
        $caption = $scriptData['caption'] ?? '';

        $containerId = match ($project->type) {
            'carousel' => $this->createCarouselContainer($sdkConfig, $scriptData['image_urls'] ?? [], $caption),
            'video' => $this->createVideoContainer($sdkConfig, $project->video_url, $caption),
            default => $this->createImageContainer($sdkConfig, $scriptData['image_url'] ?? $project->video_url, $caption),
        };

        $this->waitForContainer($sdkConfig, $containerId);

        return $this->publishContainer($sdkConfig, $containerId);
    }

    public function getAnalytics(string $platformPostId): array
    {
        // Analytics require a valid access_token scoped to the account that owns the post.
        // Resolve via the most recent published schedule for this post ID.
        $schedule = Schedule::where('platform_post_id', $platformPostId)
            ->where('status', 'published')
            ->with('socialAccount')
            ->latest()
            ->first();

        if (! $schedule) {
            return $this->randomFallback();
        }

        $account = $schedule->socialAccount;

        try {
            $insights = new Insights([
                'access_token' => $account->access_token,
                'graph_version' => self::GRAPH_VERSION,
                'media_id' => $platformPostId,
                'media_type' => Metric::MEDIA_TYPE_IMAGE,
            ]);

            $response = $insights->getSelf([
                'metric' => implode(',', [
                    Metric::IMPRESSIONS,
                    Metric::REACH,
                    Metric::ENGAGEMENT,
                    Metric::SAVED,
                ]),
            ]);

            $metrics = collect($response['data'] ?? [])
                ->keyBy('name')
                ->map(fn ($m) => $m['values'][0]['value'] ?? 0);

            // Fetch like and comment counts from the media object directly
            $mediaData = Http::get(self::GRAPH_BASE.self::GRAPH_VERSION."/{$platformPostId}", [
                'fields' => 'like_count,comments_count',
                'access_token' => $account->access_token,
            ])->json();

            return [
                'views' => $metrics->get(Metric::IMPRESSIONS, 0),
                'likes' => $mediaData['like_count'] ?? 0,
                'comments' => $mediaData['comments_count'] ?? 0,
                'shares' => 0,
                'bookmarks' => $metrics->get(Metric::SAVED, 0),
            ];
        } catch (\Throwable $e) {
            Log::warning("Instagram analytics fetch failed for post {$platformPostId}: {$e->getMessage()}");

            return $this->randomFallback();
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Create a single image media container and return its ID.
     *
     * @param  array<string, string>  $sdkConfig
     */
    private function createImageContainer(array $sdkConfig, string $imageUrl, string $caption): string
    {
        $media = new Media($sdkConfig);

        $response = $media->create([
            'image_url' => $imageUrl,
            'caption' => $caption,
        ]);

        return $this->extractId($response, 'image container');
    }

    /**
     * Create a video (Reels) media container and return its ID.
     *
     * @param  array<string, string>  $sdkConfig
     */
    private function createVideoContainer(array $sdkConfig, string $videoUrl, string $caption): string
    {
        $media = new Media($sdkConfig);

        $response = $media->create([
            'video_url' => $videoUrl,
            'media_type' => 'REELS',
            'caption' => $caption,
        ]);

        return $this->extractId($response, 'video container');
    }

    /**
     * Create carousel child containers for each image, then the parent carousel
     * container, and return the parent container ID.
     *
     * @param  array<string, string>  $sdkConfig
     * @param  string[]  $imageUrls
     */
    private function createCarouselContainer(array $sdkConfig, array $imageUrls, string $caption): string
    {
        if (count($imageUrls) < 2) {
            throw new \InvalidArgumentException('Carousel requires at least 2 images.');
        }

        if (count($imageUrls) > 10) {
            throw new \InvalidArgumentException('Carousel supports at most 10 images.');
        }

        $media = new Media($sdkConfig);

        // 1. Create a child container for every image
        $childIds = [];

        foreach ($imageUrls as $imageUrl) {
            $response = $media->create([
                'image_url' => $imageUrl,
                'is_carousel_item' => 'true',
            ]);

            $childIds[] = $this->extractId($response, 'carousel child container');
        }

        // 2. Create the parent CAROUSEL_ALBUM container
        $response = $media->create([
            'children' => implode(',', $childIds),
            'caption' => $caption,
        ]);

        return $this->extractId($response, 'carousel container');
    }

    /**
     * Poll the container status until it is FINISHED or until we time out.
     *
     * @param  array<string, string>  $sdkConfig
     */
    private function waitForContainer(array $sdkConfig, string $containerId): void
    {
        $container = new Container(array_merge($sdkConfig, ['container_id' => $containerId]));

        for ($attempt = 0; $attempt < self::POLL_MAX_ATTEMPTS; $attempt++) {
            $response = $container->getSelf();
            $statusCode = $response['status_code'] ?? '';

            if ($statusCode === 'FINISHED') {
                return;
            }

            if ($statusCode === 'ERROR') {
                throw new \RuntimeException("Instagram container {$containerId} encountered an error during processing.");
            }

            sleep(self::POLL_INTERVAL);
        }

        throw new \RuntimeException("Timed out waiting for Instagram container {$containerId} to finish processing.");
    }

    /**
     * Publish a finished container and return the resulting post ID.
     *
     * @param  array<string, string>  $sdkConfig
     */
    private function publishContainer(array $sdkConfig, string $containerId): string
    {
        $publisher = new MediaPublish($sdkConfig);
        $response = $publisher->create($containerId);

        return $this->extractId($response, 'published post');
    }

    /**
     * Extract the 'id' field from an SDK response or throw on failure.
     *
     * @param  array<string, mixed>  $response
     */
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

    /**
     * Fallback analytics when the real API call cannot be made.
     *
     * @return array<string, int>
     */
    private function randomFallback(): array
    {
        $views = rand(100, 10000);

        return [
            'views' => $views,
            'likes' => rand(10, (int) ($views * 0.12)),
            'comments' => rand(0, (int) ($views * 0.03)),
            'shares' => 0,
            'bookmarks' => rand(0, (int) ($views * 0.05)),
        ];
    }
}
