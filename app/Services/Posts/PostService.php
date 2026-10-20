<?php

namespace App\Services\Posts;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PostService
{
    private const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

    public function workspaceIds(User $user): Collection
    {
        return Workspace::where('owner_id', $user->id)->pluck('id');
    }

    public function accounts(User $user): Collection
    {
        return SocialAccount::whereIn('workspace_id', $this->workspaceIds($user))
            ->get(['id', 'workspace_id', 'provider', 'handle']);
    }

    public function list(User $user, ?string $from, ?string $to, ?string $status): Collection
    {
        return Schedule::whereHas('socialAccount', fn ($q) => $q->whereIn('workspace_id', $this->workspaceIds($user)))
            ->with(['contentProject', 'socialAccount'])
            ->when($from, fn ($q, $from) => $q->where('publish_at', '>=', Carbon::parse($from)->utc()))
            ->when($to, fn ($q, $to) => $q->where('publish_at', '<=', Carbon::parse($to)->utc()))
            ->when($status, fn ($q, $status) => $q->where('status', $status))
            ->orderBy('publish_at')
            ->limit(500)
            ->get();
    }

    /**
     * @param  UploadedFile[]  $files
     */
    public function createFromFiles(User $user, int $accountId, string $publishAt, ?string $caption, ?string $title, array $files): Schedule
    {
        $account = SocialAccount::whereIn('workspace_id', $this->workspaceIds($user))
            ->findOrFail($accountId);

        $disk = Storage::disk(config('filesystems.media_disk'));
        $folder = $this->newFolder($account);

        $paths = [];
        foreach (array_values($files) as $i => $file) {
            $paths[] = $disk->putFileAs($folder, $file, sprintf('%02d.%s', $i + 1, $file->extension()), 'public');
        }

        $project = $this->createContentProject($account, $paths, $caption, $title);

        return $this->schedule($account, $project, $publishAt);
    }

    public function createFromImageUrls(User $user, int $accountId, string $publishAt, ?string $caption, ?string $title, array $urls): Schedule
    {
        $account = SocialAccount::whereIn('workspace_id', $this->workspaceIds($user))
            ->findOrFail($accountId);

        if (count($urls) > 35) {
            throw ValidationException::withMessages(['image_urls' => 'A maximum of 35 image URLs is allowed.']);
        }

        $disk = Storage::disk(config('filesystems.media_disk'));
        $folder = $this->newFolder($account);

        $paths = [];
        try {
            foreach (array_values($urls) as $i => $url) {
                $image = $this->downloadImage((string) $url, $i + 1);
                $path = sprintf('%s/%02d.%s', $folder, $i + 1, $image['extension']);
                $disk->put($path, $image['binary'], 'public');
                $paths[] = $path;
            }
        } catch (\Throwable $e) {
            $disk->deleteDirectory($folder);

            throw $e;
        }

        $project = $this->createContentProject($account, $paths, $caption, $title);

        return $this->schedule($account, $project, $publishAt);
    }

    public function createFromProject(User $user, int $accountId, string $publishAt, ?string $caption, int $contentProjectId): Schedule
    {
        $project = ContentProject::whereIn('workspace_id', $this->workspaceIds($user))
            ->findOrFail($contentProjectId);

        if ($project->status !== 'ready') {
            throw ValidationException::withMessages(['content_project_id' => 'This project is not ready yet.']);
        }

        $account = SocialAccount::whereIn('workspace_id', $this->workspaceIds($user))
            ->where('workspace_id', $project->workspace_id)
            ->findOrFail($accountId);

        if ($project->type === 'slideshow' && $account->provider !== 'tiktok') {
            throw ValidationException::withMessages(['social_account_id' => 'Generated slideshows can only be posted to a TikTok account.']);
        }

        if ($caption !== null) {
            $data = $project->script_data ?? [];
            $data['caption'] = $caption;
            $project->update(['script_data' => $data]);
        }

        return $this->schedule($account, $project, $publishAt);
    }

    public function update(User $user, Schedule $schedule, array $validated): Schedule
    {
        $this->authorize($user, $schedule);

        if (! in_array($schedule->status, [ScheduleStatus::Pending, ScheduleStatus::Failed], true)) {
            throw ValidationException::withMessages(['post' => 'Only pending or failed posts can be changed.']);
        }

        if (array_key_exists('caption', $validated) || isset($validated['title'])) {
            $project = $schedule->contentProject;
            $data = $project->script_data ?? [];
            if (array_key_exists('caption', $validated)) {
                $data['caption'] = (string) $validated['caption'];
            }
            $project->update(array_filter([
                'script_data' => $data,
                'title' => $validated['title'] ?? null,
            ]));
        }

        if (isset($validated['publish_at'])) {
            $schedule->update([
                'publish_at' => Carbon::parse($validated['publish_at'])->utc(),
                'status' => ScheduleStatus::Pending,
                'error_log' => null,
            ]);
        }

        return $schedule->fresh(['contentProject', 'socialAccount']);
    }

    public function duplicate(User $user, Schedule $schedule, string $publishAt): Schedule
    {
        $this->authorize($user, $schedule);

        $copy = Schedule::create([
            'content_project_id' => $schedule->content_project_id,
            'social_account_id' => $schedule->social_account_id,
            'publish_at' => Carbon::parse($publishAt)->utc(),
            'status' => ScheduleStatus::Pending,
        ]);

        return $copy->load(['contentProject', 'socialAccount']);
    }

