<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');
        $period = $request->integer('period', 30);

        $published = Schedule::whereHas(
            'socialAccount',
            fn ($q) => $q->whereIn('workspace_id', $workspaceIds)
        )
            ->where('status', ScheduleStatus::Published)
            ->where('publish_at', '>=', now()->subDays($period))
            ->with(['contentProject', 'socialAccount', 'postAnalytic'])
            ->latest('publish_at')
            ->get();

        $totalViews = $published->sum(fn (Schedule $s) => $s->postAnalytic?->views ?? 0);
        $totalLikes = $published->sum(fn (Schedule $s) => $s->postAnalytic?->likes ?? 0);
        $totalComments = $published->sum(fn (Schedule $s) => $s->postAnalytic?->comments ?? 0);
        $totalShares = $published->sum(fn (Schedule $s) => $s->postAnalytic?->shares ?? 0);

        $avgEngagementRate = $totalViews > 0
            ? round(($totalLikes + $totalComments + $totalShares) / $totalViews * 100, 2)
            : 0;

        $stats = [
            'total_views' => $totalViews,
            'total_likes' => $totalLikes,
            'total_comments' => $totalComments,
            'avg_engagement_rate' => $avgEngagementRate,
        ];

        $posts = $published->map(fn (Schedule $s) => [
            'id' => $s->id,
            'title' => $s->contentProject->title,
            'platform' => $s->socialAccount->provider,
            'handle' => $s->socialAccount->handle,
            'avatar' => $s->socialAccount->avatar,
            'published_at' => $s->publish_at->toISOString(),
            'views' => $s->postAnalytic?->views ?? 0,
            'likes' => $s->postAnalytic?->likes ?? 0,
            'comments' => $s->postAnalytic?->comments ?? 0,
            'shares' => $s->postAnalytic?->shares ?? 0,
            'bookmarks' => $s->postAnalytic?->bookmarks ?? 0,
            'engagement_rate' => $s->postAnalytic && $s->postAnalytic->views > 0
                ? round(
                    ($s->postAnalytic->likes + $s->postAnalytic->comments + $s->postAnalytic->shares)
                    / $s->postAnalytic->views * 100,
                    2
                )
                : 0,
            'last_synced_at' => $s->postAnalytic?->last_synced_at?->toISOString(),
        ]);

        return Inertia::render('Analytics', [
            'stats' => $stats,
            'posts' => $posts,
            'period' => $period,
        ]);
    }

    public function sync(Request $request): RedirectResponse
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        $count = Schedule::whereHas(
            'socialAccount',
            fn ($q) => $q->whereIn('workspace_id', $workspaceIds)
        )
            ->where('status', ScheduleStatus::Published)
            ->whereNotNull('platform_post_id')
            ->with('socialAccount')
            ->get()
            ->each(fn (Schedule $s) => SyncPostAnalytics::dispatch($s))
            ->count();

        return redirect()->route('analytics')
            ->with('success', "Sincronizando analytics de {$count} publicações.");
    }
}
