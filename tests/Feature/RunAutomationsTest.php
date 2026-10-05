<?php

namespace Tests\Feature;

use App\Jobs\GenerateSlideshow;
use App\Models\Automation;
use App\Models\ContentProject;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RunAutomationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();
        // 09:05 in São Paulo: the 09:00 slot has just come due.
        $this->travelTo(Carbon::parse('2026-09-09 12:05:00', 'UTC'));
    }

    public function test_it_generates_for_a_due_automation_and_schedules_the_post(): void
    {
        $workspace = Workspace::factory()->create(['owner_id' => User::factory()]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => 'tiktok']);

        $automation = Automation::factory()->create([
            'workspace_id' => $workspace->id,
            'social_account_id' => $account->id,
            'post_times' => ['09:00', '19:00'],
            'timezone' => 'America/Sao_Paulo',
            'next_run_at' => Carbon::parse('2026-09-09 12:00:00', 'UTC'),
        ]);

        $this->artisan('automations:run')->assertSuccessful();

        $project = ContentProject::first();

        $this->assertSame('slideshow', $project->type);
        $this->assertSame($account->id, $project->script_data['social_account_id']);
        $this->assertSame('2026-09-09 12:00:00', $project->script_data['publish_at']);

        Queue::assertPushed(GenerateSlideshow::class);
        $this->assertDatabaseHas('automation_runs', ['automation_id' => $automation->id]);
    }

    public function test_it_advances_to_the_next_slot(): void
    {
        $automation = Automation::factory()->create([
            'post_times' => ['09:00', '19:00'],
            'timezone' => 'America/Sao_Paulo',
            'next_run_at' => Carbon::parse('2026-09-09 12:00:00', 'UTC'),
        ]);

        $this->artisan('automations:run')->assertSuccessful();

        $this->assertSame(
            '19:00',
            $automation->fresh()->next_run_at->setTimezone('America/Sao_Paulo')->format('H:i'),
        );
    }

    public function test_the_last_slot_of_the_day_rolls_over_to_tomorrow(): void
    {
        $automation = Automation::factory()->create([
            'post_times' => ['09:00'],
            'timezone' => 'America/Sao_Paulo',
            'next_run_at' => Carbon::parse('2026-09-09 12:00:00', 'UTC'),
        ]);

        $this->artisan('automations:run')->assertSuccessful();

        $next = $automation->fresh()->next_run_at->setTimezone('America/Sao_Paulo');

        $this->assertSame('09:00', $next->format('H:i'));
        $this->assertSame('2026-09-10', $next->format('Y-m-d'));
    }

    public function test_it_skips_paused_and_not_yet_due_automations(): void
    {
        Automation::factory()->paused()->create(['next_run_at' => Carbon::parse('2026-09-09 12:00:00', 'UTC')]);
        Automation::factory()->create(['next_run_at' => Carbon::parse('2026-09-09 22:00:00', 'UTC')]);
        Automation::factory()->create(['next_run_at' => null]);

        $this->artisan('automations:run')->assertSuccessful();

        Queue::assertNothingPushed();
        $this->assertSame(0, ContentProject::count());
    }
}
