<?php

namespace App\Services\Social;

use App\Contracts\SocialPublisher;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TikTokPublisher implements SocialPublisher
{
    protected ?string $clientId;

    protected ?string $clientSecret;

    protected ?string $redirectUri;

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
            'scope' => 'user.info.basic,user.info.stats,video.list,video.upload',
            'redirect_uri' => url($this->redirectUri),
            'state' => $csrfState,
            // Always show the consent screen, so the user can switch to another
            // TikTok account instead of re-linking the one already logged in.
            'disable_auto_auth' => 1,
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
            'redirect_uri' => url($this->redirectUri),
        ]);

        $tokenData = $response->json();

        if (isset($tokenData['error'])) {
            throw new \Exception('TikTok OAuth Error: '.json_encode($tokenData));
        }

        // 2. Fetch User Info
        $userInfoResponse = Http::withToken($tokenData['access_token'])
            ->get('https://open.tiktokapis.com/v2/user/info/', [
                'fields' => 'open_id,union_id,avatar_url,display_name',
            ]);

        $userInfo = $userInfoResponse->json()['data']['user'];

        // 3. Create or update SocialAccount
        return SocialAccount::updateOrCreate(
            [
                'provider' => 'tiktok',
                'provider_id' => $userInfo['open_id'],
            ],
            [
                'workspace_id' => session('current_workspace_id'), // Set in the auth flow context
                'handle' => $userInfo['display_name'],
                'avatar' => app(AvatarStore::class)->store($userInfo['avatar_url'] ?? null, 'tiktok', $userInfo['open_id']),
                'access_token' => $tokenData['access_token'],
                'refresh_token' => $tokenData['refresh_token'],
                'expires_at' => now()->addSeconds($tokenData['expires_in']),
                'needs_reconnect' => false,
            ]
        );
    }

    /**
     * Send a rendered photo carousel to the user's TikTok inbox as a draft.
     *
     * Uses `post_mode: MEDIA_UPLOAD`, which needs only the `video.upload` scope: the
     * carousel lands in the TikTok app and the creator taps post. Direct publishing
     * would require Apple-style app audit approval for `video.publish`.
     *
     * TikTok downloads the photos itself (`PULL_FROM_URL`), so the media disk must
     * serve them publicly and the domain must be verified in the developer portal.
     *
     * @see https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
     */
    public function publish(ContentProject $project, Schedule $schedule): string
    {
        $account = $schedule->socialAccount;

        if ($account->expires_at?->isPast()) {
            $this->refreshToken($account);
        }

        if ($project->type === 'video') {
            return $this->uploadVideoDraft($project, $account);
        }

        $data = $project->script_data ?? [];
        $imageUrls = $this->photoUrls($data);

        if ($imageUrls === []) {
            throw new \Exception('Este projeto não tem imagens renderizadas para publicar.');
        }

        // TikTok caps a carousel at 35 photos.
        $imageUrls = array_slice($imageUrls, 0, 35);

        $response = Http::withToken($account->access_token)
            ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
            ->timeout(60)
            ->post('https://open.tiktokapis.com/v2/post/publish/content/init/', [
                'media_type' => 'PHOTO',
                'post_mode' => 'MEDIA_UPLOAD',
                'post_info' => [
                    // Title is capped at 90 UTF-16 runes, description at 4000.
                    'title' => Str::limit((string) ($data['hook'] ?? $project->title), 88, ''),
                    'description' => Str::limit($this->description($data), 3990, ''),
                ],
                'source_info' => [
                    'source' => 'PULL_FROM_URL',
                    'photo_images' => $imageUrls,
                    'photo_cover_index' => 0,
                ],
            ]);

        $publishId = $response->json('data.publish_id');
        $errorCode = (string) $response->json('error.code', '');

        if ($response->failed() || ! $publishId || ($errorCode !== '' && $errorCode !== 'ok')) {
            throw new \Exception($this->publishError($errorCode, (string) $response->json('error.message', '')));
        }

        return $publishId;
    }

    /**
     * Rebuilt from each slide's storage path when there is one, so carousels
     * rendered before the media disk moved to the TikTok-verified domain still
     * point at that domain rather than the URL saved at render time.
     *
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    private function photoUrls(array $data): array
    {
        $paths = array_filter(array_column((array) ($data['slides'] ?? []), 'path'));

        if ($paths !== []) {
            $disk = Storage::disk(config('filesystems.media_disk'));

            return array_values(array_map(fn (string $path): string => url($disk->url($path)), $paths));
        }

        return array_values(array_filter((array) ($data['image_urls'] ?? [])));
    }

    /**
     * Push a rendered MP4 to the creator's TikTok inbox as a draft.
     *
     * TikTok downloads the file itself (`PULL_FROM_URL`), like the photo carousels:
     * the video already sits on the media disk, under the domain verified in the
     * developer portal, and TikTok's guidelines ask for this source in that case.
     * The inbox endpoint takes no caption: the creator writes it in the app.
     *
     * @see https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
     */
    private function uploadVideoDraft(ContentProject $project, SocialAccount $account): string
    {
        $path = (string) ($project->script_data['video_path'] ?? '');
        $disk = Storage::disk(config('filesystems.media_disk'));

        if ($path === '' || ! $disk->exists($path)) {
            throw new \Exception('Este vídeo ainda não foi renderizado.');
        }

        $response = Http::withToken($account->access_token)
            ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
            ->timeout(60)
            ->post('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', [
                'source_info' => [
                    'source' => 'PULL_FROM_URL',
                    'video_url' => url($disk->url($path)),
                ],
            ]);

        $publishId = $response->json('data.publish_id');
        $errorCode = (string) $response->json('error.code', '');

        if ($response->failed() || ! $publishId || ($errorCode !== '' && $errorCode !== 'ok')) {
            throw new \Exception($this->publishError($errorCode, (string) $response->json('error.message', '')));
        }

        return $publishId;
    }

    /**
     * Poll the async publish so a rejected download surfaces instead of silently
     * looking published.
     *
     * Once the creator posts the draft publicly and it passes moderation, the
     * same check also carries the id of the posted video (post_id).
     *
     * @return array{status: string, fail_reason: string, post_id: ?string}
     */
    public function fetchStatus(SocialAccount $account, string $publishId): array
    {
        if ($account->expires_at?->isPast()) {
            $this->refreshToken($account);
        }

        $response = Http::withToken($account->access_token)
            ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/post/publish/status/fetch/', [
                'publish_id' => $publishId,
            ]);

        return [
            'status' => (string) $response->json('data.status', 'UNKNOWN'),
            'fail_reason' => (string) $response->json('data.fail_reason', ''),
            // TikTok misspells the field; the id is an int64, which PHP keeps whole.
            'post_id' => ($id = $response->json('data.publicaly_available_post_id.0')) !== null ? (string) $id : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function description(array $data): string
    {
        $caption = trim((string) ($data['caption'] ?? ''));
        $hashtags = array_map(
            fn ($tag): string => '#'.ltrim(trim((string) $tag), '#'),
            (array) ($data['hashtags'] ?? []),
        );

        return trim($caption."\n\n".implode(' ', $hashtags));
    }

    /**
     * Translate TikTok's error codes into something the user can act on; the raw
     * code lands in the Schedule's error_log either way.
     */
    /**
     * The message for a fail_reason from the publish status check.
     */
    public function describeFailure(string $reason): string
    {
        return $this->publishError($reason, '');
    }

    private function publishError(string $code, string $message): string
    {
        return match ($code) {
            'photo_pull_failed', 'video_pull_failed' => 'O TikTok não conseguiu baixar a mídia. Confira se as imagens abrem pelo link e tente de novo.',
            'picture_size_check_failed' => 'O TikTok recusou o tamanho das imagens (máximo 1080p).',
            'file_format_check_failed' => 'O TikTok recusou o formato do arquivo.',
            'auth_removed' => 'A conta do TikTok tirou a permissão do Slidezz. Reconecte a conta.',
            'url_ownership_unverified' => 'O domínio das imagens não está verificado no TikTok Developer Portal. Verifique a propriedade da URL e tente de novo.',
            'spam_risk_too_many_posts' => 'O TikTok bloqueou o envio por excesso de posts recentes nessa conta. Tente mais tarde.',
            'spam_risk_user_banned_from_posting' => 'Essa conta do TikTok está impedida de postar no momento.',
            'reached_active_user_cap' => 'Limite diário de envios do app atingido no TikTok. Tente amanhã.',
            'access_token_invalid', 'scope_not_authorized' => 'A conexão com o TikTok expirou ou perdeu permissão. Reconecte a conta.',
            default => 'Falha ao enviar pro TikTok'.($code !== '' ? " ({$code})" : '').($message !== '' ? ": {$message}" : '.'),
        };
    }

    /**
     * Account totals (user.info.stats) and the latest videos with their stats
     * (video.list) for the analytics panel. Read straight from the account, so
     * it also covers what the creator posted outside Slidezz.
     *
     * @return array{followers: int, following: int, likes: int, videos: int, recent: list<array{id: string, title: string, cover: ?string, url: ?string, posted_at: ?string, views: int, likes: int, comments: int, shares: int}>}
     */
    public function accountInsights(SocialAccount $account): array
    {
        $result = $this->accountsInsights([$account])[$account->id];

        if ($result['error'] !== null) {
            throw new \RuntimeException($result['error']);
        }

        return $result['insights'];
    }

    /**
     * accountInsights for several accounts at once. Every call goes out in
     * parallel, so the panel waits for the slowest account instead of the sum
     * of all of them, and a failing account comes back as a message the user
     * can act on instead of failing the others.
     *
     * @param  iterable<SocialAccount>  $accounts
     * @return array<int, array{insights: ?array, error: ?string}> keyed by account id
     */
    public function accountsInsights(iterable $accounts): array
    {
        $results = [];
        $ready = [];

        foreach ($accounts as $account) {
            try {
                if ($account->expires_at?->isPast()) {
                    $this->refreshToken($account);
                }
                $ready[] = $account;
            } catch (\Throwable $e) {
                $results[$account->id] = ['insights' => null, 'error' => $this->insightsError($e)];
            }
        }

        if ($ready === []) {
            return $results;
        }

        $responses = Http::pool(function (Pool $pool) use ($ready) {
            foreach ($ready as $account) {
                $pool->as("user:{$account->id}")
                    ->withToken($account->access_token)
                    ->connectTimeout(5)
                    ->timeout(15)
                    ->get('https://open.tiktokapis.com/v2/user/info/', [
                        'fields' => 'open_id,follower_count,following_count,likes_count,video_count',
                    ]);

                $pool->as("videos:{$account->id}")
                    ->withToken($account->access_token)
                    ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
                    ->connectTimeout(5)
                    ->timeout(15)
                    ->post('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count', [
                        'max_count' => 20,
                    ]);
            }
        });

        foreach ($ready as $account) {
            try {
                $results[$account->id] = [
                    'insights' => $this->readInsights($responses["user:{$account->id}"], $responses["videos:{$account->id}"]),
                    'error' => null,
                ];
            } catch (\Throwable $e) {
                $results[$account->id] = ['insights' => null, 'error' => $this->insightsError($e)];
            }
        }

        return $results;
    }

    /**
     * @return array{followers: int, following: int, likes: int, videos: int, recent: list<array<string, mixed>>}
     */
    private function readInsights(Response|\Throwable $user, Response|\Throwable $videos): array
    {
        $this->failUnlessOk($user);
        $this->failUnlessOk($videos);

        return [
            'followers' => (int) $user->json('data.user.follower_count', 0),
            'following' => (int) $user->json('data.user.following_count', 0),
            'likes' => (int) $user->json('data.user.likes_count', 0),
            'videos' => (int) $user->json('data.user.video_count', 0),
            'recent' => collect($videos->json('data.videos', []))->map(fn (array $v) => [
                'id' => (string) $v['id'],
                'title' => (string) ($v['title'] ?? '') ?: (string) ($v['video_description'] ?? ''),
                'cover' => $v['cover_image_url'] ?? null,
                'url' => $v['share_url'] ?? null,
                'posted_at' => isset($v['create_time']) ? now()->setTimestamp((int) $v['create_time'])->toISOString() : null,
                'views' => (int) ($v['view_count'] ?? 0),
                'likes' => (int) ($v['like_count'] ?? 0),
                'comments' => (int) ($v['comment_count'] ?? 0),
                'shares' => (int) ($v['share_count'] ?? 0),
            ])->values()->all(),
        ];
    }

    /**
     * A pooled request that never got an answer comes back as the exception
     * itself, so it is rethrown here like any other failure.
     */
    private function failUnlessOk(Response|\Throwable $response): void
    {
        if ($response instanceof \Throwable) {
            throw $response;
        }

        $code = (string) $response->json('error.code', $response->successful() ? 'ok' : 'http_'.$response->status());

        if ($code !== 'ok') {
            throw new TikTokApiException($this->publishError($code, (string) $response->json('error.message', '')));
        }
    }

    /**
     * What the panel shows for an account that failed: TikTok's own error
     * already has a readable message; a timeout or anything unexpected never
     * shows its raw text.
     */
    private function insightsError(\Throwable $e): string
    {
        if ($e instanceof TikTokApiException) {
            return $e->getMessage();
        }

        if ($e instanceof ConnectionException) {
            return 'O TikTok demorou pra responder. Clique em Atualizar daqui a pouco.';
        }

        report($e);

        return 'Não deu pra ler essa conta agora. Tente de novo daqui a pouco.';
    }

    /**
     * Stats of the video the creator posted from the draft with this
     * publish_id. The draft itself has none, so the posted video's id is looked
     * up first (and kept on the schedule); until the creator posts the draft
     * publicly there is nothing to read and this returns no stats.
     */
    public function getAnalytics(string $platformPostId): array
    {
        $schedule = Schedule::where('platform_post_id', $platformPostId)
            ->with('socialAccount')
            ->latest('id')
            ->first();

        if (! $schedule) {
            return [];
        }

        $account = $schedule->socialAccount;

        if ($account->expires_at?->isPast()) {
            $this->refreshToken($account);
        }

        if (! $videoId = $this->publicPostId($schedule)) {
            return [];
        }

        $response = Http::withToken($account->access_token)
            ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count', [
                'filters' => ['video_ids' => [$videoId]],
            ]);

        $this->failUnlessOk($response);

        // Gone from the API: deleted, or made private after it was posted.
        $video = $response->json('data.videos.0');

        if (! $video) {
            return [];
        }

        // The API has no count of saves, so bookmarks stays out.
        return [
            'views' => (int) ($video['view_count'] ?? 0),
            'likes' => (int) ($video['like_count'] ?? 0),
            'comments' => (int) ($video['comment_count'] ?? 0),
            'shares' => (int) ($video['share_count'] ?? 0),
        ];
    }

    /**
     * The id of the video posted from this schedule's draft, asked of TikTok
     * and saved the first time it is there.
     */
    public function publicPostId(Schedule $schedule): ?string
    {
        if ($schedule->public_post_id) {
            return $schedule->public_post_id;
        }

        $postId = $this->fetchStatus($schedule->socialAccount, $schedule->platform_post_id)['post_id'];

        if ($postId) {
            $schedule->update(['public_post_id' => $postId]);
        }

        return $postId;
    }

    /**
     * Fetch the current profile picture and re-host it, for accounts linked
     * before avatars were stored (their CDN URL has expired).
     */
    public function refreshAvatar(SocialAccount $account): void
    {
        if ($account->expires_at?->isPast()) {
            $this->refreshToken($account);
        }

        $user = Http::withToken($account->access_token)
            ->get('https://open.tiktokapis.com/v2/user/info/', ['fields' => 'open_id,avatar_url'])
            ->throw()
            ->json('data.user');

        $avatar = app(AvatarStore::class)->store($user['avatar_url'] ?? null, 'tiktok', $account->provider_id);

        if ($avatar) {
            $account->update(['avatar' => $avatar]);
        }
    }

    /**
     * Refresh the token from a scheduled job, so a post never lands on a token
     * that lapsed between the last publish and now. A thrown reconnect error is
     * the caller's cue to leave this account flagged and move on.
     */
    public function keepAlive(SocialAccount $account): void
    {
        $this->refreshToken($account);
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

        // A failed refresh must never overwrite a working token with null: that
        // bricks the account for good (every post then shows "reconnect" and it
        // never heals on its own). Flag it for a manual reconnect, keep the old
        // token untouched, and surface the reason to the caller.
        if ($response->failed() || empty($tokenData['access_token'])) {
            $account->forceFill(['needs_reconnect' => true])->save();

            throw new TikTokApiException('A conexão com o TikTok expirou ou perdeu permissão. Reconecte a conta.');
        }

        $account->update([
            'access_token' => $tokenData['access_token'],
            // TikTok rotates the refresh token on each use; keep the old one only
            // if a (valid) response somehow omitted the new one.
            'refresh_token' => $tokenData['refresh_token'] ?? $account->refresh_token,
            'expires_at' => now()->addSeconds((int) $tokenData['expires_in']),
            'needs_reconnect' => false,
        ]);
    }
}