    public function delete(User $user, Schedule $schedule): void
    {
        $this->authorize($user, $schedule);

        if ($schedule->status === ScheduleStatus::Publishing) {
            throw ValidationException::withMessages(['post' => 'This post is being published right now.']);
        }

        $schedule->delete();
    }

    public function authorize(User $user, Schedule $schedule): void
    {
        if (! $this->workspaceIds($user)->contains($schedule->socialAccount->workspace_id)) {
            throw new AuthorizationException;
        }
    }

    public function findForUser(User $user, int $id): Schedule
    {
        return Schedule::whereHas('socialAccount', fn ($q) => $q->whereIn('workspace_id', $this->workspaceIds($user)))
            ->with(['contentProject', 'socialAccount'])
            ->findOrFail($id);
    }

    public function present(Schedule $s): array
    {
        $data = $s->contentProject->script_data ?? [];

        return [
            'id' => $s->id,
            'group_id' => $s->group_id,
            'status' => $s->status->value,
            'publish_at' => $s->publish_at->toISOString(),
            'error_log' => $s->error_log,
            'platform_post_id' => $s->platform_post_id,
            'content_project_id' => $s->content_project_id,
            'title' => $s->contentProject->title,
            'caption' => (string) ($data['caption'] ?? ''),
            'social_account' => [
                'id' => $s->socialAccount->id,
                'provider' => $s->socialAccount->provider,
                'handle' => $s->socialAccount->handle,
            ],
        ];
    }

    /**
     * SSRF-safe download of an image URL.
     * Returns ['binary' => string, 'extension' => string].
     */
    private function downloadImage(string $url, int $index): array
    {
        $parts = parse_url($url);

        if (! isset($parts['scheme'], $parts['host']) || $parts['scheme'] !== 'https') {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: only HTTPS URLs are allowed."]);
        }

        $host = $parts['host'];
        $ip = $this->publicIpFor($host);

        if ($ip === null) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: host IP is not public."]);
        }

        $maxBytes = self::MAX_IMAGE_BYTES;

        try {
            $response = Http::timeout(30)
                ->withOptions([
                    'allow_redirects' => false,
                    // Connect to the IP we checked, so DNS can't change between check and download.
                    'curl' => [CURLOPT_RESOLVE => ["{$host}:".($parts['port'] ?? 443).":{$ip}"]],
                    'progress' => function ($total, $downloaded) use ($maxBytes): void {
                        if ($total > $maxBytes || $downloaded > $maxBytes) {
                            throw new \RuntimeException('too large');
                        }
                    },
                ])
                ->get($url);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: download failed or file exceeds 20 MB."]);
        }

        if (! $response->successful()) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: download failed with status {$response->status()}."]);
        }

        $body = $response->body();

        if (strlen($body) > self::MAX_IMAGE_BYTES) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: file exceeds 20 MB."]);
        }

        $info = @getimagesizefromstring($body);

        if ($info === false) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: not a valid image."]);
        }

        $mime = $info['mime'] ?? '';

        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        if (! isset($extensions[$mime])) {
            throw ValidationException::withMessages(['image_urls' => "Could not use image {$index}: unsupported mime type {$mime}."]);
        }

        return [
            'binary' => $body,
            'extension' => $extensions[$mime],
        ];
    }

    /**
     * The first IPv4 address of the host, or null when any of its addresses is
     * private or reserved. Protected so tests can skip real DNS.
     */
    protected function publicIpFor(string $host): ?string
    {
        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);

        if ($ips === []) {
            return null;
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return null;
            }
        }

        return $ips[0];
    }

    private function newFolder(SocialAccount $account): string
    {
        return "api/{$account->workspace_id}/".Str::uuid();
    }

    /**
     * Instagram gets the public image URLs (carousel needs 2+), TikTok reads the stored paths.
     *
     * @param  string[]  $paths
     */
    private function createContentProject(SocialAccount $account, array $paths, ?string $caption, ?string $title): ContentProject
    {
        $disk = Storage::disk(config('filesystems.media_disk'));
        $urls = array_map(fn (string $path): string => url($disk->url($path)), $paths);
        $single = count($paths) === 1 && $account->provider === 'instagram';

        return ContentProject::create([
            'workspace_id' => $account->workspace_id,
            'title' => $title ?? Str::limit((string) ($caption ?? ''), 80) ?: 'Untitled',
            'type' => $single ? 'image' : 'carousel',
            'status' => 'ready',
            'script_data' => array_filter([
                'caption' => $caption ?? '',
                'slides' => array_map(fn (string $path): array => ['path' => $path], $paths),
                'image_urls' => $urls,
                'image_url' => $single ? $urls[0] : null,
            ], fn ($value) => $value !== null),
        ]);
    }

    private function schedule(SocialAccount $account, ContentProject $project, string $publishAt): Schedule
    {
        $schedule = Schedule::create([
            'content_project_id' => $project->id,
            'social_account_id' => $account->id,
            'publish_at' => Carbon::parse($publishAt)->utc(),
            'status' => ScheduleStatus::Pending,
        ]);

        return $schedule->load(['contentProject', 'socialAccount']);
    }
}
