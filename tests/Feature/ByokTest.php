<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ByokTest extends TestCase
{
    use RefreshDatabase;

    private function subscribe(User $user, string $plan): void
    {
        $user->subscriptions()->create([
            'type' => $plan,
            'stripe_id' => 'sub_'.$plan.'_'.$user->id,
            'stripe_status' => 'active',
            'stripe_price' => 'price_'.$plan,
            'quantity' => 1,
        ]);
    }

    // ─── LAUNCH OFFER: BYOK is available to everyone ─────────────────────────

    public function test_byok_is_enabled_without_an_active_subscription(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($user->byokEnabled());
    }

    public function test_byok_is_enabled_on_every_plan(): void
    {
        foreach (['starter', 'pro', 'agency'] as $plan) {
            $user = User::factory()->create();
            $this->subscribe($user, $plan);

            $this->assertTrue($user->fresh()->byokEnabled(), "BYOK should be enabled on the {$plan} plan");
        }
    }

    public function test_byok_key_is_returned_regardless_of_plan(): void
    {
        $noPlan = User::factory()->create(['gemini_api_key' => 'AIza-secret']);
        $this->assertSame('AIza-secret', $noPlan->byokGeminiKey());

        $starter = User::factory()->create(['gemini_api_key' => 'AIza-secret']);
        $this->subscribe($starter, 'starter');
        $this->assertSame('AIza-secret', $starter->fresh()->byokGeminiKey());
    }

    public function test_byok_key_is_null_when_not_connected(): void
    {
        $user = User::factory()->create();

        $this->assertNull($user->byokGeminiKey());
    }

    // ─── Integrations settings ───────────────────────────────────────────────

    public function test_integrations_update_saves_the_key_without_a_subscription(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => 'AIza-x'])
            ->assertRedirect();

        $this->assertSame('AIza-x', $user->fresh()->gemini_api_key);
    }

    public function test_integrations_update_saves_the_key_on_any_plan(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'starter');

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => 'AIza-x'])
            ->assertRedirect();

        $this->assertSame('AIza-x', $user->fresh()->gemini_api_key);
    }

    public function test_gemini_key_guide_page_is_public(): void
    {
        $this->get('/chave-gemini')->assertOk();
    }

    public function test_integrations_update_can_clear_the_key(): void
    {
        $user = User::factory()->create(['gemini_api_key' => 'AIza-x']);

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => ''])
            ->assertRedirect();

        $this->assertNull($user->fresh()->gemini_api_key);
    }
}
