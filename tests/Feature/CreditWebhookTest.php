<?php

namespace Tests\Feature;

use App\Listeners\HandleStripeWebhookForCredits;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class CreditWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_completed_adds_credits_for_credit_pack(): void
    {
        $user = User::factory()->create(['credits' => 0]);

        $event = new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'metadata' => [
                        'type' => 'credit_pack',
                        'credits' => '30',
                        'user_id' => (string) $user->id,
                    ],
                ],
            ],
        ]);

        (new HandleStripeWebhookForCredits)->handle($event);

        $this->assertEquals(30, $user->fresh()->credits);
    }

    public function test_checkout_completed_ignores_non_credit_pack_sessions(): void
    {
        $user = User::factory()->create(['credits' => 5]);

        $event = new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'metadata' => [
                        'type' => 'subscription',
                        'user_id' => (string) $user->id,
                    ],
                ],
            ],
        ]);

        (new HandleStripeWebhookForCredits)->handle($event);

        $this->assertEquals(5, $user->fresh()->credits);
    }

    public function test_unrelated_webhook_events_are_ignored(): void
    {
        $user = User::factory()->create(['credits' => 10]);

        $event = new WebhookReceived([
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => []],
        ]);

        (new HandleStripeWebhookForCredits)->handle($event);

        $this->assertEquals(10, $user->fresh()->credits);
    }
}
