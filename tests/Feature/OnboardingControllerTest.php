<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use App\Services\AI\CarouselGenerationService;
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
                ->where('preview_images_enabled', false)
                ->has('plans')
                ->has('lifetime')
            );
    }

    public function test_user_with_existing_profile_resumes_on_onboarding_without_completing(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Onboarding')
                ->where('has_profile', true)
            );

        // Saving the profile no longer completes onboarding; the plans step still needs to run.
        $this->assertNull($user->fresh()->onboarding_completed_at);
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
            ->assertRedirect(route('onboarding'));

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace);
        $this->assertSame('Minha Marca', $workspace->name);
        $this->assertNotNull($workspace->profile);
        $this->assertSame('sell_products', $workspace->profile['goal']);
        $this->assertSame(['professional', 'motivational'], $workspace->profile['tone_of_voice']);
    }

    public function test_save_profile_does_not_complete_onboarding_or_award_credits_yet(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null, 'credits' => 0]);

        $this->actingAs($user)->post(route('onboarding.profile'), $this->validProfilePayload());

        // Completion (and the welcome credits) now happens on skip/subscribe, not on save.
        $fresh = $user->fresh();
        $this->assertNull($fresh->onboarding_completed_at);
        $this->assertSame(0, $fresh->credits);
    }

    public function test_save_profile_stores_the_gemini_key_when_provided(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload(['gemini_api_key' => '  AIza-onboarding-key  ']))
            ->assertRedirect(route('onboarding'));

        $this->assertSame('AIza-onboarding-key', $user->fresh()->gemini_api_key);
    }

    public function test_save_profile_without_gemini_key_leaves_it_null(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.profile'), $this->validProfilePayload())
            ->assertRedirect(route('onboarding'));

        $this->assertNull($user->fresh()->gemini_api_key);
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

    // ─── lifetime (launch offer) ─────────────────────────────────────────────

    public function test_onboarding_lifetime_requires_authentication(): void
    {
        $this->post(route('onboarding.lifetime'))->assertRedirect(route('login'));
    }

    public function test_onboarding_lifetime_404_when_price_not_configured(): void
    {
        config(['lifetime.prices' => []]);
        $user = User::factory()->create(['onboarding_completed_at' => null, 'lifetime_access_at' => null]);

        $this->actingAs($user)
            ->post(route('onboarding.lifetime'))
            ->assertNotFound();
    }

    public function test_onboarding_lifetime_completes_when_already_owned(): void
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => null,
            'lifetime_access_at' => now(),
            'credits' => 0,
        ]);

        $this->actingAs($user)
            ->post(route('onboarding.lifetime'))
            ->assertRedirect(route('dashboard'));

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->onboarding_completed_at);
        $this->assertSame(15, $fresh->credits);
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

    // ─── skip ────────────────────────────────────────────────────────────────

    public function test_skip_completes_onboarding_and_awards_credits(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null, 'credits' => 0]);

        $this->actingAs($user)
            ->post(route('onboarding.skip'))
            ->assertRedirect(route('dashboard'));

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->onboarding_completed_at);
        $this->assertSame(15, $fresh->credits);
    }

    public function test_skip_is_idempotent_for_completed_user(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()->subDay(), 'credits' => 3]);

        $this->actingAs($user)
            ->post(route('onboarding.skip'))
            ->assertRedirect(route('dashboard'));

        $this->assertSame(3, $user->fresh()->credits);
    }

    // ─── preview (aha) ───────────────────────────────────────────────────────

    public function test_preview_topics_returns_two_brand_tailored_topics(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateIdeas')->once()->andReturn([
                ['title' => 'Ideia A', 'angle' => 'erro_comum'],
                ['title' => 'Ideia B', 'angle' => 'passo_a_passo'],
                ['title' => 'Ideia C', 'angle' => 'bastidores'],
            ]);
        });

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.topics'))
            ->assertOk()
            ->assertJsonCount(2, 'topics')
            ->assertJsonPath('topics.0.topic', 'Ideia A')
            ->assertJsonPath('topics.0.title', 'Ideia A');
    }

    public function test_preview_topics_empty_without_brand_profile(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.topics'))
            ->assertOk()
            ->assertJsonPath('topics', []);
    }

    public function test_preview_topics_forbidden_when_already_completed(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.topics'))
            ->assertForbidden();
    }

    public function test_preview_deck_returns_ndjson(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('buildStyle')->andReturn('editorial voice');
            $mock->shouldReceive('generateSlides')->once()->andReturn('{"title":"Slide 1"}');
        });

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.deck'), ['topic' => 'Como vender mais'])
            ->assertOk()
            ->assertJsonPath('ndjson', '{"title":"Slide 1"}');
    }

    public function test_preview_deck_requires_topic(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.deck'), [])
            ->assertStatus(422);
    }

    public function test_preview_image_requires_byok_key(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null, 'gemini_api_key' => null]);

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.image'), ['prompt' => 'a cat'])
            ->assertStatus(402)
            ->assertJsonPath('error', 'missing_byok_key');
    }

    public function test_preview_image_falls_back_to_platform_key_when_enabled(): void
    {
        config(['services.carousel_image.onboarding_preview' => true]);
        $user = User::factory()->create(['onboarding_completed_at' => null, 'gemini_api_key' => null]);

        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->once()->andReturn('data:image/png;base64,PLATFORM');
        });

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.image'), ['prompt' => 'a cat'])
            ->assertOk()
            ->assertJsonPath('base64', 'data:image/png;base64,PLATFORM');
    }

    public function test_preview_image_platform_budget_is_capped_per_user(): void
    {
        config(['services.carousel_image.onboarding_preview' => true]);
        $user = User::factory()->create(['onboarding_completed_at' => null, 'gemini_api_key' => null]);

        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->andReturn('data:image/png;base64,PLATFORM');
        });

        // The platform covers the first 8 images (2 carousels x 4 slides), then stops.
        for ($i = 0; $i < 8; $i++) {
            $this->actingAs($user)
                ->postJson(route('onboarding.preview.image'), ['prompt' => "slide {$i}"])
                ->assertOk();
        }

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.image'), ['prompt' => 'over budget'])
            ->assertStatus(402)
            ->assertJsonPath('error', 'missing_byok_key');
    }

    public function test_preview_image_returns_base64_with_key(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null, 'gemini_api_key' => 'AIza-key']);

        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->once()->andReturn('data:image/png;base64,AAAA');
        });

        $this->actingAs($user)
            ->postJson(route('onboarding.preview.image'), ['prompt' => 'a cat', 'aspect_ratio' => '4:5'])
            ->assertOk()
            ->assertJsonPath('base64', 'data:image/png;base64,AAAA');
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

    public function test_returning_user_with_saved_profile_resumes_onboarding(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('onboarding'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Onboarding')->where('has_profile', true));
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
