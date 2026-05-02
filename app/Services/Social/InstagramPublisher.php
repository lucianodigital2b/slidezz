<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Services\Social\Instagram\InstagramSdk;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class InstagramPublisher implements SocialPublisher
{
    protected string $appId;

    protected string $appSecret;

    protected string $redirectUri;

    private const GRAPH_VERSION = 'v21.0';

    /** Seconds to wait between container status polls. */
    private const POLL_INTERVAL = 5;

    /** Maximum number of status polls before giving up. */
    private const POLL_MAX_ATTEMPTS = 24;

    private InstagramSdk $sdk;

    public function __construct()
    {
        $this->appId = config('services.instagram.client_id');
        $this->appSecret = config('services.instagram.client_secret');
        $this->redirectUri = config('services.instagram.redirect');
        $this->sdk = new InstagramSdk(self::GRAPH_VERSION);
    }

    public function authenticate(): string
    {
        $state = Str::random(40);
        session(['instagram_oauth_state' => $state]);

        $query = http_build_query([
            'client_id' => $this->appId,
            'redirect_uri' => url($this->redirectUri),
            'scope' => implode(',', [
                'instagram_business_basic',
                'instagram_business_content_publish',
                'instagram_business_manage_messages',
                'instagram_business_manage_comments',
            ]),
            'response_type' => 'code',
            'state' => $state,
        ]);

        return "https://www.instagram.com/oauth/authorize?{$query}";
    }

    public function handleCallback(array $data): SocialAccount
    {
        if (($data['state'] ?? null) !== session('instagram_oauth_state')) {
            throw new \Exception('Invalid OAuth state.');
        }

        // 1. Exchange code → short-lived user access token
        $tokenResponse = Http::asForm()->post('https://api.instagram.com/oauth/access_token', [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'grant_type' => 'authorization_code',
            'redirect_uri' => url($this->redirectUri),
            'code' => $data['code'],
        ])->throw()->json();

        $shortLivedToken = $tokenResponse['access_token'];
        $igUserId = $tokenResponse['user_id'];

        // 2. Exchange short-lived → long-lived user access token (60 days)
        $longLivedResponse = Http::get('https://graph.instagram.com/access_token', [
            'grant_type' => 'ig_exchange_token',
            'client_secret' => $this->appSecret,
            'access_token' => $shortLivedToken,
        ])->throw()->json();

        $userToken = $longLivedResponse['access_token'];
        $expiresIn = $longLivedResponse['expires_in'] ?? 5_184_000;

        // 3. Get Instagram account details
        $igDetails = $this->sdk->getMedia($userToken, (string) $igUserId, 'id,username,name,profile_picture_url');

        $workspaceId = session('current_workspace_id');

        if (! $workspaceId) {
            throw new \RuntimeException('No workspace in session when connecting Instagram account.');
        }

        return SocialAccount::updateOrCreate(
            [
                'provider' => 'instagram',
                'provider_id' => (string) $igUserId,
            ],
            [
                'workspace_id' => $workspaceId,
                'handle' => $igDetails['username'] ?? ($igDetails['name'] ?? null),
                'avatar' => $igDetails['profile_picture_url'] ?? null,
                'access_token' => $userToken,
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
    public function publish(ContentProject $project, \App\Models\Schedule $schedule): string
    {
        $account = $schedule->socialAccount;
        $igUserId = $account->provider_id;
        $accessToken = $account->access_token;

        $scriptData = $project->script_data ?? [];
        $caption = $scriptData['caption'] ?? '';

        $containerId = match ($project->type) {
            'carousel' => $this->createCarouselContainer($accessToken, $igUserId, $scriptData['image_urls'] ?? [], $caption),
            'video' => $this->createVideoContainer($accessToken, $igUserId, $project->video_url, $caption),
            default => $this->createImageContainer($accessToken, $igUserId, $scriptData['image_url'] ?? $project->video_url, $caption),
        };

        $this->waitForContainer($accessToken, $containerId);

        return $this->publishContainer($accessToken, $igUserId, $containerId);
    }

    public function getAnalytics(string $platformPostId): array
    {
        // Resolve the access token via the published schedule for this post.
        $schedule = Schedule::where('platform_post_id', $platformPostId)
            ->where('status', 'published')
            ->with('socialAccount')
            ->latest()
            ->firstOrFail();

        $account = $schedule->socialAccount;

        $response = $this->sdk->getMediaInsights($account->access_token, $platformPostId, 'impressions,reach,engagement,saved');

        $metrics = collect($response['data'] ?? [])
            ->keyBy('name')
            ->map(fn ($m) => $m['values'][0]['value'] ?? 0);

        $mediaData = $this->sdk->getMedia($account->access_token, $platformPostId, 'like_count,comments_count');

        return [
            'views' => $metrics->get('impressions', 0),
            'likes' => $mediaData['like_count'] ?? 0,
            'comments' => $mediaData['comments_count'] ?? 0,
            'shares' => 0,
            'bookmarks' => $metrics->get('saved', 0),
        ];
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Create a single image media container and return its ID.
     */
    private function createImageContainer(string $accessToken, string $igUserId, string $imageUrl, string $caption): string
    {
        return $this->sdk->createImageContainer($accessToken, $igUserId, $imageUrl, $caption);
    }

    /**
     * Create a video (Reels) media container and return its ID.
     */
    private function createVideoContainer(string $accessToken, string $igUserId, string $videoUrl, string $caption): string
    {
        return $this->sdk->createVideoContainer($accessToken, $igUserId, $videoUrl, $caption, 'REELS');
    }

    /**
     * Create carousel child containers for each image, then the parent carousel
     * container, and return the parent container ID.
     *
     * @param  string[]  $imageUrls
     */
    private function createCarouselContainer(string $accessToken, string $igUserId, array $imageUrls, string $caption): string
    {
        if (count($imageUrls) < 2) {
            throw new \InvalidArgumentException('Carousel requires at least 2 images.');
        }

        if (count($imageUrls) > 10) {
            throw new \InvalidArgumentException('Carousel supports at most 10 images.');
        }

        // 1. Create a child container for every image
        $childIds = [];

        foreach ($imageUrls as $imageUrl) {
            $childIds[] = $this->sdk->createCarouselItemImageContainer($accessToken, $igUserId, $imageUrl);
        }

        // 2. Create the parent CAROUSEL_ALBUM container
        return $this->sdk->createCarouselContainer($accessToken, $igUserId, $childIds, $caption);
    }

    /**
     * Poll the container status until it is FINISHED or until we time out.
     */
    private function waitForContainer(string $accessToken, string $containerId): void
    {
        for ($attempt = 0; $attempt < self::POLL_MAX_ATTEMPTS; $attempt++) {
            $statusCode = $this->sdk->getContainerStatus($accessToken, $containerId);

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
     */
    private function publishContainer(string $accessToken, string $igUserId, string $containerId): string
    {
        return $this->sdk->publishContainer($accessToken, $igUserId, $containerId);
    }
}
