<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->has('schedulesByDay')
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
                'social_account_id' => $socialAccount->id,
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
                'social_account_id' => $socialAccount->id,
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
                'social_account_id' => $otherSocialAccount->id,
                'publish_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertStatus(404);
    }

    public function test_schedule_page_defaults_to_current_month_and_year(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/schedule');

        $response->assertInertia(fn ($page) => $page
            ->where('month', now()->month)
            ->where('year', now()->year)
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
            ->has("schedulesByDay.{$publishAt->day}", 1)
            ->where("schedulesByDay.{$publishAt->day}.0.status", 'pending')
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
            ->where('schedulesByDay', [])
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
            ->where('schedulesByDay', [])
        );
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
