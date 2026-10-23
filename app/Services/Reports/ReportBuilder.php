<?php

namespace App\Services\Reports;

use App\Enums\ScheduleStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Assembles a Metricool-style report payload for a date range: overall totals
 * with a comparison to the preceding period, a per-platform breakdown, and a
 * top-posts table per network.
 *
 * Only the networks that actually publish through Slidezz (Instagram, TikTok)
 * carry data; the report format leaves room for the rest as they are added.
 */
class ReportBuilder
{
    /** Networks that publish through Slidezz today. */
    public const PLATFORMS = ['instagram', 'tiktok'];

    /** (likes + comments + shares) / views as a percentage, 0 when there are no views. */
    private const ENGAGEMENT_SQL = 'COALESCE(ROUND((COALESCE(pa.likes,0)+COALESCE(pa.comments,0)+COALESCE(pa.shares,0))*100.0/NULLIF(pa.views,0),2),0)';

    /** "Sort by" key => how the posts table is ordered. */
    public const SORT_COLUMNS = [
        'views' => 'pa.views',
        'likes' => 'pa.likes',
        'comments' => 'pa.comments',
        'shares' => 'pa.shares',
        'engagement_rate' => self::ENGAGEMENT_SQL,
        'date' => 's.publish_at',
    ];

    /**
     * @param  array<string, array{enabled?: bool, sort?: string, max_rows?: int}>  $config
     * @return array<string, mixed>
     */
    public function build(int $userId, CarbonImmutable $start, CarbonImmutable $end, array $config): array
    {
        // Previous window: the same length immediately before the current one.
        $length = $end->getTimestamp() - $start->getTimestamp();
        $prevEnd = $start->subSecond();
        $prevStart = $prevEnd->subSeconds($length);

        $current = $this->totals($userId, $start, $end);
        $previous = $this->totals($userId, $prevStart, $prevEnd);

        $platforms = [];
        foreach (self::PLATFORMS as $platform) {
            $section = $config[$platform] ?? [];
            $platforms[$platform] = [
                'totals' => $this->totals($userId, $start, $end, $platform),
                'deltas' => $this->deltas(
                    $this->totals($userId, $start, $end, $platform),
                    $this->totals($userId, $prevStart, $prevEnd, $platform),
                ),
                'posts' => $this->posts(
                    $userId,
                    $start,
                    $end,
                    $platform,
                    $section['sort'] ?? 'likes',
                    (int) ($section['max_rows'] ?? 20),
                ),
            ];
        }

        return [
            'period' => $this->periodMeta($start, $end),
            'comparison' => $this->periodMeta($prevStart, $prevEnd),
            'summary' => [
                'current' => $current,
                'deltas' => $this->deltas($current, $previous),
                'by_platform' => array_map(fn (array $p) => $p['totals'], $platforms),
            ],
            'platforms' => $platforms,
        ];
    }

    /**
     * Totals summed by the database in one pass, optionally for a single platform.
     *
     * @return array<string, int|float>
     */
    private function totals(int $userId, CarbonImmutable $start, CarbonImmutable $end, ?string $platform = null): array
    {
        $row = $this->publishedQuery($userId, $start, $end, $platform)
            ->selectRaw('COUNT(*) AS posts')
            ->selectRaw('COALESCE(SUM(pa.views),0) AS views')
            ->selectRaw('COALESCE(SUM(pa.likes),0) AS likes')
            ->selectRaw('COALESCE(SUM(pa.comments),0) AS comments')
            ->selectRaw('COALESCE(SUM(pa.shares),0) AS shares')
            ->first();

        $views = (int) ($row->views ?? 0);
        $likes = (int) ($row->likes ?? 0);
        $comments = (int) ($row->comments ?? 0);
        $shares = (int) ($row->shares ?? 0);

        return [
            'posts' => (int) ($row->posts ?? 0),
            'views' => $views,
            'likes' => $likes,
            'comments' => $comments,
            'shares' => $shares,
            'engagement_rate' => $views > 0 ? round(($likes + $comments + $shares) / $views * 100, 2) : 0,
        ];
    }

