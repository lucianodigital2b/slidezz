<?php

namespace Tests\Feature;

use App\Jobs\SendMetaConversionEvent;
use App\Listeners\TrackStripePurchaseInMeta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class TrackStripePurchaseInMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_time_credit_pack_checkout_reports_a_purchase(): void
    {
        Bus::fake();
        $user = User::factory()->create(['email' => 'buyer@example.com']);

        (new TrackStripePurchaseInMeta)->handle(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_test_123',
                'mode' => 'payment',
                'payment_status' => 'paid',
                'amount_total' => 2900,
                'currency' => 'usd',
                'metadata' => ['user_id' => (string) $user->id],
            ]],
        ]));

        Bus::assertDispatchedAfterResponse(
            SendMetaConversionEvent::class,
            fn (SendMetaConversionEvent $job) => $job->eventName === 'Purchase'
                && $job->eventId === 'stripe_checkout_cs_test_123'
                && $job->customData['value'] === 29.0
                && $job->customData['currency'] === 'USD'
                && $job->customData['content_name'] === 'credit_pack'
                && $job->userData['email'] === 'buyer@example.com'
                && $job->userData['external_id'] === (string) $user->id,
        );
    }

    public function test_paid_subscription_invoice_reports_a_purchase(): void
    {
        Bus::fake();
        $user = User::factory()->create(['email' => 'sub@example.com', 'stripe_id' => 'cus_abc']);

        (new TrackStripePurchaseInMeta)->handle(new WebhookReceived([
            'type' => 'invoice.payment_succeeded',
            'data' => ['object' => [
                'id' => 'in_test_9',
                'customer' => 'cus_abc',
                'amount_paid' => 12000,
                'currency' => 'usd',
            ]],
        ]));

        Bus::assertDispatchedAfterResponse(
            SendMetaConversionEvent::class,
            fn (SendMetaConversionEvent $job) => $job->eventId === 'stripe_invoice_in_test_9'
                && $job->customData['value'] === 120.0
                && $job->customData['content_name'] === 'subscription'
                && $job->userData['email'] === 'sub@example.com',
        );
    }

    public function test_zero_dollar_trial_invoice_does_not_report_a_purchase(): void
    {
        Bus::fake();

        (new TrackStripePurchaseInMeta)->handle(new WebhookReceived([
            'type' => 'invoice.payment_succeeded',
            'data' => ['object' => [
                'id' => 'in_trial',
                'customer' => 'cus_abc',
                'amount_paid' => 0,
                'currency' => 'usd',
            ]],
        ]));

        Bus::assertNotDispatchedAfterResponse(SendMetaConversionEvent::class);
    }

    public function test_subscription_mode_checkout_is_ignored_to_avoid_double_counting(): void
    {
        Bus::fake();

        (new TrackStripePurchaseInMeta)->handle(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_sub',
                'mode' => 'subscription',
                'payment_status' => 'paid',
                'amount_total' => 7900,
                'currency' => 'usd',
            ]],
        ]));

        Bus::assertNotDispatchedAfterResponse(SendMetaConversionEvent::class);
    }
}
