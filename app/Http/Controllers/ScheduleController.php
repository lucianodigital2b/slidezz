<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
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
        $timezone = $this->viewerTimezone($request);

        // The calendar shows a week (the default) or a month, in the viewer's
        // timezone: a post at 21h in São Paulo is 00h UTC on the next day, and
        // the browser puts each post on its local day and hour.
        // `?month=&year=` (older links) still opens that month.
        if ($request->has(['month', 'year'])) {
            $range = 'month';
            $anchor = Carbon::create($request->integer('year'), $request->integer('month'), 1, 0, 0, 0, $timezone);
        } else {
            $range = $request->input('range') === 'month' ? 'month' : 'week';
            $date = $request->date('date', 'Y-m-d', $timezone);
            $anchor = ($date ?? now($timezone))->copy()->startOfDay();
        }

        $rangeStart = $range === 'week'
            ? $anchor->copy()->startOfWeek(Carbon::SUNDAY)
            : $anchor->copy()->startOfMonth();
        $rangeEnd = $range === 'week' ? $rangeStart->copy()->addWeek() : $rangeStart->copy()->addMonth();
        $month = $anchor->month;
        $year = $anchor->year;

        $workspaceIds = DB::table('workspaces')->where('owner_id', $request->user()->id)->pluck('id');

        $queueStatuses = [ScheduleStatus::Pending->value, ScheduleStatus::Publishing->value, ScheduleStatus::Failed->value];

        return Inertia::render('Schedule', [
            'schedules' => $this->rows($this->schedules($workspaceIds)
                ->where('s.publish_at', '>=', $rangeStart->copy()->utc())
                ->where('s.publish_at', '<', $rangeEnd->copy()->utc())
                ->orderBy('s.publish_at')),
            // The list view: every post still to go out (failed ones too, they
            // need action) and the latest sent ones, whatever month is showing.
            'queue' => $this->rows($this->schedules($workspaceIds)
                ->whereIn('s.status', $queueStatuses)
                ->orderBy('s.publish_at')
                ->limit(500)),
            'sent' => $this->rows($this->schedules($workspaceIds)
                ->where('s.status', ScheduleStatus::Published->value)
                ->orderByDesc('s.publish_at')
                ->limit(200)),
            'drafts' => $this->rows(DB::table('content_projects as cp')
                ->whereIn('cp.workspace_id', $workspaceIds)
                ->where('cp.status', 'drafting')
                ->selectRaw("JSON_OBJECT('id', cp.id, 'title', ".self::TITLE.", 'type', cp.type, 'updated_at', ".$this->iso('cp.updated_at').", 'images', ".self::IMAGES.') as row_json', [$this->mediaBaseUrl()])
                ->orderByDesc('cp.updated_at')
                ->limit(200)),
            'socialAccounts' => DB::table('social_accounts')
                ->whereIn('workspace_id', $workspaceIds)
                ->where('provider', 'tiktok')
                ->get(['id', 'handle', 'provider', 'avatar']),
            'contentProjects' => DB::table('content_projects as cp')
                ->whereIn('cp.workspace_id', $workspaceIds)
                ->whereIn('cp.status', ['ready', 'drafting'])
                ->orderByDesc('cp.created_at')
                ->selectRaw('cp.id, '.self::TITLE.' as title, cp.type, cp.video_url')
                ->get(),
            'month' => $month,
            'year' => $year,
            'range' => $range,
            'rangeStart' => $rangeStart->toDateString(),
            'statuses' => array_column(ScheduleStatus::cases(), 'value'),
            // Counted in posts, not rows: a post to three accounts is one post.
            'counts' => [
                'queue' => $this->schedules($workspaceIds)->whereIn('s.status', $queueStatuses)->distinct()->count('s.group_id'),
                'drafts' => DB::table('content_projects')->whereIn('workspace_id', $workspaceIds)->where('status', 'drafting')->count(),
                'sent' => $this->schedules($workspaceIds)->where('s.status', ScheduleStatus::Published->value)->distinct()->count('s.group_id'),
            ],
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
     * Delete, retime or change the accounts of many posts at once. Takes one
     * schedule id per post (the group lead); groups are deduplicated.
     */
    public function bulk(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'schedule_ids' => ['required', 'array', 'min:1', 'max:200'],
            'schedule_ids.*' => ['integer', 'distinct'],
            'action' => ['required', 'in:delete,time,accounts'],
            'time' => ['required_if:action,time', 'nullable', 'date_format:H:i'],
            'social_account_ids' => ['required_if:action,accounts', 'array', 'min:1'],
            'social_account_ids.*' => ['integer', 'distinct'],
        ]);

        $workspaceIds = $this->workspaceIdsForUser($request);
        $schedules = Schedule::with('socialAccount')
            ->whereIn('id', $validated['schedule_ids'])
            ->get();

        foreach ($schedules as $schedule) {
            abort_unless($workspaceIds->contains($schedule->socialAccount->workspace_id), 403);
        }

        $leads = $schedules->unique('group_id');

        $accounts = $validated['action'] === 'accounts'
            ? $this->workspaceAccounts($workspaceIds, $validated['social_account_ids'])
            : null;

        $timezone = $this->viewerTimezone($request);
        $applied = 0;
        $skipped = 0;

        DB::transaction(function () use ($leads, $validated, $accounts, $timezone, &$applied, &$skipped) {
            foreach ($leads as $lead) {
                $done = match ($validated['action']) {
                    'delete' => $this->deleteGroupRows($lead) > 0,
                    'time' => $this->retimeGroup($lead, $validated['time'], $timezone),
                    'accounts' => $this->replaceGroupAccounts($lead, $accounts),
                };

                $done ? $applied++ : $skipped++;
            }
        });

        $verb = $validated['action'] === 'delete' ? 'deleted' : 'updated';
        $message = $applied.' '.($applied === 1 ? 'post' : 'posts')." {$verb}.";

        if ($skipped > 0) {
            $message .= " {$skipped} skipped (already published or in the past).";
        }

        Inertia::flash('toast', ['type' => $applied > 0 ? 'success' : 'error', 'message' => $message]);

        return back();
    }

    /**
     * Change the time, the accounts and/or the caption of a scheduled post. Acts
     * on the whole group; when some accounts already published it, only the
     * pending or failed ones move, and they split off into a group of their own.
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
            'caption' => ['sometimes', 'nullable', 'string', 'max:2200'],
        ]);

        // The caption lives on the content, so every post of that content gets it.
        if (array_key_exists('caption', $validated)) {
            $project = $schedule->contentProject;
            $project->update(['script_data' => [...($project->script_data ?? []), 'caption' => (string) $validated['caption']]]);
        }

        if (! isset($validated['publish_at']) && ! isset($validated['social_account_ids'])) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Post updated.']);

            return back();
        }

        $accounts = null;
        if (isset($validated['social_account_ids'])) {
            abort_if($movable->count() !== $members->count(), 422, 'This post already went out on some accounts. Duplicate it to pick other accounts.');

            $accounts = $this->workspaceAccounts($this->workspaceIdsForUser($request), $validated['social_account_ids']);
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
                    $this->requeue($member, $publishAt);
                }
                $member->save();
            }

            if ($accounts !== null) {
                $this->syncAccounts($movable, $accounts, $groupId, $schedule->content_project_id, $publishAt);
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

        abort_if($this->deleteGroupRows($schedule) === 0, 422, 'This post is being published right now.');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post deleted.']);

        return back();
    }

    /**
     * Title shown for a project: its title, else its caption, else "Untitled".
     */
    private const TITLE = "LEFT(COALESCE(NULLIF(NULLIF(cp.title, ''), 'Untitled'), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(cp.script_data, '$.caption')), ''), 'Untitled'), 100)";

    /**
     * Same precedence as the publishers: rendered slides (stored paths, served
     * from the media disk, whose base URL is the one binding) first, then the
     * uploaded image URLs.
     */
    private const IMAGES = "CAST(COALESCE((SELECT JSON_ARRAYAGG(CONCAT(?, TRIM(LEADING '/' FROM jt.path))) FROM JSON_TABLE(cp.script_data, '$.slides[*]' COLUMNS (n FOR ORDINALITY, path VARCHAR(1024) PATH '$.path')) jt WHERE jt.path <> ''), JSON_EXTRACT(cp.script_data, '$.image_urls'), JSON_ARRAY()) AS JSON)";

    /**
     * Every schedule of the workspaces, each selected as the finished JSON the
     * page reads (row_json), so nothing is reshaped in PHP.
     *
     * @param  Collection<int, int>  $workspaceIds
     */
    private function schedules(Collection $workspaceIds): Builder
    {
        $json = "JSON_OBJECT(
            'id', s.id,
            'group_id', s.group_id,
            'status', s.status,
            'publish_at', ".$this->iso('s.publish_at').",
            'error_log', s.error_log,
            'content_project', JSON_OBJECT(
                'id', cp.id,
                'title', ".self::TITLE.",
                'video_url', cp.video_url,
                'caption', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(cp.script_data, '$.caption')), ''),
                'images', ".self::IMAGES.'
            ),
            \'social_account\', JSON_OBJECT(\'id\', sa.id, \'handle\', sa.handle, \'provider\', sa.provider, \'avatar\', sa.avatar)
        ) as row_json';

        return DB::table('schedules as s')
            ->join('social_accounts as sa', 'sa.id', '=', 's.social_account_id')
            ->join('content_projects as cp', 'cp.id', '=', 's.content_project_id')
            ->whereIn('sa.workspace_id', $workspaceIds)
            ->selectRaw($json, [$this->mediaBaseUrl()]);
    }

    /**
     * The JSON rows of a query, in its order, decoded in one go.
     *
     * @return list<mixed>
     */
    private function rows(Builder $query): array
    {
        return json_decode('['.$query->pluck('row_json')->implode(',').']');
    }

    /**
     * A UTC datetime column as ISO 8601, the way Carbon's toISOString writes it.
     */
    private function iso(string $column): string
    {
        return "DATE_FORMAT({$column}, '%Y-%m-%dT%H:%i:%s.000000Z')";
    }

    private function mediaBaseUrl(): string
    {
        return rtrim(url(Storage::disk(config('filesystems.media_disk'))->url('/')), '/').'/';
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

    /**
     * @return Collection<int, int>
     */
    private function workspaceIdsForUser(Request $request): Collection
    {
        return Workspace::where('owner_id', $request->user()->id)->pluck('id');
    }

    private function authorizeWorkspace(Request $request, Schedule $schedule): void
    {
        abort_unless($this->workspaceIdsForUser($request)->contains($schedule->socialAccount->workspace_id), 403);
    }

    /**
     * Deletes every member of the post except the ones being published right
     * now. Returns how many were deleted.
     */
    private function deleteGroupRows(Schedule $schedule): int
    {
        $deletable = $schedule->group()->get()
            ->reject(fn (Schedule $s) => $s->status === ScheduleStatus::Publishing);

        $deletable->each->delete();

        return $deletable->count();
    }

    /**
     * Moving a failed post re-queues it for the new time. Does not save.
     */
    private function requeue(Schedule $member, CarbonInterface $publishAt): void
    {
        $member->publish_at = $publishAt;
        $member->status = ScheduleStatus::Pending;
        $member->error_log = null;
    }

    /**
     * Makes the post go out only on $accounts: drops the members on other
     * accounts and adds one for each new account.
     *
     * @param  Collection<int, Schedule>  $movable
     * @param  Collection<int, SocialAccount>  $accounts
     */
    private function syncAccounts(Collection $movable, Collection $accounts, string $groupId, int $contentProjectId, CarbonInterface $publishAt): void
    {
        $movable->whereNotIn('social_account_id', $accounts->pluck('id'))->each->delete();

        foreach ($accounts->whereNotIn('id', $movable->pluck('social_account_id')) as $account) {
            Schedule::create([
                'group_id' => $groupId,
                'content_project_id' => $contentProjectId,
                'social_account_id' => $account->id,
                'publish_at' => $publishAt,
                'status' => ScheduleStatus::Pending,
            ]);
        }
    }

    /**
     * Bulk "change time": same time of day in the viewer's timezone, each post
     * keeps its own day. Skips the post when the new time would be in the past.
     * Members already published stay; the moved ones split into their own group.
     */
    private function retimeGroup(Schedule $lead, string $time, string $timezone): bool
    {
        $members = $lead->group()->get();
        $movable = $members->filter(fn (Schedule $s) => $s->isMovable());

        if ($movable->isEmpty()) {
            return false;
        }

        $publishAt = $movable->first()->publish_at->copy()
            ->setTimezone($timezone)
            ->setTimeFromTimeString($time)
            ->utc();

        if ($publishAt->isPast()) {
            return false;
        }

        $groupId = $movable->count() === $members->count() ? $lead->group_id : (string) Str::uuid();

        foreach ($movable as $member) {
            $member->group_id = $groupId;
            $this->requeue($member, $publishAt);
            $member->save();
        }

        return true;
    }

    /**
     * Bulk "change accounts". Only for posts not yet out on any account and
     * still in the future, same rule as update().
     *
     * @param  Collection<int, SocialAccount>  $accounts
     */
    private function replaceGroupAccounts(Schedule $lead, Collection $accounts): bool
    {
        $members = $lead->group()->get();

        if ($members->isEmpty() || $members->contains(fn (Schedule $s) => ! $s->isMovable()) || $lead->publish_at->isPast()) {
            return false;
        }

        $this->syncAccounts($members, $accounts, $lead->group_id, $lead->content_project_id, $lead->publish_at);

        return true;
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
