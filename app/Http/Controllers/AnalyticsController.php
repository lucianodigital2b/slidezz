<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use App\Models\SocialAccount;
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

        return Inertia::render('Analytics', [
            'stats' => $stats,
            'posts' => $posts,
            'period' => $period,
            'tiktokAccounts' => Inertia::defer(fn () => $this->tiktokAccounts($userId)),
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
     * A failing account (expired token, missing scope) shows its error instead
     * of hiding the others.
     *
     * @return list<array<string, mixed>>
     */
    private function tiktokAccounts(int $userId): array
    {
        $publisher = app(TikTokPublisher::class);

        // Eloquent here because the tokens are encrypted casts and a refresh writes back.
        return SocialAccount::query()
            ->whereIn('workspace_id', $this->ownedWorkspaceIds($userId))
            ->where('provider', 'tiktok')
            ->get(['id', 'handle', 'avatar', 'access_token', 'refresh_token', 'expires_at'])
            ->map(function (SocialAccount $account) use ($publisher) {
                try {
                    $insights = Cache::remember(
                        self::insightsKey($account->id),
                        now()->addMinutes(15),
                        fn () => $publisher->accountInsights($account),
                    );
                    $error = null;
                } catch (\Throwable $e) {
                    $insights = null;
                    $error = $e->getMessage();
                }

                return [
                    'id' => $account->id,
                    'handle' => $account->handle,
                    'avatar' => $account->avatar,
                    'insights' => $insights,
                    'error' => $error,
                ];
            })
            ->values()
            ->all();
    }

    private static function insightsKey(int $accountId): string
    {
        return "tiktok-insights:{$accountId}";
    }
}
