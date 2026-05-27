<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

class HandleStripeWebhookForCredits
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;
        $type = $payload['type'] ?? null;

        match ($type) {
            'checkout.session.completed' => $this->handleCheckoutCompleted($payload),
            'invoice.payment_succeeded' => $this->handleInvoicePaid($payload),
            default => null,
        };
    }

    private function handleCheckoutCompleted(array $payload): void
    {
        $session = $payload['data']['object'];
        $metadata = $session['metadata'] ?? [];

        if (($metadata['type'] ?? null) !== 'credit_pack') {
            return;
        }

        $credits = (int) ($metadata['credits'] ?? 0);
        $userId = (int) ($metadata['user_id'] ?? 0);

        if ($credits <= 0 || $userId <= 0) {
            Log::warning('CreditWebhook: invalid metadata in checkout.session.completed', $metadata);

            return;
        }

        $user = User::find($userId);

        if (! $user) {
            Log::error('CreditWebhook: user not found', ['user_id' => $userId]);

            return;
        }

        $user->addCredits($credits);

        Log::info('CreditWebhook: credits added via pack purchase', [
            'user_id' => $userId,
            'credits' => $credits,
        ]);
    }

    private function handleInvoicePaid(array $payload): void
    {
        $invoice = $payload['data']['object'];
        $customerId = $invoice['customer'] ?? null;
        $billingReason = $invoice['billing_reason'] ?? null;

        if (! in_array($billingReason, ['subscription_cycle', 'subscription_create'], true)) {
            return;
        }

        if (! $customerId) {
            return;
        }

        $user = User::where('stripe_id', $customerId)->first();

        if (! $user) {
            return;
        }

        $subscription = $user->subscription();

        if (! $subscription?->active()) {
            return;
        }

        $planConf = config('plans.'.$subscription->type);
        $credits = (int) ($planConf['credits_per_cycle'] ?? 0);

        if ($credits <= 0) {
            Log::warning('CreditWebhook: unknown plan for credits reset', ['plan' => $subscription->type]);

            return;
        }

        $user->credits = $credits;
        $user->save();

        Log::info('CreditWebhook: credits reset for subscription renewal', [
            'user_id' => $user->id,
            'plan' => $subscription->type,
            'credits' => $credits,
        ]);
    }
}
