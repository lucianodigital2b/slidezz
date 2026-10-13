<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_reach_checkout(): void
    {
        // Validation runs before any Stripe call, so an invalid plan is enough
        // to confirm the public (guest) route is wired without auth.
        $this->post(route('checkout.create'), ['plan' => 'invalid_plan'])
            ->assertSessionHasErrors('plan');
    }

    public function test_checkout_requires_a_plan(): void
    {
        $this->post(route('checkout.create'), [])
            ->assertSessionHasErrors('plan');
    }

    public function test_checkout_rejects_invalid_cycle(): void
    {
        $this->post(route('checkout.create'), ['plan' => 'starter', 'cycle' => 'weekly'])
            ->assertSessionHasErrors('cycle');
    }

    public function test_checkout_aborts_when_price_not_configured(): void
    {
        // No Stripe price ids are configured in the test environment, so a valid
        // plan should 404 instead of attempting a Stripe session.
        config(['plans.starter.prices.usd.monthly.price_id' => null]);

        $this->post(route('checkout.create'), ['plan' => 'starter'])
            ->assertNotFound();
    }

    public function test_authenticated_subscribed_user_is_sent_to_billing(): void
    {
        config(['plans.starter.prices.usd.monthly.price_id' => 'price_test_123']);

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'type' => 'starter',
            'stripe_id' => 'sub_existing',
            'stripe_status' => 'active',
            'stripe_price' => 'price_test_123',
            'quantity' => 1,
        ]);

        // A non-Inertia request makes Inertia::location fall back to a 302 away
        // redirect; either way the target is the billing page.
        $this->actingAs($user)
            ->post(route('checkout.create'), ['plan' => 'starter'])
            ->assertRedirect(route('billing.edit'));
    }

    public function test_success_without_session_redirects_home(): void
    {
        $this->get(route('checkout.success'))
            ->assertRedirect(route('home'));
    }
}
