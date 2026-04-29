<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OnboardingControllerTest extends TestCase
{
    use RefreshDatabase;

    // ─── show ────────────────────────────────────────────────────────────────

    public function test_onboarding_requires_authentication(): void
    {
        $this->get(route('onboarding'))->assertRedirect(route('login'));
    }

    public function test_authenticated_user_sees_onboarding_page(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Onboarding')
                ->where('has_profile', false)
                ->has('plans')
            );
    }

    public function test_has_profile_is_true_when_workspace_brand_data_exists(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->create(['owner_id' => $user->id, 'industry' => 'tecnologia']);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertInertia(fn ($page) => $page->where('has_profile', true));
    }

    public function test_completed_user_is_redirected_from_onboarding(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertRedirect(route('dashboard'));
    }

    // ─── saveProfile ─────────────────────────────────────────────────────────

    public function test_save_profile_requires_authentication(): void
    {
        $this->post(route('onboarding.profile'), [])->assertRedirect(route('login'));
    }

    public function test_save_profile_validates_required_fields(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), [])
            ->assertSessionHasErrors(['workspace_name', 'industry', 'vibe', 'brand_color', 'goal', 'target_audience', 'tone_of_voice']);
    }

    public function test_save_profile_validates_brand_color_format(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['brand_color' => 'not-a-color']))
            ->assertSessionHasErrors('brand_color');
    }

    public function test_save_profile_creates_workspace_and_redirects_to_onboarding(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload([
                'workspace_name' => 'Minha Marca',
                'industry' => 'tecnologia',
                'vibe' => 'profissional',
                'brand_color' => '#3B82F6',
            ]))
            ->assertRedirect(route('onboarding'));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace);
        $this->assertSame('Minha Marca', $workspace->name);
        $this->assertSame('tecnologia', $workspace->industry);
        $this->assertSame('profissional', $workspace->vibe);
        $this->assertSame('#3B82F6', $workspace->brand_color);
    }

    public function test_save_profile_does_not_complete_onboarding(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)->post(route('onboarding.profile'), $this->validProfilePayload());

        $this->assertNull($user->fresh()->onboarding_completed_at);
    }

    public function test_save_profile_stores_logo_when_provided(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        $logo = UploadedFile::fake()->image('logo.png', 200, 200);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['logo' => $logo]));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace->logo_path);
        Storage::disk('public')->assertExists($workspace->logo_path);
    }

    // ─── subscribe ───────────────────────────────────────────────────────────

    public function test_subscribe_requires_authentication(): void
    {
        $this->post(route('onboarding.subscribe'), ['plan' => 'pro'])->assertRedirect(route('login'));
    }

    public function test_subscribe_validates_plan(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.subscribe'), ['plan' => 'plano_invalido'])
            ->assertSessionHasErrors('plan');
    }

    // ─── complete ────────────────────────────────────────────────────────────

    public function test_complete_requires_authentication(): void
    {
        $this->get(route('onboarding.complete'))->assertRedirect(route('login'));
    }

    public function test_complete_marks_onboarding_done_and_redirects_to_dashboard(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->get(route('onboarding.complete'))
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($user->fresh()->onboarding_completed_at);
    }

    public function test_complete_is_idempotent(): void
    {
        $completedAt = now()->subDay();
        $user = User::factory()->create(['onboarding_completed_at' => $completedAt]);

        $this->actingAs($user)
            ->get(route('onboarding.complete'))
            ->assertRedirect(route('dashboard'));

        $this->assertEquals(
            $completedAt->toDateString(),
            $user->fresh()->onboarding_completed_at->toDateString()
        );
    }

    // ─── middleware ──────────────────────────────────────────────────────────

    public function test_dashboard_redirects_to_onboarding_when_not_complete(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('onboarding'));
    }

    public function test_library_redirects_to_onboarding_when_not_complete(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->get(route('library'))
            ->assertRedirect(route('onboarding'));
    }

    public function test_dashboard_accessible_after_onboarding(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_returning_user_without_subscription_sees_plans_step(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->create(['owner_id' => $user->id, 'industry' => 'tecnologia']);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertInertia(fn ($page) => $page
                ->where('has_profile', true)
                ->has('plans')
            );
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private function validProfilePayload(array $overrides = []): array
    {
        return array_merge([
            'workspace_name' => 'Minha Marca',
            'industry' => 'tecnologia',
            'vibe' => 'profissional',
            'brand_color' => '#E8440A',
            'goal' => 'crescer_seguidores',
            'target_audience' => 'Jovens de 18 a 30 anos interessados em tecnologia.',
            'tone_of_voice' => 'casual',
        ], $overrides);
    }
}
