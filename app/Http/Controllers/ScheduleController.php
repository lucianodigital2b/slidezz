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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'content_project_id' => ['required', 'integer'],
            'social_account_id' => ['required', 'integer'],
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        $contentProject = ContentProject::whereIn('workspace_id', $workspaceIds)
            ->findOrFail($validated['content_project_id']);

        $socialAccount = SocialAccount::whereIn('workspace_id', $workspaceIds)
            ->findOrFail($validated['social_account_id']);

        Schedule::create([
            'content_project_id' => $contentProject->id,
            'social_account_id' => $socialAccount->id,
            'publish_at' => $validated['publish_at'],
            'status' => ScheduleStatus::Pending,
        ]);

        return redirect()->route('schedule')
            ->with('success', 'Post scheduled successfully.');
    }

    public function update(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        abort_unless(in_array($schedule->status, [ScheduleStatus::Pending, ScheduleStatus::Failed], true), 422, 'Only pending or failed posts can be moved.');

        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        // Moving a failed post re-queues it for the new time.
        $schedule->update([
            'publish_at' => Carbon::parse($validated['publish_at'])->utc(),
            'status' => ScheduleStatus::Pending,
            'error_log' => null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post moved.']);

        return back();
    }

    public function duplicate(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        Schedule::create([
            'content_project_id' => $schedule->content_project_id,
            'social_account_id' => $schedule->social_account_id,
            'publish_at' => Carbon::parse($validated['publish_at'])->utc(),
            'status' => ScheduleStatus::Pending,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post duplicated.']);

        return back();
    }

    public function destroy(Request $request, Schedule $schedule): RedirectResponse
    {
        $this->authorizeWorkspace($request, $schedule);

        abort_if($schedule->status === ScheduleStatus::Publishing, 422, 'This post is being published right now.');

        $schedule->delete();

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
}
