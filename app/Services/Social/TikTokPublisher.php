<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TikTokPublisher implements SocialPublisher
{
    protected string $clientId;
    protected string $clientSecret;
    protected string $redirectUri;

    public function __construct()
    {
        $this->clientId = config('services.tiktok.client_id');
        $this->clientSecret = config('services.tiktok.client_secret');
        $this->redirectUri = config('services.tiktok.redirect');
    }

    public function authenticate(): string
    {
        $csrfState = Str::random(40);
        session(['tiktok_oauth_state' => $csrfState]);

        $query = http_build_query([
            'client_key' => $this->clientId,
            'response_type' => 'code',
            'scope' => 'user.info.basic,video.upload',
            'redirect_uri' => $this->redirectUri,
            'state' => $csrfState,
        ]);

        return "https://www.tiktok.com/v2/auth/authorize/?{$query}";
    }

    public function handleCallback(array $data): SocialAccount
    {
        if ($data['state'] !== session('tiktok_oauth_state')) {
            throw new \Exception('Invalid OAuth state');
        }

        // 1. Exchange code for access token
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code' => $data['code'],
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri,
        ]);

        $tokenData = $response->json();

        if (isset($tokenData['error'])) {
            throw new \Exception('TikTok OAuth Error: ' . json_encode($tokenData));
        }

        // 2. Fetch User Info
        $userInfoResponse = Http::withToken($tokenData['access_token'])
            ->get('https://open.tiktokapis.com/v2/user/info/', [
                'fields' => 'open_id,union_id,avatar_url,display_name'
            ]);

        $userInfo = $userInfoResponse->json()['data']['user'];

        // 3. Create or update SocialAccount
        return SocialAccount::updateOrCreate(
            [
                'provider' => 'tiktok',
                'provider_id' => $userInfo['open_id']
            ],
            [
                'workspace_id' => session('current_workspace_id'), // Set in the auth flow context
                'handle' => $userInfo['display_name'],
                'avatar' => $userInfo['avatar_url'],
                'access_token' => $tokenData['access_token'],
                'refresh_token' => $tokenData['refresh_token'],
                'expires_at' => now()->addSeconds($tokenData['expires_in']),
            ]
        );
    }

    public function publish(ContentProject $project): string
    {
        // To be implemented: TikTok Direct Post API
        // https://developers.tiktok.com/doc/tiktok-api-direct-post/
        
        // 1. Get the Schedule and SocialAccount
        $schedule = $project->schedules()->first();
        $account = $schedule->socialAccount;

        // 2. Refresh token if expired
        if ($account->expires_at->isPast()) {
            $this->refreshToken($account);
        }

        // 3. Initialize upload
        // 4. Upload video chunks
        // 5. Commit upload

        return 'fake_tiktok_post_id_' . Str::random(10);
    }

    public function getAnalytics(string $platformPostId): array
    {
        return [
            'views' => rand(100, 10000),
            'likes' => rand(10, 1000),
        ];
    }

    protected function refreshToken(SocialAccount $account): void
    {
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'refresh_token',
            'refresh_token' => $account->refresh_token,
        ]);

        $tokenData = $response->json();

        $account->update([
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'expires_at' => now()->addSeconds($tokenData['expires_in']),
        ]);
    }
}