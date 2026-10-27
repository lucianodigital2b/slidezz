<?php

namespace App\Services\Ugc;

use App\Models\TrackedVideo;
use App\Models\TrackedVideoSnapshot;
use App\Models\UgcCampaign;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Assembles the payload the UGC tracker screens render: KPI tiles, a views-over-time
 * series, a platform split, and leaderboards. All money is in integer cents of the
 * campaign currency; the frontend formats it.
 */
class UgcDashboard
{
    /**
     * Overview across every campaign in a workspace.
     *
     * @return array<string, mixed>
     */
    public function overview(int $workspaceId, int $days): array
    {
        $campaigns = UgcCampaign::where('workspace_id', $workspaceId)
            ->with(['videos.creator'])
            ->orderByDesc('created_at')
            ->get();

        $videos = $campaigns->flatMap->videos;

        return [
            'kpis' => $this->kpis($campaigns, $videos),
            'timeseries' => $this->viewsOverTime($videos, $days),
            'platforms' => $this->platformSplit($videos),
            'topVideos' => $this->topVideos($videos, 8),
            'campaigns' => $campaigns->map(fn (UgcCampaign $c) => $this->campaignCard($c))->all(),
        ];
    }

    /**
     * Everything one campaign's detail screen needs.
     *
     * @return array<string, mixed>
     */
    public function forCampaign(UgcCampaign $campaign, int $days): array
    {
        $campaign->loadMissing(['videos.creator']);
        $videos = $campaign->videos;
        $single = collect([$campaign]);

        return [
            'kpis' => $this->kpis($single, $videos, $campaign),
            'timeseries' => $this->viewsOverTime($videos, $days),
            'platforms' => $this->platformSplit($videos),
            'creators' => $this->creatorLeaderboard($campaign, $videos),
            'videos' => $videos
                ->sortByDesc('views')
                ->values()
                ->map(fn (TrackedVideo $v) => $this->videoRow($campaign, $v))
                ->all(),
        ];
    }

    /**
     * @param  Collection<int, UgcCampaign>  $campaigns
     * @param  Collection<int, TrackedVideo>  $videos
     * @return array<string, int|float>
     */
    private function kpis(Collection $campaigns, Collection $videos, ?UgcCampaign $campaign = null): array
    {
        $views = (int) $videos->sum('views');
        $likes = (int) $videos->sum('likes');
        $comments = (int) $videos->sum('comments');
        $shares = (int) $videos->sum('shares');

        $spend = $videos->sum(fn (TrackedVideo $v) => ($campaign ?? $v->campaign)->payoutForCents($v));

        return [
            'campaigns' => $campaigns->count(),
            'videos' => $videos->count(),
            'creators' => $videos->pluck('ugc_creator_id')->filter()->unique()->count(),
            'views' => $views,
            'likes' => $likes,
            'comments' => $comments,
            'shares' => $shares,
            'engagement_rate' => $views > 0 ? round(($likes + $comments + $shares) / $views * 100, 2) : 0,
            'spend_cents' => (int) $spend,
            // Blended CPM actually paid: spend per 1000 views.
            'effective_cpm_cents' => $views > 0 ? (int) round($spend / $views * 1000) : 0,
        ];
    }

    /**
     * Total known views per day over the window. For each day we sum, across all
     * videos, the newest snapshot captured on or before that day, so the line is
     * cumulative reach rather than a daily delta.
     *
     * @param  Collection<int, TrackedVideo>  $videos
     * @return list<array{date: string, views: int}>
     */
    private function viewsOverTime(Collection $videos, int $days): array
    {
        $end = CarbonImmutable::now()->endOfDay();
        $start = $end->subDays($days - 1)->startOfDay();

        $ids = $videos->pluck('id');
        if ($ids->isEmpty()) {
            return $this->emptySeries($start, $end);
        }

        // Snapshots grouped by video, oldest first, so we can walk each day.
        $snapshots = TrackedVideoSnapshot::whereIn('tracked_video_id', $ids)
            ->where('captured_at', '<=', $end)
            ->orderBy('captured_at')
            ->get(['tracked_video_id', 'views', 'captured_at'])
            ->groupBy('tracked_video_id');

        $series = [];
        for ($day = $start; $day <= $end; $day = $day->addDay()) {
            $dayEnd = $day->endOfDay();
            $total = 0;

            foreach ($snapshots as $videoSnaps) {
                $latest = null;
                foreach ($videoSnaps as $snap) {
                    if ($snap->captured_at <= $dayEnd) {
                        $latest = $snap->views;
                    } else {
                        break;
                    }
                }
                $total += (int) $latest;
            }

            $series[] = ['date' => $day->toDateString(), 'views' => $total];
        }

        return $series;
    }

