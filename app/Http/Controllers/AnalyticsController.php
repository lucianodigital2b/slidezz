<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncAccountStats;
use App\Jobs\SyncPostAnalytics;
use App\Models\AccountPost;
use App\Models\AccountSnapshot;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Social\TikTokPublisher;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    /** (likes + comments + shares) / views as a percentage, 0 when there are no views. */
    private const ENGAGEMENT_SQL = 'COALESCE(ROUND((COALESCE(%1$s.likes, 0) + COALESCE(%1$s.comments, 0) + COALESCE(%1$s.shares, 0)) * 100.0 / NULLIF(%1$s.views, 0), 2), 0)';

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $period = $request->integer('period', 30);
        $since = now()->subDays($period);

        // Totals are summed by the database in one pass.
        $totals = $this->publishedQuery($userId, $since)
            ->selectRaw('COALESCE(SUM(pa.views), 0) AS views')
            ->selectRaw('COALESCE(SUM(pa.likes), 0) AS likes')
            ->selectRaw('COALESCE(SUM(pa.comments), 0) AS comments')
            ->selectRaw('COALESCE(SUM(pa.shares), 0) AS shares')
            ->first();

        $views = (int) $totals->views;

        $stats = [
            'total_views' => $views,
            'total_likes' => (int) $totals->likes,
            'total_comments' => (int) $totals->comments,
            'avg_engagement_rate' => $views > 0
                ? round(((int) $totals->likes + (int) $totals->comments + (int) $totals->shares) / $views * 100, 2)
                : 0,
        ];

        $posts = $this->publishedQuery($userId, $since)
            ->join('content_projects as cp', 'cp.id', '=', 's.content_project_id')
            ->select([
                's.id',
                'cp.title',
                'sa.provider as platform',
                'sa.handle',
                'sa.avatar',
                's.publish_at',
                'pa.last_synced_at',
            ])
            ->selectRaw('COALESCE(pa.views, 0) AS views')
            ->selectRaw('COALESCE(pa.likes, 0) AS likes')
            ->selectRaw('COALESCE(pa.comments, 0) AS comments')
            ->selectRaw('COALESCE(pa.shares, 0) AS shares')
            ->selectRaw('COALESCE(pa.bookmarks, 0) AS bookmarks')
            ->selectRaw(sprintf(self::ENGAGEMENT_SQL, 'pa').' AS engagement_rate')
            ->orderByDesc('s.publish_at')
            ->get()
            ->map(fn (object $row) => [
                'id' => (int) $row->id,
                'title' => $row->title,
                'platform' => $row->platform,
                'handle' => $row->handle,
                'avatar' => $row->avatar,
                'published_at' => Carbon::parse($row->publish_at)->toISOString(),
                'views' => (int) $row->views,
                'likes' => (int) $row->likes,
                'comments' => (int) $row->comments,
                'shares' => (int) $row->shares,
                'bookmarks' => (int) $row->bookmarks,
                'engagement_rate' => (float) $row->engagement_rate,
                'last_synced_at' => $row->last_synced_at ? Carbon::parse($row->last_synced_at)->toISOString() : null,
            ]);

        // Phase 1 account analytics for every connected account of the user.
        $accountIds = SocialAccount::query()
            ->whereIn('workspace_id', $this->ownedWorkspaceIds($userId))
            ->whereIn('provider', ['instagram', 'tiktok', 'facebook'])
            ->pluck('id')
            ->all();

        $growth = $this->growth($accountIds, $since);
        $accountPosts = $this->accountPosts($accountIds, $since);
        $contentTypes = $this->contentTypes($accountIds, $since);
        $bestTimes = $this->bestTimes($accountIds, $request->user());

        return Inertia::render('Analytics', [
            'stats' => $stats,
            'posts' => $posts,
            'period' => $period,
            'tiktokAccounts' => Inertia::defer(fn () => $this->tiktokAccounts($userId)),
            'growth' => $growth,
            'accountPosts' => $accountPosts,
            'contentTypes' => $contentTypes,
            'bestTimes' => $bestTimes,
        ]);
    }

    public function sync(Request $request): RedirectResponse
    {
        $userId = $request->user()->id;

        DB::table('social_accounts')
            ->whereIn('workspace_id', $this->ownedWorkspaceIds($userId))
            ->where('provider', 'tiktok')
            ->pluck('id')
            ->each(fn (int $id) => Cache::forget(self::insightsKey($id)));

        // The job takes the model, so load only the rows it will sync.
        $count = Schedule::query()
            ->whereIn('social_account_id', DB::table('social_accounts')
                ->select('id')
                ->whereIn('workspace_id', $this->ownedWorkspaceIds($userId)))
            ->where('status', ScheduleStatus::Published)
            ->whereNotNull('platform_post_id')
            ->with('socialAccount')
            ->get()
            ->each(fn (Schedule $s) => SyncPostAnalytics::dispatch($s))
            ->count();

        // Also dispatch the account-level sync for each connected account.
        SocialAccount::whereIn('workspace_id', $this->ownedWorkspaceIds($userId))
            ->whereIn('provider', ['instagram', 'tiktok', 'facebook'])
            ->get()
            ->each(fn (SocialAccount $account) => SyncAccountStats::dispatch($account));

        return redirect()->route('analytics')
            ->with('success', "Sincronizando analytics de {$count} publicações.");
    }

    /**
     * Published schedules of the user's workspaces since a date, with their
     * analytics row (if any) joined as `pa`.
     */
    private function publishedQuery(int $userId, CarbonInterface $since): Builder
    {
        return DB::table('schedules as s')
            ->join('social_accounts as sa', 'sa.id', '=', 's.social_account_id')
            ->leftJoin('post_analytics as pa', 'pa.schedule_id', '=', 's.id')
            ->whereIn('sa.workspace_id', $this->ownedWorkspaceIds($userId))
            ->where('s.status', ScheduleStatus::Published->value)
            ->where('s.publish_at', '>=', $since);
    }

    private function ownedWorkspaceIds(int $userId): Builder
    {
        return DB::table('workspaces')->select('id')->where('owner_id', $userId);
    }

    /**
     * Totals and recent videos read straight from each connected TikTok account.
     * Accounts not in the cache are fetched together in parallel; a failing
     * account (timeout, expired token, missing scope) shows its message
     * instead of hiding the others, and is not cached so the next load retries.
     *
     * @return list<array<string, mixed>>
     */
    private function tiktokAccounts(int $userId): array
    {
        // Eloquent here because the tokens are encrypted casts and a refresh writes back.
        $accounts = SocialAccount::query()
            ->whereIn('workspace_id', $this->ownedWorkspaceIds($userId))
            ->where('provider', 'tiktok')
            ->orderBy('id')
            ->get(['id', 'handle', 'avatar', 'access_token', 'refresh_token', 'expires_at']);

        if ($accounts->isEmpty()) {
            return [];
        }

        $results = Cache::many($accounts->map(fn (SocialAccount $a) => self::insightsKey($a->id))->all());
        $missing = $accounts->filter(fn (SocialAccount $a) => $results[self::insightsKey($a->id)] === null);

        $fetched = $missing->isEmpty() ? [] : app(TikTokPublisher::class)->accountsInsights($missing);

        foreach ($fetched as $id => $result) {
            if ($result['insights'] !== null) {
                Cache::put(self::insightsKey($id), $result['insights'], now()->addMinutes(15));
            }
        }

        return $accounts
            ->map(fn (SocialAccount $account) => [
                'id' => $account->id,
                'handle' => $account->handle,
                'avatar' => $account->avatar,
                'insights' => $fetched[$account->id]['insights'] ?? $results[self::insightsKey($account->id)],
                'error' => $fetched[$account->id]['error'] ?? null,
            ])
            ->values()
            ->all();
    }

    private static function insightsKey(int $accountId): string
    {
        return "tiktok-insights:{$accountId}";
    }

    /**
     * Follower growth per account, read from the account snapshots saved by the
     * daily SyncAccountStats job. Only snapshots inside the requested period are
     * included; gained is null until there are at least two data points.
     *
     * @param  list<int>  $accountIds
     * @return list<array<string, mixed>>
     */
    private function growth(array $accountIds, CarbonInterface $since): array
    {
        $accounts = SocialAccount::query()
            ->whereIn('id', $accountIds)
            ->with(['snapshots' => fn ($q) => $q->where('snapshot_date', '>=', $since->toDateString())->orderBy('snapshot_date')])
            ->get(['id', 'provider', 'handle', 'avatar']);

        return $accounts->map(function (SocialAccount $account): array {
            $snapshots = $account->snapshots;
            $first = $snapshots->first();
            $last = $snapshots->last();

            return [
                'account_id' => $account->id,
                'provider' => $account->provider,
                'handle' => $account->handle,
                'avatar' => $account->avatar,
                'current_followers' => $last?->followers,
                'gained' => $snapshots->count() >= 2 ? $last->followers - $first->followers : null,
                'series' => $snapshots->map(fn (AccountSnapshot $s) => [
                    'date' => $s->snapshot_date->toDateString(),
                    'followers' => $s->followers,
                ])->values()->all(),
            ];
        })->values()->all();
    }

    /**
     * All account posts (not just Slidezz-published) with posted_at inside the
     * period, newest first and capped at 100 for the UI.
     *
     * @param  list<int>  $accountIds
     * @return list<array<string, mixed>>
     */
    private function accountPosts(array $accountIds, CarbonInterface $since): array
    {
        return AccountPost::query()
            ->whereIn('social_account_id', $accountIds)
            ->whereBetween('posted_at', [$since, now()])
            ->with('socialAccount:id,provider,handle')
            ->orderByDesc('posted_at')
            ->limit(100)
            ->get()
            ->map(function (AccountPost $post): array {
                return [
                    'id' => $post->id,
                    'provider' => $post->socialAccount->provider,
                    'handle' => $post->socialAccount->handle,
                    'media_type' => $post->media_type,
                    'caption' => $post->caption ? mb_strimwidth($post->caption, 0, 120, '…') : null,
                    'permalink' => $post->permalink,
                    'thumbnail_url' => $post->thumbnail_url,
                    'posted_at' => $post->posted_at?->toISOString(),
                    'views' => $post->views,
                    'likes' => $post->likes,
                    'comments' => $post->comments,
                    'shares' => $post->shares,
                    'saves' => $post->saves,
                    'engagement' => (int) $post->likes + (int) $post->comments + (int) $post->shares + (int) $post->saves,
                ];
            })
            ->all();
    }

    /**
     * Average metrics per media type for all posts in the period (no page cap).
     *
     * @param  list<int>  $accountIds
     * @return list<array<string, mixed>>
     */
    private function contentTypes(array $accountIds, CarbonInterface $since): array
    {
        $posts = AccountPost::query()
            ->whereIn('social_account_id', $accountIds)
            ->whereBetween('posted_at', [$since, now()])
            ->get(['media_type', 'likes', 'comments', 'shares', 'saves']);

        return $posts->groupBy('media_type')
            ->map(function ($group, $mediaType): array {
                $count = $group->count();
                $avg = fn (callable $field) => $group->avg(fn ($p) => (int) $field($p) ?: 0);

                return [
                    'media_type' => $mediaType,
                    'posts' => $count,
                    'avg_likes' => (float) $avg(fn ($p) => $p->likes),
                    'avg_comments' => (float) $avg(fn ($p) => $p->comments),
                    'avg_engagement' => (float) $avg(fn ($p) => (int) $p->likes + (int) $p->comments + (int) $p->shares + (int) $p->saves),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Best posting hours based on the last 90 days, always bucketed in the
     * user's timezone (America/Sao_Paulo fallback) so it matches their wall
     * clock, independently of the database timezone.
     *
     * @param  list<int>  $accountIds
     * @return list<array<string, mixed>>
     */
    private function bestTimes(array $accountIds, User $user): array
    {
        $since = now()->subDays(90);
        $timezone = $user->timezone ?? 'America/Sao_Paulo';

        $posts = AccountPost::query()
            ->whereIn('social_account_id', $accountIds)
            ->whereBetween('posted_at', [$since, now()])
            ->get(['posted_at', 'likes', 'comments', 'shares', 'saves']);

        $buckets = [];

        foreach ($posts as $post) {
            $dt = $post->posted_at->timezone($timezone);
            $weekday = (int) $dt->dayOfWeek; // 0 = Sunday
            $hour = (int) $dt->hour;

            if (! isset($buckets[$weekday][$hour])) {
                $buckets[$weekday][$hour] = ['posts' => 0, 'total_engagement' => 0];
            }

            $buckets[$weekday][$hour]['posts']++;
            $buckets[$weekday][$hour]['total_engagement'] += (int) $post->likes + (int) $post->comments + (int) $post->shares + (int) $post->saves;
        }

        $result = [];
        foreach ($buckets as $weekday => $hours) {
            foreach ($hours as $hour => $data) {
                $result[] = [
                    'weekday' => $weekday,
                    'hour' => $hour,
                    'posts' => $data['posts'],
                    'avg_engagement' => $data['posts'] > 0 ? $data['total_engagement'] / $data['posts'] : 0,
                ];
            }
        }

        return $result;
    }
}
