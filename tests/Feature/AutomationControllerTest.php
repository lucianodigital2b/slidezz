<?php

namespace Tests\Feature;

use App\Enums\SlideTextPreset;
use App\Jobs\GenerateSlideshow;
use App\Models\Automation;
use App\Models\AutomationRun;
use App\Models\ContentProject;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AutomationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_only_the_users_own_automations(): void
    {
        [$user, $workspace] = $this->premiumUser();

        Automation::factory()->create(['workspace_id' => $workspace->id, 'name' => 'Skincare']);
        Automation::factory()->create(['name' => 'De outra pessoa']);

        $this->actingAs($user)
            ->get('/automations')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Automations')
                ->has('automations', 1)
                ->where('automations.0.name', 'Skincare')
                ->has('tiktokAccounts')
            );
    }

    public function test_it_creates_an_automation_and_sets_the_next_slot(): void
    {
        [$user, $workspace] = $this->premiumUser();

        // 08:00 in São Paulo, so the 09:00 slot is the next one due.
        $this->travelTo(Carbon::parse('2026-09-09 11:00:00', 'UTC'));

        $this->actingAs($user)
            ->post('/automations', [
                'name' => 'Skincare coreano',
                'niche' => 'rotinas de skincare coreano',
                'slide_count' => 7,
                'image_source' => 'pinterest',
                'image_keywords' => ['glass skin', 'shelfie'],
                'text_position' => 'bottom',
                'text_preset' => 'handwriting',
                'post_times' => ['09:00', '19:00'],
                'timezone' => 'America/Sao_Paulo',
            ])
            ->assertRedirect();

        $automation = Automation::first();

        $this->assertSame($workspace->id, $automation->workspace_id);
        $this->assertSame(7, $automation->slide_count);
        $this->assertSame(['glass skin', 'shelfie'], $automation->image_keywords);
        $this->assertSame(SlideTextPreset::Handwriting, $automation->text_preset);
        $this->assertSame('09:00', $automation->next_run_at->setTimezone('America/Sao_Paulo')->format('H:i'));
    }

    public function test_it_rejects_a_malformed_post_time(): void
    {
        [$user] = $this->premiumUser();

        $this->actingAs($user)
            ->post('/automations', [
                'name' => 'Skincare',
                'niche' => 'skincare',
                'post_times' => ['9h da manhã'],
            ])
            ->assertSessionHasErrors('post_times.0');
    }

    public function test_it_rejects_a_tiktok_account_from_another_workspace(): void
    {
        [$user] = $this->premiumUser();
        $foreign = SocialAccount::factory()->create(['provider' => 'tiktok']);

        $this->actingAs($user)
            ->post('/automations', [
                'name' => 'Skincare',
                'niche' => 'skincare',
                'post_times' => ['09:00'],
                'social_account_id' => $foreign->id,
            ])
            ->assertNotFound();
    }

    public function test_it_pauses_an_automation(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $automation = Automation::factory()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->put("/automations/{$automation->id}", [
                'name' => $automation->name,
                'niche' => $automation->niche,
                'status' => 'paused',
                'post_times' => $automation->post_times,
            ])
            ->assertRedirect();

        $this->assertSame('paused', $automation->fresh()->status);
    }

    public function test_another_workspace_cannot_touch_an_automation(): void
    {
        [$user] = $this->premiumUser();
        $foreign = Automation::factory()->create();

        $this->actingAs($user)->delete("/automations/{$foreign->id}")->assertForbidden();
    }

    public function test_run_now_dispatches_a_generation_without_scheduling_a_post(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();

        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => 'tiktok']);
        $automation = Automation::factory()->create([
            'workspace_id' => $workspace->id,
            'social_account_id' => $account->id,
        ]);

        $this->actingAs($user)->post("/automations/{$automation->id}/run")->assertRedirect();

        $project = ContentProject::first();

        $this->assertSame('generating', $project->status);
        $this->assertNull($project->script_data['publish_at']);
        $this->assertNull($project->script_data['social_account_id']);
        $this->assertSame($automation->id, $project->script_data['automation_id']);
        $this->assertSame($automation->text_preset->value, $project->script_data['text_preset']);
        $this->assertDatabaseHas('automation_runs', ['automation_id' => $automation->id, 'status' => 'running']);

        Queue::assertPushed(GenerateSlideshow::class);
    }

    public function test_run_now_is_gated_behind_premium_access(): void
    {
        Queue::fake();

        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $automation = Automation::factory()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)->post("/automations/{$automation->id}/run")->assertRedirect();

        Queue::assertNothingPushed();
        $this->assertSame(0, AutomationRun::count());
    }

    /**
     * @return array{0: User, 1: Workspace}
     */
    private function premiumUser(): array
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
        ]);

        return [$user, Workspace::factory()->create(['owner_id' => $user->id])];
    }
}
