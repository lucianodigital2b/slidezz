<?php

namespace Tests\Feature;

use App\Models\SlideProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class AppScreenshotControllerTest extends TestCase
{
    use RefreshDatabase;

    private function authenticatedUser(bool $premium = true): User
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => $premium ? now() : null,
        ]);
        Workspace::factory()->create(['owner_id' => $user->id]);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Slidezz — fotos da loja',
            'app_name' => 'Slidezz',
            'pitch' => 'Gera carrosséis e telas de loja com IA.',
            'format' => 'appstore',
            'theme' => 'midnight',
            'layout' => 'caption_top',
            'screen_count' => 3,
            'language' => 'Portuguese (Brazil)',
            'screen_labels' => ['Home', 'Editor', 'Export'],
            'locales' => ['en-US', 'es-ES'],
            'ai_copy' => true,
        ], $overrides);
    }

    // ─── create ──────────────────────────────────────────────────────────────

    public function test_create_requires_authentication(): void
    {
        $this->get(route('app-screenshots.create'))->assertRedirect(route('login'));
    }

    public function test_create_renders_the_wizard(): void
    {
        $this->actingAs($this->authenticatedUser())
            ->get(route('app-screenshots.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('CreateAppScreenshots'));
    }

    // ─── store ───────────────────────────────────────────────────────────────

    public function test_store_creates_the_project_and_redirects_to_the_editor_with_the_brief(): void
    {
        $user = $this->authenticatedUser();

        $response = $this->actingAs($user)->post(route('app-screenshots.store'), $this->validPayload());

        $project = SlideProject::firstOrFail();

        $response->assertRedirect(route('slideshow-editor.edit', $project));
        $response->assertSessionHas('screenshotConfig.appName', 'Slidezz');
        $response->assertSessionHas('screenshotConfig.locales', ['en-US', 'es-ES']);

        $this->assertSame('appstore', $project->format);
        $this->assertSame('app-screenshots', $project->template);
        $this->assertSame([], $project->slides);
    }

    public function test_store_rejects_a_format_that_is_not_a_store_canvas(): void
    {
        $this->actingAs($this->authenticatedUser())
            ->postJson(route('app-screenshots.store'), $this->validPayload(['format' => 'post']))
            ->assertJsonValidationErrors('format');
    }

    public function test_store_passes_the_chosen_device_frame_to_the_editor(): void
    {
        $this->actingAs($this->authenticatedUser())
            ->post(route('app-screenshots.store'), $this->validPayload(['device_frame' => 'flat']))
            ->assertSessionHas('screenshotConfig.deviceFrame', 'flat');
    }

    public function test_store_falls_back_to_the_iphone_frame_when_none_is_sent(): void
    {
        $payload = $this->validPayload();
        unset($payload['device_frame']);

        $this->actingAs($this->authenticatedUser())
            ->post(route('app-screenshots.store'), $payload)
            ->assertSessionHas('screenshotConfig.deviceFrame', 'iphone-14-pro');
    }

    public function test_store_rejects_an_unknown_device_frame(): void
    {
        $this->actingAs($this->authenticatedUser())
            ->postJson(route('app-screenshots.store'), $this->validPayload(['device_frame' => 'nokia']))
            ->assertJsonValidationErrors('device_frame');
    }

    // ─── captions ────────────────────────────────────────────────────────────

    public function test_captions_are_gated_behind_premium_access(): void
    {
        $this->actingAs($this->authenticatedUser(premium: false))
            ->postJson(route('app-screenshots.captions'), [
                'app_name' => 'Slidezz',
                'pitch' => 'Gera telas de loja com IA.',
                'count' => 2,
            ])
            ->assertStatus(402)
            ->assertJson(['error' => 'premium_required']);
    }

    public function test_captions_returns_one_caption_per_screenshot(): void
    {
        Prism::fake([TextResponseFake::make()->withText(
            '{"headline":"Ship in minutes","subheadline":"From idea to store page","highlight":"minutes"}'."\n".
            '{"headline":"Every locale","subheadline":"Translated screenshots in one click","highlight":"Every locale"}'
        )]);

        $this->actingAs($this->authenticatedUser())
            ->postJson(route('app-screenshots.captions'), [
                'app_name' => 'Slidezz',
                'pitch' => 'Gera telas de loja com IA.',
                'count' => 2,
                'language' => 'English',
                'store' => 'appstore',
            ])
            ->assertOk()
            ->assertJsonCount(2, 'captions')
            ->assertJsonPath('captions.0.headline', 'Ship in minutes')
            ->assertJsonPath('captions.1.highlight', 'Every locale');
    }

    // ─── translate ───────────────────────────────────────────────────────────

    public function test_translate_is_gated_behind_premium_access(): void
    {
        $this->actingAs($this->authenticatedUser(premium: false))
            ->postJson(route('app-screenshots.translate'), [
                'language' => 'Japanese',
                'items' => [['id' => 'a1', 'text' => 'Ship in minutes']],
            ])
            ->assertStatus(402);
    }

    public function test_translate_returns_a_translation_for_every_item(): void
    {
        Prism::fake([TextResponseFake::make()->withText(
            '{"id":"a1","text":"Publique em minutos","highlight":"minutos"}'
        )]);

        $this->actingAs($this->authenticatedUser())
            ->postJson(route('app-screenshots.translate'), [
                'language' => 'Portuguese (Brazil)',
                'app_name' => 'Slidezz',
                'items' => [
                    ['id' => 'a1', 'text' => 'Ship in minutes', 'highlight' => 'minutes'],
                    ['id' => 'a2', 'text' => 'Every locale'],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'translations')
            ->assertJsonPath('translations.0.text', 'Publique em minutos')
            // A line the model dropped falls back to the source string so the
            // screenshot never exports with a blank caption.
            ->assertJsonPath('translations.1.text', 'Every locale');
    }

    public function test_translate_validates_the_items_payload(): void
    {
        $this->actingAs($this->authenticatedUser())
            ->postJson(route('app-screenshots.translate'), ['language' => 'Japanese', 'items' => []])
            ->assertJsonValidationErrors('items');
    }
}
