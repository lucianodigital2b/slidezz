<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Services\Social\Instagram\InstagramSdk;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
        $workspaceId = session('current_workspace_id');
        $nonce = Str::random(40);

        // Encode workspace_id + nonce in state so the callback works even if the
        // session is reset during the Instagram OAuth redirect (common in local dev).
        $state = base64_encode(json_encode([
            'workspace_id' => $workspaceId,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspaceId.'|'.$nonce, config('app.key')),
        ]));

        session(['instagram_oauth_state' => $state]);

        $scopes = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
        ];

        $query = http_build_query([
            'client_id' => $this->appId,
            'redirect_uri' => url($this->redirectUri),
            'scope' => implode(',', $scopes),
            'response_type' => 'code',
            'state' => $state,
        ]);

        $url = "https://www.instagram.com/oauth/authorize?{$query}";

        Log::info('[Instagram] Starting OAuth flow', [
            'redirect_uri' => url($this->redirectUri),
            'scopes' => $scopes,
            'app_id' => $this->appId,
            'workspace_id' => $workspaceId,
        ]);

        return $url;
    }

    public function handleCallback(array $data): SocialAccount
    {
        Log::info('[Instagram] handleCallback received', ['keys' => array_keys($data), 'has_code' => isset($data['code']), 'has_state' => isset($data['state'])]);

        $rawState = $data['state'] ?? null;
        $decoded = $rawState ? json_decode(base64_decode($rawState), true) : null;

        Log::debug('[Instagram] State decoded', ['decoded_keys' => $decoded ? array_keys($decoded) : null]);

        if (! $decoded || ! isset($decoded['workspace_id'], $decoded['nonce'], $decoded['hmac'])) {
            Log::error('[Instagram] Invalid or missing state parameter', ['raw_state' => $rawState]);
            throw new \Exception('Invalid OAuth state.');
        }

        $expectedHmac = hash_hmac('sha256', $decoded['workspace_id'].'|'.$decoded['nonce'], config('app.key'));

        if (! hash_equals($expectedHmac, $decoded['hmac'])) {
            Log::error('[Instagram] OAuth state HMAC mismatch — possible CSRF');
            throw new \Exception('Invalid OAuth state.');
        }

        $workspaceId = $decoded['workspace_id'];

        // 1. Exchange code → short-lived user access token
        Log::info('[Instagram] Exchanging code for short-lived token');
        $tokenRequest = [
            'client_id' => $this->appId,
            'client_secret' => '***',
            'grant_type' => 'authorization_code',
            'redirect_uri' => url($this->redirectUri),
        ];
        Log::debug('[Instagram] Short-lived token request', $tokenRequest);

        $shortLivedResponse = Http::asForm()->post('https://api.instagram.com/oauth/access_token', [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'grant_type' => 'authorization_code',
            'redirect_uri' => url($this->redirectUri),
            'code' => $data['code'],
        ]);

        Log::debug('[Instagram] Short-lived token response', ['status' => $shortLivedResponse->status(), 'body' => $shortLivedResponse->body()]);

        if ($shortLivedResponse->failed()) {
            Log::error('[Instagram] Failed to get short-lived token', ['status' => $shortLivedResponse->status(), 'body' => $shortLivedResponse->body()]);
        }

        $tokenResponse = $shortLivedResponse->throw()->json();

        $shortLivedToken = $tokenResponse['access_token'];
        $igUserId = $tokenResponse['user_id'];
        Log::info('[Instagram] Got short-lived token', ['ig_user_id' => $igUserId]);

        // 2. Exchange short-lived → long-lived user access token (60 days)
        Log::info('[Instagram] Exchanging for long-lived token', ['ig_user_id' => $igUserId]);

        $longLivedResponse = Http::get('https://graph.instagram.com/access_token', [
            'grant_type' => 'ig_exchange_token',
            'client_secret' => $this->appSecret,
            'access_token' => $shortLivedToken,
        ]);

        Log::debug('[Instagram] Long-lived token response', ['status' => $longLivedResponse->status(), 'body' => $longLivedResponse->body()]);

        if ($longLivedResponse->failed()) {
            Log::error('[Instagram] Failed to get long-lived token', ['status' => $longLivedResponse->status(), 'body' => $longLivedResponse->body()]);
        }

        $longLived = $longLivedResponse->throw()->json();

        $userToken = $longLived['access_token'];
        $expiresIn = $longLived['expires_in'] ?? 5_184_000;
        Log::info('[Instagram] Got long-lived token', ['expires_in' => $expiresIn]);

        // 3. Get Instagram account details
        Log::info('[Instagram] Fetching account details', ['ig_user_id' => $igUserId]);
        $igDetails = $this->sdk->getMedia($userToken, (string) $igUserId, 'id,username,name,profile_picture_url');
        Log::info('[Instagram] Account details fetched', ['username' => $igDetails['username'] ?? null, 'name' => $igDetails['name'] ?? null]);

        $account = SocialAccount::updateOrCreate(
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

        Log::info('[Instagram] SocialAccount saved', ['social_account_id' => $account->id, 'handle' => $account->handle, 'workspace_id' => $workspaceId]);

        return $account;
    }

    /**
     * Publish the content project to Instagram.
     *
     * Supports:
     *   - type = 'image'    → single image post (script_data.image_url + script_data.caption)
     *   - type = 'carousel' → carousel album   (script_data.image_urls[] + script_data.caption)
     *   - type = 'video'    → single video / reel (video_url + script_data.caption)
     */
    public function publish(ContentProject $project, Schedule $schedule): string
    {
        $account = $schedule->socialAccount;
        $igUserId = $account->provider_id;
        $accessToken = $account->access_token;

        $scriptData = $project->script_data ?? [];
        $caption = $scriptData['caption'] ?? '';

        Log::info('[Instagram] Starting publish', [
            'project_id' => $project->id,
            'project_type' => $project->type,
            'schedule_id' => $schedule->id,
            'ig_user_id' => $igUserId,
            'social_account_id' => $account->id,
            'token_expires_at' => $account->expires_at?->toDateTimeString(),
            'caption_length' => strlen($caption),
        ]);

        $containerId = match ($project->type) {
            'carousel' => $this->createCarouselContainer($accessToken, $igUserId, $scriptData['image_urls'] ?? [], $caption),
            'video' => $this->createVideoContainer($accessToken, $igUserId, $project->video_url, $caption),
            default => $this->createImageContainer($accessToken, $igUserId, $scriptData['image_url'] ?? $project->video_url, $caption),
        };

        Log::info('[Instagram] Container created', ['container_id' => $containerId, 'type' => $project->type]);

        $this->waitForContainer($accessToken, $containerId);

        $postId = $this->publishContainer($accessToken, $igUserId, $containerId);

        Log::info('[Instagram] Published successfully', ['post_id' => $postId, 'container_id' => $containerId, 'project_id' => $project->id]);

        return $postId;
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
        Log::info('[Instagram] Waiting for container to be ready', ['container_id' => $containerId, 'max_attempts' => self::POLL_MAX_ATTEMPTS, 'poll_interval' => self::POLL_INTERVAL]);

        for ($attempt = 0; $attempt < self::POLL_MAX_ATTEMPTS; $attempt++) {
            $statusCode = $this->sdk->getContainerStatus($accessToken, $containerId);

            Log::debug('[Instagram] Container status poll', ['container_id' => $containerId, 'attempt' => $attempt + 1, 'status' => $statusCode]);

            if ($statusCode === 'FINISHED') {
                Log::info('[Instagram] Container ready', ['container_id' => $containerId, 'attempts' => $attempt + 1]);

                return;
            }

            if ($statusCode === 'ERROR') {
                Log::error('[Instagram] Container processing error', ['container_id' => $containerId, 'attempt' => $attempt + 1]);
                throw new \RuntimeException("Instagram container {$containerId} encountered an error during processing.");
            }

            sleep(self::POLL_INTERVAL);
        }

        Log::error('[Instagram] Container timed out', ['container_id' => $containerId, 'attempts' => self::POLL_MAX_ATTEMPTS]);
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
