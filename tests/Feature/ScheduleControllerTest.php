<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ScheduleControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected(): void
    {
        $response = $this->get('/schedule');

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_schedule_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/schedule');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Schedule')
            ->has('schedules')
            ->has('queue')
            ->has('sent')
            ->has('drafts')
            ->has('socialAccounts')
            ->has('contentProjects')
            ->has('month')
            ->has('year')
        );
    }

    public function test_store_creates_a_schedule(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'status' => 'ready',
        ]);

        $publishAt = now()->addDay()->format('Y-m-d H:i:s');

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => [$socialAccount->id],
                'publish_at' => $publishAt,
            ])
            ->assertRedirect('/schedule');

        $this->assertDatabaseHas('schedules', [
            'content_project_id' => $contentProject->id,
            'social_account_id' => $socialAccount->id,
            'status' => 'pending',
        ]);
    }

    public function test_store_rejects_publish_at_in_the_past(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'status' => 'ready',
        ]);

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => [$socialAccount->id],
                'publish_at' => now()->subHour()->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors('publish_at');
    }

    public function test_store_rejects_social_account_from_other_workspace(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $contentProject = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'status' => 'ready',
        ]);

        $otherSocialAccount = SocialAccount::factory()->create();

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => [$otherSocialAccount->id],
                'publish_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertStatus(404);
    }

    public function test_schedule_page_defaults_to_the_current_week(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/schedule');

        $response->assertInertia(fn ($page) => $page
            ->where('range', 'week')
            ->where('rangeStart', now()->startOfWeek(Carbon::SUNDAY)->toDateString())
            ->where('month', now()->month)
            ->where('year', now()->year)
        );
    }

    public function test_week_view_returns_only_that_weeks_posts_even_across_months(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        // The week of Wed 30 Sep 2026 runs Sun 27 Sep to Sat 3 Oct.
        foreach (['2026-09-26 12:00', '2026-09-28 12:00', '2026-10-02 12:00', '2026-10-04 12:00'] as $at) {
            Schedule::factory()->create([
                'social_account_id' => $socialAccount->id,
                'content_project_id' => $contentProject->id,
                'publish_at' => Carbon::parse($at, config('app.timezone')),
            ]);
        }

        $this->actingAs($user)
            ->get('/schedule?range=week&date=2026-09-30')
            ->assertInertia(fn ($page) => $page
                ->where('range', 'week')
                ->where('rangeStart', '2026-09-27')
                ->has('schedules', 2)
            );
    }

    public function test_month_range_returns_the_whole_month(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/schedule?range=month&date=2026-10-19')
            ->assertInertia(fn ($page) => $page
                ->where('range', 'month')
                ->where('rangeStart', '2026-10-01')
                ->where('month', 10)
            );
    }

    public function test_schedule_page_accepts_month_and_year_query_params(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/schedule?month=3&year=2025');

        $response->assertInertia(fn ($page) => $page
            ->where('month', 3)
            ->where('year', 2025)
        );
    }

    public function test_schedules_for_users_workspace_are_returned(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $publishAt = now()->startOfMonth()->addDays(4);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => $publishAt,
            'status' => ScheduleStatus::Pending,
        ]);

        $response = $this->actingAs($user)->get("/schedule?month={$publishAt->month}&year={$publishAt->year}");

        $response->assertInertia(fn ($page) => $page
            ->has('schedules', 1)
            ->where('schedules.0.status', 'pending')
        );
    }

    public function test_schedules_from_other_users_workspaces_are_not_returned(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $otherWorkspace = Workspace::factory()->create(['owner_id' => $otherUser->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $publishAt = now()->startOfMonth()->addDays(4);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => $publishAt,
        ]);

        $response = $this->actingAs($user)->get("/schedule?month={$publishAt->month}&year={$publishAt->year}");

        $response->assertInertia(fn ($page) => $page
            ->where('schedules', [])
        );
    }

    public function test_schedules_outside_the_requested_month_are_not_returned(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => now()->addMonths(2),
        ]);

        $response = $this->actingAs($user)->get("/schedule?month={$this->currentMonth()}&year={$this->currentYear()}");

        $response->assertInertia(fn ($page) => $page
            ->where('schedules', [])
        );
    }

    public function test_calendar_days_follow_the_viewer_timezone(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        // 21h on Oct 13 in São Paulo is 00h UTC on Oct 14.
        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => '2026-10-14 00:00:00',
        ]);

        // 22h on Oct 31 in São Paulo is already November in UTC.
        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => '2026-11-01 01:00:00',
        ]);

        $this->actingAs($user)
            ->withUnencryptedCookie('tz', 'America/Sao_Paulo')
            ->get('/schedule?month=10&year=2026')
            ->assertInertia(fn ($page) => $page
                ->has('schedules', 2)
                ->where('schedules.0.publish_at', '2026-10-14T00:00:00.000000Z')
                ->where('schedules.1.publish_at', '2026-11-01T01:00:00.000000Z')
            );

        $this->actingAs($user)
            ->withUnencryptedCookie('tz', 'America/Sao_Paulo')
            ->get('/schedule?month=11&year=2026')
            ->assertInertia(fn ($page) => $page->where('schedules', []));
    }

    public function test_calendar_falls_back_to_utc_without_a_valid_timezone(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => '2026-10-14 00:00:00',
        ]);

        Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => '2026-11-01 01:00:00',
        ]);

        $this->actingAs($user)
            ->withUnencryptedCookie('tz', 'Not/AZone')
            ->get('/schedule?month=10&year=2026')
            ->assertInertia(fn ($page) => $page
                ->has('schedules', 1)
                ->where('schedules.0.publish_at', '2026-10-14T00:00:00.000000Z')
            );
    }

    public function test_the_list_shows_the_queue_in_order_and_the_latest_sent_first(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'handle' => 'dailyhair.app']);
        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'title' => 'Guia capilar',
            'script_data' => ['caption' => 'Legenda', 'slides' => [['path' => 'api/1/a/01.jpg'], ['path' => 'api/1/a/02.jpg']]],
        ]);

        $at = fn (string $status, string $when) => Schedule::factory()->create([
            'social_account_id' => $account->id,
            'content_project_id' => $project->id,
            'status' => $status,
            'publish_at' => $when,
        ]);

        $later = $at('pending', '2030-01-02 15:00:00');
        $failed = $at('failed', '2030-01-01 15:00:00');
        $oldSent = $at('published', '2026-01-01 15:00:00');
        $newSent = $at('published', '2026-02-01 15:00:00');

        ContentProject::factory()->create(['workspace_id' => $workspace->id, 'status' => 'drafting', 'title' => 'Rascunho']);

        $this->actingAs($user)
            ->get('/schedule')
            ->assertInertia(fn ($page) => $page
                ->where('queue.0.id', $failed->id)
                ->where('queue.1.id', $later->id)
                ->has('queue', 2)
                ->where('queue.0.content_project.title', 'Guia capilar')
                ->where('queue.0.content_project.caption', 'Legenda')
                ->where('queue.0.content_project.images', [
                    url(\Storage::disk(config('filesystems.media_disk'))->url('api/1/a/01.jpg')),
                    url(\Storage::disk(config('filesystems.media_disk'))->url('api/1/a/02.jpg')),
                ])
                ->where('queue.0.social_account.handle', 'dailyhair.app')
                ->where('sent.0.id', $newSent->id)
                ->where('sent.1.id', $oldSent->id)
                ->where('drafts.0.title', 'Rascunho')
                ->where('counts.queue', 2)
                ->where('counts.sent', 2)
            );
    }

    public function test_a_post_to_several_accounts_counts_once(): void
    {
        [$user] = $this->groupFor([ScheduleStatus::Pending, ScheduleStatus::Pending]);

        $this->actingAs($user)
            ->get('/schedule')
            ->assertInertia(fn ($page) => $page
                ->has('queue', 2)
                ->where('counts.queue', 1)
            );
    }

    public function test_update_moves_a_pending_schedule(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Pending);
        $newDate = now()->addDays(3)->startOfMinute();

        $this->actingAs($user)
            ->from('/schedule')
            ->patch("/schedule/{$schedule->id}", ['publish_at' => $newDate->toISOString()])
            ->assertRedirect('/schedule');

        $this->assertTrue($schedule->fresh()->publish_at->equalTo($newDate));
    }

    public function test_update_requeues_a_failed_schedule(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Failed);
        $schedule->update(['error_log' => 'boom']);

        $this->actingAs($user)
            ->patch("/schedule/{$schedule->id}", ['publish_at' => now()->addDay()->toISOString()]);

        $schedule->refresh();
        $this->assertSame(ScheduleStatus::Pending, $schedule->status);
        $this->assertNull($schedule->error_log);
    }

    public function test_update_rejects_published_schedule_and_past_dates(): void
    {
        [$user, $published] = $this->scheduleFor(ScheduleStatus::Published);

        $this->actingAs($user)
            ->patch("/schedule/{$published->id}", ['publish_at' => now()->addDay()->toISOString()])
            ->assertStatus(422);

        [$user, $pending] = $this->scheduleFor(ScheduleStatus::Pending);

        $this->actingAs($user)
            ->patch("/schedule/{$pending->id}", ['publish_at' => now()->subHour()->toISOString()])
            ->assertSessionHasErrors('publish_at');
    }

    public function test_duplicate_creates_a_pending_copy(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Published);

        $this->actingAs($user)
            ->post("/schedule/{$schedule->id}/duplicate", ['publish_at' => now()->addDays(2)->toISOString()]);

        $this->assertSame(2, Schedule::count());
        $this->assertDatabaseHas('schedules', [
            'content_project_id' => $schedule->content_project_id,
            'social_account_id' => $schedule->social_account_id,
            'status' => 'pending',
        ]);
    }

    public function test_destroy_deletes_a_schedule(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Pending);

        $this->actingAs($user)->delete("/schedule/{$schedule->id}");

        $this->assertModelMissing($schedule);
    }

    public function test_destroy_refuses_a_schedule_being_published(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Publishing);

        $this->actingAs($user)->delete("/schedule/{$schedule->id}")->assertStatus(422);

        $this->assertModelExists($schedule);
    }

    public function test_other_users_cannot_change_a_schedule(): void
    {
        [, $schedule] = $this->scheduleFor(ScheduleStatus::Pending);
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->delete("/schedule/{$schedule->id}")->assertForbidden();
        $this->actingAs($intruder)->post("/schedule/{$schedule->id}/duplicate", ['publish_at' => now()->addDay()->toISOString()])->assertForbidden();
        $this->actingAs($intruder)->patch("/schedule/{$schedule->id}", ['publish_at' => now()->addDay()->toISOString()])->assertForbidden();

        $this->assertSame(1, Schedule::count());
    }

    public function test_store_schedules_one_post_to_several_accounts_as_one_group(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $accounts = SocialAccount::factory()->count(2)->create(['workspace_id' => $workspace->id, 'provider' => 'tiktok']);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id, 'status' => 'ready']);

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => $accounts->pluck('id')->all(),
                'publish_at' => now()->addDay()->toISOString(),
            ])
            ->assertRedirect('/schedule');

        $schedules = Schedule::all();
        $this->assertCount(2, $schedules);
        $this->assertEqualsCanonicalizing($accounts->pluck('id')->all(), $schedules->pluck('social_account_id')->all());
        $this->assertCount(1, $schedules->pluck('group_id')->unique());
    }

    public function test_store_rejects_when_any_account_is_from_another_workspace(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $own = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $foreign = SocialAccount::factory()->create();
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id, 'status' => 'ready']);

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => [$own->id, $foreign->id],
                'publish_at' => now()->addDay()->toISOString(),
            ])
            ->assertNotFound();

        $this->assertSame(0, Schedule::count());
    }

    public function test_store_requires_at_least_one_account(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id, 'status' => 'ready']);

        $this->actingAs($user)
            ->post('/schedule', [
                'content_project_id' => $contentProject->id,
                'social_account_ids' => [],
                'publish_at' => now()->addDay()->toISOString(),
            ])
            ->assertSessionHasErrors('social_account_ids');
    }

    public function test_index_returns_the_group_id_of_each_schedule(): void
    {
        [$user, $schedule, $second] = $this->groupFor([ScheduleStatus::Pending, ScheduleStatus::Pending]);

        $this->actingAs($user)
            ->get("/schedule?month={$schedule->publish_at->month}&year={$schedule->publish_at->year}")
            ->assertInertia(fn ($page) => $page
                ->has('schedules', 2)
                ->where('schedules.0.group_id', $schedule->group_id)
                ->where('schedules.1.group_id', $second->group_id)
            );
    }

    public function test_update_moves_every_account_of_the_post(): void
    {
        [$user, $schedule, $second] = $this->groupFor([ScheduleStatus::Pending, ScheduleStatus::Failed]);
        $newDate = now()->addDays(3)->startOfMinute();

        $this->actingAs($user)
            ->patch("/schedule/{$schedule->id}", ['publish_at' => $newDate->toISOString()])
            ->assertRedirect();

        foreach ([$schedule->fresh(), $second->fresh()] as $member) {
            $this->assertTrue($member->publish_at->equalTo($newDate));
            $this->assertSame(ScheduleStatus::Pending, $member->status);
            $this->assertSame($schedule->group_id, $member->group_id);
        }
    }

    public function test_update_with_a_published_account_moves_only_the_rest_into_a_new_group(): void
    {
        [$user, $published, $pending] = $this->groupFor([ScheduleStatus::Published, ScheduleStatus::Pending]);
        $originalDate = $published->publish_at;
        $newDate = now()->addDays(3)->startOfMinute();

        $this->actingAs($user)
            ->patch("/schedule/{$published->id}", ['publish_at' => $newDate->toISOString()])
            ->assertRedirect();

        $published->refresh();
        $pending->refresh();
        $this->assertTrue($published->publish_at->equalTo($originalDate));
        $this->assertTrue($pending->publish_at->equalTo($newDate));
        $this->assertNotSame($published->group_id, $pending->group_id);
    }

    public function test_update_adds_and_removes_accounts(): void
    {
        [$user, $schedule, $second] = $this->groupFor([ScheduleStatus::Pending, ScheduleStatus::Pending]);
        $added = SocialAccount::factory()->create(['workspace_id' => $schedule->socialAccount->workspace_id]);

        $this->actingAs($user)
            ->patch("/schedule/{$schedule->id}", [
                'publish_at' => $schedule->publish_at->toISOString(),
                'social_account_ids' => [$schedule->social_account_id, $added->id],
            ])
            ->assertRedirect();

        $this->assertModelMissing($second);
        $members = Schedule::where('group_id', $schedule->group_id)->get();
        $this->assertEqualsCanonicalizing([$schedule->social_account_id, $added->id], $members->pluck('social_account_id')->all());
        $this->assertTrue($members->every(fn (Schedule $s) => $s->content_project_id === $schedule->content_project_id));
    }

    public function test_update_refuses_to_change_accounts_once_one_published(): void
    {
        [$user, $published, $pending] = $this->groupFor([ScheduleStatus::Published, ScheduleStatus::Pending]);

        $this->actingAs($user)
            ->patch("/schedule/{$pending->id}", [
                'publish_at' => now()->addDay()->toISOString(),
                'social_account_ids' => [$pending->social_account_id],
            ])
            ->assertStatus(422);

        $this->assertModelExists($published);
    }

    public function test_update_refuses_accounts_from_another_workspace(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Pending);
        $foreign = SocialAccount::factory()->create();

        $this->actingAs($user)
            ->patch("/schedule/{$schedule->id}", [
                'publish_at' => now()->addDay()->toISOString(),
                'social_account_ids' => [$foreign->id],
            ])
            ->assertNotFound();

        $this->assertSame(1, Schedule::count());
    }

    public function test_update_changes_the_caption_and_keeps_the_rest(): void
    {
        [$user, $published, $pending] = $this->groupFor([ScheduleStatus::Published, ScheduleStatus::Pending]);
        $project = $pending->contentProject;
        $project->update(['script_data' => ['caption' => 'Old', 'hashtags' => ['cabelo']]]);
        $originalDate = $pending->publish_at;

        $this->actingAs($user)
            ->patch("/schedule/{$pending->id}", ['caption' => 'New caption #cabelo'])
            ->assertRedirect();

        $this->assertSame(['caption' => 'New caption #cabelo', 'hashtags' => ['cabelo']], $project->fresh()->script_data);
        $pending->refresh();
        $this->assertTrue($pending->publish_at->equalTo($originalDate));
        $this->assertSame($published->group_id, $pending->group_id);
    }

    public function test_update_refuses_a_caption_once_every_account_published(): void
    {
        [$user, $schedule] = $this->scheduleFor(ScheduleStatus::Published);

        $this->actingAs($user)
            ->patch("/schedule/{$schedule->id}", ['caption' => 'Too late'])
            ->assertStatus(422);
    }

    public function test_duplicate_copies_every_account_into_a_new_group(): void
    {
        [$user, $schedule, $second] = $this->groupFor([ScheduleStatus::Published, ScheduleStatus::Failed]);

        $this->actingAs($user)
            ->post("/schedule/{$schedule->id}/duplicate", ['publish_at' => now()->addDays(2)->toISOString()]);

        $copies = Schedule::where('group_id', '!=', $schedule->group_id)->get();
        $this->assertCount(2, $copies);
        $this->assertCount(1, $copies->pluck('group_id')->unique());
        $this->assertEqualsCanonicalizing([$schedule->social_account_id, $second->social_account_id], $copies->pluck('social_account_id')->all());
        $this->assertTrue($copies->every(fn (Schedule $s) => $s->status === ScheduleStatus::Pending));
    }

    public function test_destroy_deletes_every_account_except_one_being_published(): void
    {
        [$user, $schedule, $second, $third] = $this->groupFor([ScheduleStatus::Pending, ScheduleStatus::Published, ScheduleStatus::Publishing]);

        $this->actingAs($user)->delete("/schedule/{$schedule->id}");

        $this->assertModelMissing($schedule);
        $this->assertModelMissing($second);
        $this->assertModelExists($third);
    }

    /**
     * One post scheduled to one account per status, all in the same group.
     *
     * @param  array<int, ScheduleStatus>  $statuses
     * @return array<int, mixed> The user, then one schedule per status.
     */
    private function groupFor(array $statuses): array
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);
        $publishAt = now()->addDay()->startOfMinute();
        $groupId = (string) Str::uuid();

        $schedules = array_map(fn (ScheduleStatus $status) => Schedule::factory()->create([
            'group_id' => $groupId,
            'social_account_id' => SocialAccount::factory()->create(['workspace_id' => $workspace->id])->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => $publishAt,
            'status' => $status,
        ]), $statuses);

        return [$user, ...$schedules];
    }

    /**
     * @return array{0: User, 1: Schedule}
     */
    private function scheduleFor(ScheduleStatus $status): array
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $socialAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);
        $contentProject = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->create([
            'social_account_id' => $socialAccount->id,
            'content_project_id' => $contentProject->id,
            'publish_at' => now()->addDay(),
            'status' => $status,
        ]);

        return [$user, $schedule];
    }

    private function currentMonth(): int
    {
        return now()->month;
    }

    private function currentYear(): int
    {
        return now()->year;
    }
}
