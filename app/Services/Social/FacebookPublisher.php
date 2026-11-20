<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FacebookPublisher implements SocialPublisher
{
    protected string $clientId;

    protected string $clientSecret;

    protected string $redirectUri;

    protected string $baseUrl;

    protected string $oauthDialogUrl;

    private const GRAPH_VERSION = 'v21.0';

    public function __construct()
    {
        $this->clientId = config('services.facebook.client_id');
        $this->clientSecret = config('services.facebook.client_secret');
        $this->redirectUri = config('services.facebook.redirect');
        $this->baseUrl = 'https://graph.facebook.com/'.self::GRAPH_VERSION;
        $this->oauthDialogUrl = 'https://www.facebook.com/'.self::GRAPH_VERSION.'/dialog/oauth';
    }

    public function authenticate(): string
    {
        $workspaceId = session('current_workspace_id');
        $nonce = Str::random(40);

        $state = $this->base64UrlEncode(json_encode([
            'workspace_id' => $workspaceId,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspaceId.'|'.$nonce, config('app.key')),
        ]));

        session(['facebook_oauth_state' => $state]);

        $scopes = [
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_posts',
            // Views of each post (getAnalytics).
            'read_insights',
        ];

        // Facebook Login for Business (the only login a Business-type app gets)
        // takes a dashboard "configuration" that carries the permissions; the
        // scope list is the fallback when no configuration id is set.
        $configId = config('services.facebook.config_id');

        $query = http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => url($this->redirectUri),
            ...($configId ? ['config_id' => $configId] : ['scope' => implode(',', $scopes)]),
            'response_type' => 'code',
            'state' => $state,
        ]);

        $url = "{$this->oauthDialogUrl}?{$query}";

        Log::info('[Facebook] Starting OAuth flow', [
            'redirect_uri' => url($this->redirectUri),
            'scopes' => $scopes,
            'app_id' => $this->clientId,
            'workspace_id' => $workspaceId,
        ]);

        return $url;
    }

    public function handleCallback(array $data): SocialAccount
    {
        Log::info('[Facebook] handleCallback received', [
            'keys' => array_keys($data),
            'has_code' => isset($data['code']),
            'has_state' => isset($data['state']),
        ]);

        $rawState = $data['state'] ?? session('facebook_oauth_state');
        $decoded = $rawState ? json_decode($this->base64UrlDecode($rawState), true) : null;

        Log::info('[Facebook] State decoded', [
            'from_session' => ! isset($data['state']) && $rawState !== null,
            'decoded_keys' => $decoded ? array_keys($decoded) : null,
        ]);

        if (! $decoded || ! isset($decoded['workspace_id'], $decoded['nonce'], $decoded['hmac'])) {
            Log::error('[Facebook] Invalid or missing state parameter');
            throw new \Exception('Invalid OAuth state.');
        }

        $expectedHmac = hash_hmac('sha256', $decoded['workspace_id'].'|'.$decoded['nonce'], config('app.key'));

        if (! hash_equals($expectedHmac, $decoded['hmac'])) {
            Log::error('[Facebook] OAuth state HMAC mismatch — possible CSRF');
            throw new \Exception('Invalid OAuth state.');
        }

        $workspaceId = $decoded['workspace_id'];

        // 1. Exchange code → short-lived user access token.
        Log::info('[Facebook] Exchanging code for short-lived token');

        $shortLivedResponse = Http::get($this->baseUrl.'/oauth/access_token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => url($this->redirectUri),
            'code' => $data['code'],
        ])->throw();

        $shortLived = $shortLivedResponse->json();
        $shortLivedToken = $shortLived['access_token'];

        Log::info('[Facebook] Got short-lived token');

        // 2. Exchange short-lived → long-lived user token. Page tokens obtained
        //    from a long-lived user token do not expire.
        Log::info('[Facebook] Exchanging for long-lived token');

        $longLivedResponse = Http::get($this->baseUrl.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'fb_exchange_token' => $shortLivedToken,
        ])->throw();

        $longLived = $longLivedResponse->json();
        $userToken = $longLived['access_token'];

        Log::info('[Facebook] Got long-lived token');

        // 3. List Pages available to the authenticated user.
        Log::info('[Facebook] Fetching Pages');

        $pagesResponse = Http::withToken($userToken)
            ->acceptJson()
            ->get($this->baseUrl.'/me/accounts', [
                'fields' => 'id,name,access_token,picture{url}',
                'limit' => 100,
            ])
            ->throw();

        $pages = $pagesResponse->json()['data'] ?? [];

        Log::info('[Facebook] Fetched Pages', ['page_count' => count($pages)]);

        if (empty($pages)) {
            Log::error('[Facebook] No Pages available');
            throw new \Exception('No Facebook Page found. Create a Page or grant access to one, then try again.');
        }

        $firstAccount = null;

        foreach ($pages as $page) {
            $providerId = (string) $page['id'];
            $avatar = $page['picture']['url'] ?? ($page['picture']['data']['url'] ?? null);

            $account = SocialAccount::updateOrCreate(
                [
                    'workspace_id' => $workspaceId,
                    'provider' => 'facebook',
                    'provider_id' => $providerId,
                ],
                [
                    'handle' => $page['name'] ?? null,
                    'avatar' => $avatar,
                    'access_token' => $page['access_token'],
                    'refresh_token' => null,
                    'expires_at' => null,
                    'needs_reconnect' => false,
                ]
            );

            Log::info('[Facebook] SocialAccount saved', [
                'social_account_id' => $account->id,
                'handle' => $account->handle,
                'workspace_id' => $workspaceId,
            ]);

            if (! $firstAccount) {
                $firstAccount = $account;
            }
        }

        return $firstAccount;
    }

    public function publish(ContentProject $project, Schedule $schedule): string
    {
        $account = $schedule->socialAccount;
        $pageId = $account->provider_id;
        $accessToken = $account->access_token;

        $scriptData = $project->script_data ?? [];
        $caption = $scriptData['caption'] ?? '';

        Log::info('[Facebook] Starting publish', [
            'project_id' => $project->id,
            'project_type' => $project->type,
            'schedule_id' => $schedule->id,
            'page_id' => $pageId,
            'social_account_id' => $account->id,
            'caption_length' => strlen($caption),
        ]);

        $postId = match ($project->type) {
            'carousel' => $this->publishCarousel($accessToken, $pageId, $scriptData['image_urls'] ?? [], $caption),
            'video' => $this->publishVideo($accessToken, $pageId, $project->video_url, $caption),
            default => $this->publishSingleImage($accessToken, $pageId, $scriptData['image_url'] ?? $project->video_url, $caption),
        };

        Log::info('[Facebook] Published successfully', [
            'post_id' => $postId,
            'page_id' => $pageId,
            'project_id' => $project->id,
        ]);

        return $postId;
    }

    public function getAnalytics(string $platformPostId): array
    {
        $schedule = Schedule::where('platform_post_id', $platformPostId)
            ->where('status', 'published')
            ->with('socialAccount')
            ->latest()
            ->firstOrFail();

        $account = $schedule->socialAccount;

        // Photo and carousel posts are saved as "{pageId}_{postId}"; videos and
        // Reels as the bare video id. A Video node has no `shares` field, and
        // asking for it fails the whole call, so only posts ask for it.
        $fields = 'likes.summary(true).limit(0),comments.summary(true).limit(0)';
        if (str_contains($platformPostId, '_')) {
            $fields .= ',shares';
        }

        try {
            $response = Http::withToken($account->access_token)
                ->acceptJson()
                ->get($this->baseUrl.'/'.$platformPostId, [
                    'fields' => $fields,
                ])
                ->throw()
                ->json();

            $shares = 0;
            if (isset($response['shares'])) {
                if (is_array($response['shares']) && isset($response['shares']['count'])) {
                    $shares = (int) $response['shares']['count'];
                } elseif (is_numeric($response['shares'])) {
                    $shares = (int) $response['shares'];
                }
            }

            $stats = [
                'likes' => (int) ($response['likes']['summary']['total_count'] ?? 0),
                'comments' => (int) ($response['comments']['summary']['total_count'] ?? 0),
                'shares' => $shares,
            ];
        } catch (\Throwable $e) {
            Log::warning('[Facebook] Failed to fetch analytics', [
                'platform_post_id' => $platformPostId,
                'social_account_id' => $account->id,
                'message' => $e->getMessage(),
            ]);

            // Nothing read: the job keeps no row rather than a row of zeros.
            return [];
        }

        // Views need read_insights. `post_impressions` is deprecated in favour
        // of `post_media_view`; videos and Reels report through video_insights.
        // Without the permission the post keeps likes/comments/shares.
        try {
            [$edge, $metric] = str_contains($platformPostId, '_')
                ? ['insights', 'post_media_view']
                : ['video_insights', 'total_video_views'];

            $insights = Http::withToken($account->access_token)
                ->acceptJson()
                ->get("{$this->baseUrl}/{$platformPostId}/{$edge}", ['metric' => $metric])
                ->throw()
                ->json();

            $views = collect($insights['data'] ?? [])->first()['values'][0]['value'] ?? null;
            if (is_numeric($views)) {
                $stats['views'] = (int) $views;
            }
        } catch (\Throwable $e) {
            Log::info('[Facebook] Insights unavailable, keeping likes/comments/shares only', [
                'platform_post_id' => $platformPostId,
                'social_account_id' => $account->id,
                'message' => $e->getMessage(),
            ]);
        }

        return $stats;
    }

    private function publishSingleImage(string $accessToken, string $pageId, string $imageUrl, string $caption): string
    {
        $response = $this->post("/{$pageId}/photos", [
            'url' => $imageUrl,
            'message' => $caption,
            'published' => 'true',
            'access_token' => $accessToken,
        ], 120);

        return (string) ($response['post_id'] ?? $response['id'] ?? throw new \RuntimeException('Facebook Graph did not return a post ID.'));
    }

    private function publishCarousel(string $accessToken, string $pageId, array $imageUrls, string $caption): string
    {
        if (count($imageUrls) < 2) {
            throw new \InvalidArgumentException('Carousel requires at least 2 images.');
        }

        if (count($imageUrls) > 10) {
            throw new \InvalidArgumentException('Carousel supports at most 10 images.');
        }

        $mediaFbIds = [];

        foreach ($imageUrls as $imageUrl) {
            $response = $this->post("/{$pageId}/photos", [
                'url' => $imageUrl,
                'published' => 'false',
                'access_token' => $accessToken,
            ], 120);

            $mediaFbIds[] = (string) ($response['id'] ?? throw new \RuntimeException('Facebook Graph did not return an ID for a carousel child photo.'));
        }

        $payload = [
            'message' => $caption,
            'access_token' => $accessToken,
        ];

        foreach ($mediaFbIds as $index => $id) {
            $payload['attached_media['.$index.']'] = json_encode(['media_fbid' => $id]);
        }

        $response = $this->post("/{$pageId}/feed", $payload, 120);

        return (string) ($response['id'] ?? throw new \RuntimeException('Facebook Graph did not return a feed post ID.'));
    }

    private function publishVideo(string $accessToken, string $pageId, string $videoUrl, string $caption): string
    {
        $response = $this->post("/{$pageId}/videos", [
            'file_url' => $videoUrl,
            'description' => $caption,
            'access_token' => $accessToken,
        ], 120);

        return (string) ($response['id'] ?? throw new \RuntimeException('Facebook Graph did not return a video post ID.'));
    }

    private function post(string $path, array $payload, int $timeout = 60): array
    {
        $response = Http::asForm()
            ->timeout($timeout)
            ->post($this->baseUrl.$path, $payload);

        if ($response->failed()) {
            $error = $response->json('error.message') ?? 'Unknown Graph error';
            throw new \RuntimeException("Facebook Graph request failed: {$error}");
        }

        return $response->json();
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
