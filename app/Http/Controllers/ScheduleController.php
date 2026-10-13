<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $timezone = $this->viewerTimezone($request);
        $month = $request->integer('month', now($timezone)->month);
        $year = $request->integer('year', now($timezone)->year);

        // The month and its days are the viewer's, not UTC's: a post at 21h in
        // São Paulo is 00h UTC on the next day and must stay on its own day.
        $monthStart = Carbon::create($year, $month, 1, 0, 0, 0, $timezone);

        $workspaceIds = Workspace::where('owner_id', $user->id)->pluck('id');

        $schedulesByDay = Schedule::whereHas(
            'socialAccount',
            fn ($q) => $q->whereIn('workspace_id', $workspaceIds)
        )
            ->with(['contentProject', 'socialAccount'])
            ->where('publish_at', '>=', $monthStart->copy()->utc())
            ->where('publish_at', '<', $monthStart->copy()->addMonth()->utc())
            ->get()
            ->groupBy(fn (Schedule $s) => $s->publish_at->copy()->setTimezone($timezone)->day)
            ->map(fn ($group) => $group->map(function (Schedule $s) {
                $title = $s->contentProject->title;
                if (empty($title) || $title === 'Untitled') {
                    $title = $s->contentProject->script_data['caption'] ?? 'Untitled';
                    if (empty($title)) {
                        $title = 'Untitled';
                    }
                }

                $data = $s->contentProject->script_data ?? [];
                $paths = array_filter(array_column((array) ($data['slides'] ?? []), 'path'));
                $disk = Storage::disk(config('filesystems.media_disk'));

                return [
                    'id' => $s->id,
                    'group_id' => $s->group_id,
                    'status' => $s->status->value,
                    'publish_at' => $s->publish_at->toISOString(),
                    'error_log' => $s->error_log,
                    'content_project' => [
                        'id' => $s->contentProject->id,
                        'title' => Str::limit($title, 100),
                        'video_url' => $s->contentProject->video_url,
                        'caption' => (string) ($data['caption'] ?? ''),
                        // Same precedence as the publishers: rendered slides first, then uploaded URLs.
                        'images' => $paths !== []
                            ? array_values(array_map(fn (string $path): string => url($disk->url($path)), $paths))
                            : array_values(array_filter((array) ($data['image_urls'] ?? []))),
                    ],
                    'social_account' => [
                        'id' => $s->socialAccount->id,
                        'handle' => $s->socialAccount->handle,
                        'provider' => $s->socialAccount->provider,
                        'avatar' => $s->socialAccount->avatar,
                    ],
                ];
            })->values());

        $socialAccounts = SocialAccount::whereIn('workspace_id', $workspaceIds)
            ->where('provider', 'tiktok')
            ->get(['id', 'handle', 'provider', 'avatar']);

        $contentProjects = ContentProject::whereIn('workspace_id', $workspaceIds)
            ->whereIn('status', ['ready', 'drafting'])
            ->latest()
            ->get(['id', 'title', 'type', 'video_url', 'script_data'])
            ->map(function ($cp) {
                $title = $cp->title;
                if (empty($title) || $title === 'Untitled') {
                    $title = $cp->script_data['caption'] ?? 'Untitled';
                    if (empty($title)) {
                        $title = 'Untitled';
                    }
                }

                return [
                    'id' => $cp->id,
                    'title' => Str::limit($title, 100),
                    'type' => $cp->type,
                    'video_url' => $cp->video_url,
                ];
            });

        $counts = [
            'queue' => Schedule::whereHas('socialAccount', fn ($q) => $q->whereIn('workspace_id', $workspaceIds))
                ->whereIn('status', [ScheduleStatus::Pending->value, ScheduleStatus::Publishing->value])
                ->count(),
            'drafts' => ContentProject::whereIn('workspace_id', $workspaceIds)
                ->where('status', 'drafting')
                ->count(),
            'sent' => Schedule::whereHas('socialAccount', fn ($q) => $q->whereIn('workspace_id', $workspaceIds))
                ->where('status', ScheduleStatus::Published->value)
                ->count(),
        ];

        return Inertia::render('Schedule', [
            'schedulesByDay' => $schedulesByDay,
            'socialAccounts' => $socialAccounts,
            'contentProjects' => $contentProjects,
            'month' => $month,
            'year' => $year,
            'statuses' => array_column(ScheduleStatus::cases(), 'value'),
            'counts' => $counts,
        ]);
    }

    /**
     * Schedule one post to one or more accounts: one row per account, all in the
     * same group so the calendar shows and edits them as a single post.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'content_project_id' => ['required', 'integer'],
            'social_account_ids' => ['required', 'array', 'min:1'],
            'social_account_ids.*' => ['required', 'integer', 'distinct'],
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        $contentProject = ContentProject::whereIn('workspace_id', $workspaceIds)
            ->findOrFail($validated['content_project_id']);

        $accounts = $this->workspaceAccounts($workspaceIds, $validated['social_account_ids']);
        $groupId = (string) Str::uuid();
        $publishAt = Carbon::parse($validated['publish_at'])->utc();

        DB::transaction(function () use ($accounts, $groupId, $contentProject, $publishAt) {
            foreach ($accounts as $account) {
                Schedule::create([
                    'group_id' => $groupId,
                    'content_project_id' => $contentProject->id,
                    'social_account_id' => $account->id,
                    'publish_at' => $publishAt,
                    'status' => ScheduleStatus::Pending,
                ]);
            }
        });

        return redirect()->route('schedule')
            ->with('success', 'Post scheduled successfully.');
    }

    /**
     * Change the time and/or the accounts of a scheduled post. Acts on the whole
     * group; when some accounts already published it, only the pending or failed
     * ones move, and they split off into a group of their own.
     */
    public function update(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        $members = $schedule->group()->get();
        $movable = $members->filter(fn (Schedule $s) => $s->isMovable());

        abort_if($movable->isEmpty(), 422, 'Only pending or failed posts can be moved.');

        $validated = $request->validate([
            'publish_at' => ['sometimes', 'date', 'after:now'],
            'social_account_ids' => ['sometimes', 'array', 'min:1'],
            'social_account_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $accounts = null;
        if (isset($validated['social_account_ids'])) {
            abort_if($movable->count() !== $members->count(), 422, 'This post already went out on some accounts. Duplicate it to pick other accounts.');

            $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');
            $accounts = $this->workspaceAccounts($workspaceIds, $validated['social_account_ids']);
        }

        $publishAt = isset($validated['publish_at'])
            ? Carbon::parse($validated['publish_at'])->utc()
            : $movable->first()->publish_at;

        if ($accounts !== null && $publishAt->isPast()) {
            throw ValidationException::withMessages(['publish_at' => 'Pick a future time to change the accounts.']);
        }

        $groupId = $movable->count() === $members->count() ? $schedule->group_id : (string) Str::uuid();

        DB::transaction(function () use ($movable, $accounts, $groupId, $publishAt, $validated, $schedule) {
            foreach ($movable as $member) {
                $member->group_id = $groupId;
                if (isset($validated['publish_at'])) {
                    // Moving a failed post re-queues it for the new time.
                    $member->publish_at = $publishAt;
                    $member->status = ScheduleStatus::Pending;
                    $member->error_log = null;
                }
                $member->save();
            }

            if ($accounts === null) {
                return;
            }

            $movable->whereNotIn('social_account_id', $accounts->pluck('id'))->each->delete();

            foreach ($accounts->whereNotIn('id', $movable->pluck('social_account_id')) as $account) {
                Schedule::create([
                    'group_id' => $groupId,
                    'content_project_id' => $schedule->content_project_id,
                    'social_account_id' => $account->id,
                    'publish_at' => $publishAt,
                    'status' => ScheduleStatus::Pending,
                ]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post updated.']);

        return back();
    }

    /**
     * Copy the post, with all its accounts, to a new time.
     */
    public function duplicate(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $groupId = (string) Str::uuid();
        $publishAt = Carbon::parse($validated['publish_at'])->utc();

        DB::transaction(function () use ($schedule, $groupId, $publishAt) {
            foreach ($schedule->group()->get() as $member) {
                Schedule::create([
                    'group_id' => $groupId,
                    'content_project_id' => $member->content_project_id,
                    'social_account_id' => $member->social_account_id,
                    'publish_at' => $publishAt,
                    'status' => ScheduleStatus::Pending,
                ]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post duplicated.']);

        return back();
    }

    /**
     * Delete the post on every account, except the ones being published right now.
     */
    public function destroy(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        $deletable = $schedule->group()->get()
            ->reject(fn (Schedule $s) => $s->status === ScheduleStatus::Publishing);

        abort_if($deletable->isEmpty(), 422, 'This post is being published right now.');

        $deletable->each->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post deleted.']);

        return back();
    }

    /**
     * The browser's timezone, sent in the tz cookie (set in app.tsx). Falls back
     * to the app timezone when the cookie is missing or not a valid zone.
     */
    private function viewerTimezone(Request $request): string
    {
        $timezone = (string) $request->cookie('tz');

        return in_array($timezone, timezone_identifiers_list(\DateTimeZone::ALL_WITH_BC), true)
            ? $timezone
            : config('app.timezone');
    }

    private function authorizeWorkspace(Request $request, Schedule $schedule): void
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        abort_unless($workspaceIds->contains($schedule->socialAccount->workspace_id), 403);
    }

    /**
     * The requested accounts, all of which must belong to the user's workspaces.
     *
     * @param  Collection<int, int>  $workspaceIds
     * @param  array<int, int|string>  $ids
     * @return \Illuminate\Database\Eloquent\Collection<int, SocialAccount>
     */
    private function workspaceAccounts(Collection $workspaceIds, array $ids): Collection
    {
        $accounts = SocialAccount::whereIn('workspace_id', $workspaceIds)
            ->whereIn('id', $ids)
            ->get();

        abort_if($accounts->count() !== count($ids), 404);

        return $accounts;
    }
}
