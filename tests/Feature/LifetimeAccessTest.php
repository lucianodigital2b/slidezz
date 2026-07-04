<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AI\CarouselGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class LifetimeAccessTest extends TestCase
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

    // ─── Soft paywall on the generator ───────────────────────────────────────

    public function test_generate_requires_premium_access(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ])->assertStatus(402)->assertJsonFragment(['error' => 'premium_required']);
    }

    public function test_generate_image_requires_premium_access_even_with_a_gemini_key(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldNotReceive('generateImage');
        });

        $user = User::factory()->create(['gemini_api_key' => 'AIza-key']);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertStatus(402)->assertJsonFragment(['error' => 'premium_required']);
    }

    public function test_an_active_subscription_grants_premium_access(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'starter');

        $this->assertTrue($user->fresh()->hasPremiumAccess());
    }

    public function test_lifetime_purchase_grants_premium_access(): void
    {
        $user = User::factory()->create(['lifetime_access_at' => now()]);

        $this->assertTrue($user->hasLifetimeAccess());
        $this->assertTrue($user->hasPremiumAccess());
    }

    public function test_a_fresh_user_has_no_premium_access(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($user->hasLifetimeAccess());
        $this->assertFalse($user->hasPremiumAccess());
    }

    // ─── Fulfillment webhook ─────────────────────────────────────────────────

    public function test_checkout_webhook_grants_lifetime_access(): void
    {
        $user = User::factory()->create();

        event(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'metadata' => ['type' => 'lifetime', 'user_id' => (string) $user->id],
            ]],
        ]));

        $this->assertTrue($user->fresh()->hasLifetimeAccess());
    }

    public function test_checkout_webhook_ignores_non_lifetime_sessions(): void
    {
        $user = User::factory()->create();

        event(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'metadata' => ['type' => 'credit_pack', 'credits' => '10', 'user_id' => (string) $user->id],
            ]],
        ]));

        $this->assertFalse($user->fresh()->hasLifetimeAccess());
    }

    public function test_checkout_webhook_does_not_overwrite_an_earlier_grant(): void
    {
        $original = now()->subDay()->startOfSecond();
        $user = User::factory()->create(['lifetime_access_at' => $original]);

        event(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'metadata' => ['type' => 'lifetime', 'user_id' => (string) $user->id],
            ]],
        ]));

        $this->assertTrue($original->equalTo($user->fresh()->lifetime_access_at));
    }

    // ─── Purchase route ──────────────────────────────────────────────────────

    public function test_purchase_redirects_to_dashboard_when_already_lifetime(): void
    {
        $user = User::factory()->create([
            'lifetime_access_at' => now(),
            'onboarding_completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->post('/lifetime/purchase')
            ->assertRedirect(route('dashboard'));
    }

    public function test_purchase_404s_when_the_price_is_not_configured(): void
    {
        config(['lifetime.prices.usd.price_id' => null, 'lifetime.prices.brl.price_id' => null]);

        $user = User::factory()->create(['onboarding_completed_at' => now()]);

        $this->actingAs($user)
            ->post('/lifetime/purchase')
            ->assertNotFound();
    }
}