    /**
     * @return list<array{date: string, views: int}>
     */
    private function emptySeries(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $series = [];
        for ($day = $start; $day <= $end; $day = $day->addDay()) {
            $series[] = ['date' => $day->toDateString(), 'views' => 0];
        }

        return $series;
    }

    /**
     * @param  Collection<int, TrackedVideo>  $videos
     * @return list<array{platform: string, videos: int, views: int}>
     */
    private function platformSplit(Collection $videos): array
    {
        return $videos->groupBy('platform')
            ->map(fn (Collection $group, string $platform) => [
                'platform' => $platform,
                'videos' => $group->count(),
                'views' => (int) $group->sum('views'),
            ])
            ->sortByDesc('views')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, TrackedVideo>  $videos
     * @return list<array<string, mixed>>
     */
    private function topVideos(Collection $videos, int $limit): array
    {
        return $videos->sortByDesc('views')
            ->take($limit)
            ->values()
            ->map(fn (TrackedVideo $v) => [
                'id' => $v->id,
                'platform' => $v->platform,
                'url' => $v->url,
                'thumbnail_url' => $v->thumbnail_url,
                'author_handle' => $v->author_handle,
                'creator' => $v->creator?->name,
                'views' => $v->views,
                'engagement_rate' => $v->engagementRate(),
            ])
            ->all();
    }

    /**
     * @param  Collection<int, TrackedVideo>  $videos
     * @return list<array<string, mixed>>
     */
    private function creatorLeaderboard(UgcCampaign $campaign, Collection $videos): array
    {
        return $videos->groupBy('ugc_creator_id')
            ->map(function (Collection $group) use ($campaign) {
                $creator = $group->first()->creator;

                return [
                    'id' => $creator?->id,
                    'name' => $creator?->name ?? 'Sem criadora',
                    'handle' => $creator?->handle,
                    'avatar' => $creator?->avatar,
                    'videos' => $group->count(),
                    'views' => (int) $group->sum('views'),
                    'spend_cents' => (int) $group->sum(fn (TrackedVideo $v) => $campaign->payoutForCents($v)),
                ];
            })
            ->sortByDesc('views')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function videoRow(UgcCampaign $campaign, TrackedVideo $v): array
    {
        return [
            'id' => $v->id,
            'platform' => $v->platform,
            'url' => $v->url,
            'thumbnail_url' => $v->thumbnail_url,
            'caption' => $v->caption,
            'author_handle' => $v->author_handle,
            'creator' => $v->creator?->name,
            'creator_id' => $v->ugc_creator_id,
            'posted_at' => $v->posted_at?->toISOString(),
            'views' => $v->views,
            'likes' => $v->likes,
            'comments' => $v->comments,
            'shares' => $v->shares,
            'bookmarks' => $v->bookmarks,
            'engagement_rate' => $v->engagementRate(),
            'fetch_status' => $v->fetch_status,
            'last_synced_at' => $v->last_synced_at?->toISOString(),
            'payout_cents' => $campaign->payoutForCents($v),
            'payout_override_cents' => $v->payout_override_cents,
            'paid' => $v->paid_at !== null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function campaignCard(UgcCampaign $c): array
    {
        $videos = $c->videos;
        $views = (int) $videos->sum('views');
        $spend = (int) $videos->sum(fn (TrackedVideo $v) => $c->payoutForCents($v));

        return [
            'id' => $c->id,
            'name' => $c->name,
            'status' => $c->status->value,
            'color' => $c->color,
            'currency' => $c->currency,
            'videos' => $videos->count(),
            'creators' => $videos->pluck('ugc_creator_id')->filter()->unique()->count(),
            'views' => $views,
            'spend_cents' => $spend,
            'budget_cents' => $c->budget_cents,
        ];
    }
}
