<?php

namespace App\Http\Controllers\Api;

use App\Enums\ScheduleStatus;
use App\Http\Controllers\Controller;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A "post" is a ContentProject with its Schedule: the same pair the calendar shows.
 */
class PostController extends Controller
{
    public function accounts(Request $request): JsonResponse
    {
        $accounts = SocialAccount::whereIn('workspace_id', $this->workspaceIds($request))
            ->get(['id', 'workspace_id', 'provider', 'handle']);

        return response()->json(['data' => $accounts]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', 'string'],
        ]);

        $schedules = $this->schedules($request)
            ->with(['contentProject', 'socialAccount'])
            ->when($validated['from'] ?? null, fn ($q, $from) => $q->where('publish_at', '>=', Carbon::parse($from)))
            ->when($validated['to'] ?? null, fn ($q, $to) => $q->where('publish_at', '<=', Carbon::parse($to)))
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderBy('publish_at')
            ->limit(500)
            ->get();

        return response()->json(['data' => $schedules->map(fn (Schedule $s) => $this->present($s))]);
    }

    /**
     * Upload the images, create the post and schedule it. Instagram gets the
     * public image URLs (carousel needs 2+), TikTok reads the stored paths.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
            'publish_at' => ['required', 'date', 'after:now'],
            'caption' => ['nullable', 'string', 'max:5000'],
            'title' => ['nullable', 'string', 'max:255'],
            'images' => ['required', 'array', 'min:1', 'max:35'],
            'images.*' => ['file', 'image', 'max:20480'],
        ]);

        $account = SocialAccount::whereIn('workspace_id', $this->workspaceIds($request))
            ->findOrFail($validated['social_account_id']);

        $disk = Storage::disk(config('filesystems.media_disk'));
        $folder = "api/{$account->workspace_id}/".Str::uuid();

        $paths = [];
        foreach ($validated['images'] as $i => $file) {
            $paths[] = $disk->putFileAs($folder, $file, sprintf('%02d.%s', $i + 1, $file->extension()), 'public');
        }

        $urls = array_map(fn (string $path): string => url($disk->url($path)), $paths);
        $single = count($paths) === 1 && $account->provider === 'instagram';

        $project = ContentProject::create([
            'workspace_id' => $account->workspace_id,
            'title' => $validated['title'] ?? Str::limit((string) ($validated['caption'] ?? ''), 80) ?: 'Untitled',
            'type' => $single ? 'image' : 'carousel',
            'status' => 'ready',
            'script_data' => array_filter([
                'caption' => $validated['caption'] ?? '',
                'slides' => array_map(fn (string $path): array => ['path' => $path], $paths),
                'image_urls' => $urls,
                'image_url' => $single ? $urls[0] : null,
            ], fn ($value) => $value !== null),
        ]);

        $schedule = Schedule::create([
            'content_project_id' => $project->id,
            'social_account_id' => $account->id,
            'publish_at' => Carbon::parse($validated['publish_at']),
            'status' => ScheduleStatus::Pending,
        ]);

        return response()->json(['data' => $this->present($schedule->load(['contentProject', 'socialAccount']))], 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeSchedule($request, $schedule);

        abort_unless(in_array($schedule->status, [ScheduleStatus::Pending, ScheduleStatus::Failed], true), 422, 'Only pending or failed posts can be changed.');

        $validated = $request->validate([
            'publish_at' => ['sometimes', 'date', 'after:now'],
            'caption' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'title' => ['sometimes', 'string', 'max:255'],
        ]);

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
            // A failed post that gets a new time goes back to the queue.
            $schedule->update([
                'publish_at' => Carbon::parse($validated['publish_at']),
                'status' => ScheduleStatus::Pending,
                'error_log' => null,
            ]);
        }

        return response()->json(['data' => $this->present($schedule->fresh(['contentProject', 'socialAccount']))]);
    }

    public function duplicate(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeSchedule($request, $schedule);

        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $copy = Schedule::create([
            'content_project_id' => $schedule->content_project_id,
            'social_account_id' => $schedule->social_account_id,
            'publish_at' => Carbon::parse($validated['publish_at']),
            'status' => ScheduleStatus::Pending,
        ]);

        return response()->json(['data' => $this->present($copy->load(['contentProject', 'socialAccount']))], 201);
    }

    public function destroy(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeSchedule($request, $schedule);

        abort_if($schedule->status === ScheduleStatus::Publishing, 422, 'This post is being published right now.');

        $schedule->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Schedule $s): array
    {
        $data = $s->contentProject->script_data ?? [];

        return [
            'id' => $s->id,
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

    private function schedules(Request $request)
    {
        $workspaceIds = $this->workspaceIds($request);

        return Schedule::whereHas('socialAccount', fn ($q) => $q->whereIn('workspace_id', $workspaceIds));
    }

    private function authorizeSchedule(Request $request, Schedule $schedule): void
    {
        abort_unless($this->workspaceIds($request)->contains($schedule->socialAccount->workspace_id), 403);
    }

    private function workspaceIds(Request $request): Collection
    {
        return Workspace::where('owner_id', $request->user()->id)->pluck('id');
    }
}
