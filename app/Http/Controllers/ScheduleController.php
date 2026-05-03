<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $month = $request->integer('month', now()->month);
        $year = $request->integer('year', now()->year);

        $workspaceIds = Workspace::where('owner_id', $user->id)->pluck('id');

        $schedulesByDay = Schedule::whereHas(
            'socialAccount',
            fn ($q) => $q->whereIn('workspace_id', $workspaceIds)
        )
            ->with(['contentProject', 'socialAccount'])
            ->whereYear('publish_at', $year)
            ->whereMonth('publish_at', $month)
            ->get()
            ->groupBy(fn (Schedule $s) => $s->publish_at->day)
            ->map(fn ($group) => $group->map(function (Schedule $s) {
                $title = $s->contentProject->title;
                if (empty($title) || $title === 'Untitled') {
                    $title = $s->contentProject->script_data['caption'] ?? 'Untitled';
                    if (empty($title)) {
                        $title = 'Untitled';
                    }
                }

                return [
                    'id' => $s->id,
                    'status' => $s->status->value,
                    'publish_at' => $s->publish_at->toISOString(),
                    'error_log' => $s->error_log,
                    'content_project' => [
                        'id' => $s->contentProject->id,
                        'title' => Str::limit($title, 100),
                        'video_url' => $s->contentProject->video_url,
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
}