    /**
     * Top posts for one platform, ordered by the chosen metric.
     *
     * @return list<array<string, mixed>>
     */
    private function posts(int $userId, CarbonImmutable $start, CarbonImmutable $end, string $platform, string $sort, int $limit): array
    {
        $limit = max(1, min($limit, 100));
        $order = self::SORT_COLUMNS[$sort] ?? self::SORT_COLUMNS['likes'];

        return $this->publishedQuery($userId, $start, $end, $platform)
            ->join('content_projects as cp', 'cp.id', '=', 's.content_project_id')
            ->select(['s.id', 'cp.title', 'sa.handle', 'sa.avatar', 's.publish_at', 'pa.last_synced_at'])
            ->selectRaw('COALESCE(pa.views,0) AS views')
            ->selectRaw('COALESCE(pa.likes,0) AS likes')
            ->selectRaw('COALESCE(pa.comments,0) AS comments')
            ->selectRaw('COALESCE(pa.shares,0) AS shares')
            ->selectRaw('COALESCE(pa.bookmarks,0) AS bookmarks')
            ->selectRaw(self::ENGAGEMENT_SQL.' AS engagement_rate')
            ->orderByRaw($order.' DESC')
            ->limit($limit)
            ->get()
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'title' => $row->title,
                'handle' => $row->handle,
                'avatar' => $row->avatar,
                'published_at' => Carbon::parse($row->publish_at)->toISOString(),
                'views' => (int) $row->views,
                'likes' => (int) $row->likes,
                'comments' => (int) $row->comments,
                'shares' => (int) $row->shares,
                'bookmarks' => (int) $row->bookmarks,
                'engagement_rate' => (float) $row->engagement_rate,
                'synced' => $row->last_synced_at !== null,
            ])
            ->all();
    }

    /**
     * Published schedules of the user's workspaces within [start, end], with their
     * analytics row (if any) joined as `pa`.
     */
    private function publishedQuery(int $userId, CarbonImmutable $start, CarbonImmutable $end, ?string $platform = null): Builder
    {
        $query = DB::table('schedules as s')
            ->join('social_accounts as sa', 'sa.id', '=', 's.social_account_id')
            ->leftJoin('post_analytics as pa', 'pa.schedule_id', '=', 's.id')
            ->whereIn('sa.workspace_id', DB::table('workspaces')->select('id')->where('owner_id', $userId))
            ->where('s.status', ScheduleStatus::Published->value)
            ->whereBetween('s.publish_at', [$start->toDateTimeString(), $end->toDateTimeString()]);

        if ($platform !== null) {
            $query->where('sa.provider', $platform);
        }

        return $query;
    }

    /**
     * Percent change of each metric vs. the previous period. `null` means there
     * was no baseline (nothing in the previous period) so no percentage applies.
     *
     * @param  array<string, int|float>  $current
     * @param  array<string, int|float>  $previous
     * @return array<string, float|null>
     */
    private function deltas(array $current, array $previous): array
    {
        $deltas = [];

        foreach (['posts', 'views', 'likes', 'comments', 'shares', 'engagement_rate'] as $key) {
            $prev = $previous[$key] ?? 0;
            $deltas[$key] = $prev > 0 ? round((($current[$key] ?? 0) - $prev) / $prev * 100, 1) : null;
        }

        return $deltas;
    }

    /**
     * @return array{start: string, end: string, label: string, days: int}
     */
    private function periodMeta(CarbonImmutable $start, CarbonImmutable $end): array
    {
        return [
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'label' => $this->rangeLabel($start, $end),
            'days' => (int) $start->diffInDays($end) + 1,
        ];
    }

    private function rangeLabel(CarbonImmutable $start, CarbonImmutable $end): string
    {
        $startFmt = $start->isSameYear($end) ? $start->translatedFormat('d M') : $start->translatedFormat('d M Y');

        return $startFmt.' - '.$end->translatedFormat('d M Y');
    }
}
