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

    public function test_user_with_existing_profile_is_completed_and_redirected_to_dashboard(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($user->fresh()->onboarding_completed_at);
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
            ->assertSessionHasErrors(['goal', 'brand_name', 'brand_description', 'target_audience', 'tone_of_voice', 'palette']);
    }

    public function test_save_profile_validates_palette_color_format(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload([
                'palette' => ['name' => 'sunset', 'primary' => 'not-a-color', 'secondary' => '#FDE68A', 'accent' => '#D97706'],
            ]))
            ->assertSessionHasErrors('palette.primary');
    }

    public function test_save_profile_validates_tone_of_voice_is_array(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['tone_of_voice' => 'professional']))
            ->assertSessionHasErrors('tone_of_voice');
    }

    public function test_save_profile_creates_workspace_and_stores_profile_json(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload([
                'brand_name' => 'Minha Marca',
                'goal' => 'sell_products',
                'tone_of_voice' => ['professional', 'motivational'],
            ]))
            ->assertRedirect(route('dashboard'));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace);
        $this->assertSame('Minha Marca', $workspace->name);
        $this->assertNotNull($workspace->profile);
        $this->assertSame('sell_products', $workspace->profile['goal']);
        $this->assertSame(['professional', 'motivational'], $workspace->profile['tone_of_voice']);
    }

    public function test_save_profile_completes_onboarding_and_awards_three_credits(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null, 'credits' => 0]);

        $this->actingAs($user)->post(route('onboarding.profile'), $this->validProfilePayload());

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->onboarding_completed_at);
        $this->assertSame(3, $fresh->credits);
    }

    public function test_save_profile_stores_logo_and_references_in_profile(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        $logo = UploadedFile::fake()->image('logo.png', 200, 200);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['logo' => $logo]));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace->logo_path);
        $this->assertSame($workspace->logo_path, $workspace->profile['logo_path']);
        Storage::disk('public')->assertExists($workspace->logo_path);
    }

    public function test_save_profile_stores_palette_in_profile_json(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $palette = ['name' => 'forest', 'primary' => '#065F46', 'secondary' => '#A7F3D0', 'accent' => '#059669'];

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['palette' => $palette]));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertEquals($palette, $workspace->profile['palette']);
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

    public function test_returning_user_with_saved_profile_is_redirected_to_dashboard(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertRedirect(route('dashboard'));
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validProfilePayload(array $overrides = []): array
    {
        return array_merge([
            'goal' => 'sell_products',
            'brand_name' => 'Minha Marca',
            'brand_description' => 'Vendemos produtos digitais para empreendedores.',
            'target_audience' => 'Jovens de 18 a 30 anos interessados em tecnologia.',
            'tone_of_voice' => ['professional'],
            'palette' => [
                'name' => 'sunset',
                'primary' => '#F97316',
                'secondary' => '#FDE68A',
                'accent' => '#D97706',
            ],
            'visual_style' => null,
        ], $overrides);
    }
}
