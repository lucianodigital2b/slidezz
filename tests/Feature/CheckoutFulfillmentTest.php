<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Billing\CheckoutFulfillment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    private function sessionData(array $overrides = []): array
    {
        return array_replace_recursive([
            'email' => 'guest@example.com',
            'name' => 'Guest Buyer',
            'stripe_customer_id' => 'cus_123',
            'plan' => 'starter',
            'subscription' => [
                'id' => 'sub_123',
                'status' => 'trialing',
                'trial_end' => now()->addDays(14)->timestamp,
                'ends_at' => null,
                'items' => [[
                    'id' => 'si_123',
                    'product' => 'prod_123',
                    'price' => 'price_123',
                    'quantity' => 1,
                ]],
            ],
        ], $overrides);
    }

    public function test_it_provisions_a_new_account_and_subscription(): void
    {
        $result = app(CheckoutFulfillment::class)->fulfill($this->sessionData());

        $this->assertTrue($result['is_new']);

        $user = $result['user']->fresh();
        $this->assertSame('guest@example.com', $user->email);
        $this->assertSame('Guest Buyer', $user->name);
        $this->assertSame('cus_123', $user->stripe_id);
        $this->assertNotNull($user->email_verified_at);

        $subscription = $user->subscriptions()->first();
        $this->assertNotNull($subscription);
        $this->assertSame('starter', $subscription->type);
        $this->assertSame('trialing', $subscription->stripe_status);
        $this->assertSame('price_123', $subscription->stripe_price);
        $this->assertSame(1, $subscription->items()->count());
    }

    public function test_it_falls_back_to_email_prefix_when_name_missing(): void
    {
        $result = app(CheckoutFulfillment::class)
            ->fulfill($this->sessionData(['name' => null]));

        $this->assertSame('guest', $result['user']->name);
    }

    public function test_it_attaches_subscription_to_an_existing_account_without_relogin_flag(): void
    {
        $existing = User::factory()->create(['email' => 'guest@example.com']);

        $result = app(CheckoutFulfillment::class)->fulfill($this->sessionData());

        $this->assertFalse($result['is_new']);
        $this->assertTrue($existing->is($result['user']));
        $this->assertSame('cus_123', $existing->fresh()->stripe_id);
        $this->assertSame(1, $existing->subscriptions()->count());
    }

    public function test_it_is_idempotent_and_does_not_duplicate(): void
    {
        $service = app(CheckoutFulfillment::class);

        $service->fulfill($this->sessionData());
        $service->fulfill($this->sessionData(['subscription' => ['status' => 'active']]));

        $this->assertSame(1, User::where('email', 'guest@example.com')->count());

        $user = User::where('email', 'guest@example.com')->first();
        $subscription = $user->subscriptions()->first();
        $this->assertSame(1, $user->subscriptions()->count());
        $this->assertSame(1, $subscription->items()->count());
        // The second call reflects the updated status on the same row.
        $this->assertSame('active', $subscription->stripe_status);
    }
}
