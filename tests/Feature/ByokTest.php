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

    public function test_byok_is_disabled_without_an_active_subscription(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($user->byokEnabled());
    }

    public function test_byok_is_disabled_on_the_starter_plan(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'starter');

        $this->assertFalse($user->fresh()->byokEnabled());
    }

    public function test_byok_is_enabled_on_pro_and_agency(): void
    {
        $pro = User::factory()->create();
        $this->subscribe($pro, 'pro');
        $this->assertTrue($pro->fresh()->byokEnabled());

        $agency = User::factory()->create();
        $this->subscribe($agency, 'agency');
        $this->assertTrue($agency->fresh()->byokEnabled());
    }

    public function test_byok_key_is_only_returned_when_the_plan_allows_it(): void
    {
        $starter = User::factory()->create(['gemini_api_key' => 'AIza-secret']);
        $this->subscribe($starter, 'starter');
        $this->assertNull($starter->fresh()->byokGeminiKey());

        $pro = User::factory()->create(['gemini_api_key' => 'AIza-secret']);
        $this->subscribe($pro, 'pro');
        $this->assertSame('AIza-secret', $pro->fresh()->byokGeminiKey());
    }

    public function test_integrations_update_is_forbidden_on_a_non_byok_plan(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'starter');

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => 'AIza-x'])
            ->assertForbidden();

        $this->assertNull($user->fresh()->gemini_api_key);
    }

    public function test_integrations_update_saves_the_key_on_a_byok_plan(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user, 'pro');

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => 'AIza-x'])
            ->assertRedirect();

        $this->assertSame('AIza-x', $user->fresh()->gemini_api_key);
    }

    public function test_integrations_update_can_clear_the_key(): void
    {
        $user = User::factory()->create(['gemini_api_key' => 'AIza-x']);
        $this->subscribe($user, 'pro');

        $this->actingAs($user)
            ->patch('/settings/integrations', ['gemini_api_key' => ''])
            ->assertRedirect();

        $this->assertNull($user->fresh()->gemini_api_key);
    }
}
