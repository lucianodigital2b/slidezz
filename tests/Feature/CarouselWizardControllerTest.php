<?php

namespace Tests\Feature;

use App\Models\SlideProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CarouselWizardControllerTest extends TestCase
{
    use RefreshDatabase;

    private function authenticatedUser(): User
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        return $user;
    }

    // ─── create ──────────────────────────────────────────────────────────────

    public function test_create_requires_authentication(): void
    {
        $this->get(route('carousel.create'))->assertRedirect(route('login'));
    }

    public function test_create_renders_wizard_page(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->get(route('carousel.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('CreateCarousel'));
    }

    public function test_create_passes_existing_workspace_config(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        Workspace::factory()->create([
            'owner_id' => $user->id,
            'profile' => ['carousel' => ['template' => 'noir-manifesto', 'archetype' => 'disruptor-social']],
        ]);

        $this->actingAs($user)
            ->get(route('carousel.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CreateCarousel')
                ->where('workspaceConfig.template', 'noir-manifesto')
                ->where('workspaceConfig.archetype', 'disruptor-social')
            );
    }

    public function test_create_passes_null_config_when_workspace_has_no_carousel_config(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->get(route('carousel.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CreateCarousel')
                ->where('workspaceConfig', null)
            );
    }

    // ─── extractUrl ──────────────────────────────────────────────────────────

    public function test_extract_url_requires_authentication(): void
    {
        $this->postJson(route('carousel.extract-url'), ['url' => 'https://youtube.com/watch?v=abc', 'type' => 'youtube'])
            ->assertUnauthorized();
    }

    public function test_extract_url_validates_required_fields(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.extract-url'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['url', 'type']);
    }

    public function test_extract_url_rejects_invalid_type(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.extract-url'), ['url' => 'https://example.com', 'type' => 'tiktok'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['type']);
    }

    public function test_extract_youtube_url_returns_video_metadata(): void
    {
        Http::fake([
            'www.youtube.com/oembed*' => Http::response([
                'title' => 'My Awesome Video',
                'author_name' => 'Cool Channel',
            ]),
        ]);

        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.extract-url'), [
                'url' => 'https://youtube.com/watch?v=dQw4w9WgXcQ',
                'type' => 'youtube',
            ])
            ->assertOk()
            ->assertJsonFragment(['title' => 'My Awesome Video'])
            ->assertJsonFragment(['topic' => 'My Awesome Video']);
    }

    public function test_extract_instagram_returns_422_with_message(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.extract-url'), [
                'url' => 'https://instagram.com/p/abc123/',
                'type' => 'instagram',
            ])
            ->assertUnprocessable()
            ->assertJsonFragment(['error' => 'Instagram não suporta extração automática. Copie o texto do post e cole no campo descrição.']);
    }

    // ─── saveConfig ──────────────────────────────────────────────────────────

    public function test_save_config_requires_authentication(): void
    {
        $this->postJson(route('carousel.save-config'), ['template' => 'noir-manifesto', 'archetype' => 'disruptor-social'])
            ->assertUnauthorized();
    }

    public function test_save_config_validates_required_fields(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.save-config'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['template']);
    }

    public function test_save_config_persists_to_workspace_profile(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->postJson(route('carousel.save-config'), [
                'template' => 'pop-magazine',
                'archetype' => 'paradoxo-social',
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertEquals('pop-magazine', data_get($workspace->profile, 'carousel.template'));
        $this->assertEquals('paradoxo-social', data_get($workspace->profile, 'carousel.archetype'));
    }

    public function test_save_config_preserves_existing_profile_data(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        Workspace::factory()->withProfile()->create([
            'owner_id' => $user->id,
            'profile' => ['existing_key' => 'existing_value'],
        ]);

        $this->actingAs($user)
            ->postJson(route('carousel.save-config'), [
                'template' => 'dark-cards',
                'archetype' => 'poder-oculto',
            ])
            ->assertOk();

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertEquals('existing_value', data_get($workspace->profile, 'existing_key'));
        $this->assertEquals('dark-cards', data_get($workspace->profile, 'carousel.template'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_store_requires_authentication(): void
    {
        $this->post(route('carousel.store'), [])->assertRedirect(route('login'));
    }

    public function test_store_validates_required_fields(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->post(route('carousel.store'), [])
            ->assertSessionHasErrors(['title', 'topic', 'template']);
    }

    public function test_store_creates_slide_project_and_redirects_to_editor(): void
    {
        $user = $this->authenticatedUser();

        $response = $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => '5 tips to grow on Instagram',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
            ]);

        $project = SlideProject::where('title', 'My Carousel')->first();
        $this->assertNotNull($project);
        $this->assertEquals([], $project->slides);

        $response->assertRedirect(route('slideshow-editor.edit', $project));
    }

    public function test_store_flashes_wizard_config_to_session(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => '5 tips to grow on Instagram',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
            ])
            ->assertSessionHas('wizardTopic', '5 tips to grow on Instagram');
    }

    public function test_store_saves_workspace_config_when_save_config_is_true(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)->post(route('carousel.store'), [
            'title' => 'My Carousel',
            'topic' => 'test topic',
            'template' => 'documentary',
            'archetype' => 'autoridade-cientifica',
            'save_config' => true,
        ]);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertEquals('documentary', data_get($workspace->profile, 'carousel.template'));
        $this->assertEquals('autoridade-cientifica', data_get($workspace->profile, 'carousel.archetype'));
    }

    public function test_store_does_not_save_config_by_default(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)->post(route('carousel.store'), [
            'title' => 'My Carousel',
            'topic' => 'test topic',
            'template' => 'documentary',
            'archetype' => 'autoridade-cientifica',
        ]);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNull(data_get($workspace->profile, 'carousel'));
    }

    public function test_store_flashes_slide_count_to_session(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => 'test topic',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
                'slide_count' => 7,
            ])
            ->assertSessionHas('wizardSlideCount', 7);
    }

    public function test_store_flashes_default_slide_count_when_not_provided(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => 'test topic',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
            ])
            ->assertSessionHas('wizardSlideCount', 3);
    }

    public function test_store_validates_slide_count_bounds(): void
    {
        $user = $this->authenticatedUser();

        $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => 'test topic',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
                'slide_count' => 1,
            ])
            ->assertSessionHasErrors(['slide_count']);

        $this->actingAs($user)
            ->post(route('carousel.store'), [
                'title' => 'My Carousel',
                'topic' => 'test topic',
                'template' => 'noir-manifesto',
                'archetype' => 'disruptor-social',
                'slide_count' => 11,
            ])
            ->assertSessionHasErrors(['slide_count']);
    }
}
