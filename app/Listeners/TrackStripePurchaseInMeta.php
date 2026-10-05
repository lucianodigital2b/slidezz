<?php

namespace App\Listeners;

use App\Jobs\SendMetaConversionEvent;
use App\Models\User;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Reports real revenue to the Meta Conversions API from Stripe webhooks — the
 * reliable source for Purchase value, since the customer may close the browser
 * before the success page loads. The Stripe object id is used as the event_id
 * for idempotency against webhook retries.
 */
class TrackStripePurchaseInMeta
{
    /**
     * One-time checkout types created by Slidezz itself. Other products sold on
     * the same Stripe account (e.g. the Grandma Mae e-book Payment Link) carry no
     * such type and must not be reported as Slidezz purchases.
     */
    private const SLIDEZZ_PAYMENT_TYPES = ['credit_pack', 'lifetime'];

    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;

        match ($payload['type'] ?? null) {
            'checkout.session.completed' => $this->handleCheckout($payload),
            'invoice.payment_succeeded' => $this->handleInvoice($payload),
            default => null,
        };
    }

    /**
     * One-time Slidezz payments only (credit packs and lifetime access).
     * Subscriptions arrive as mode=subscription and are tracked via their
     * invoices instead, so they are skipped here to avoid double counting.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleCheckout(array $payload): void
    {
        $session = $payload['data']['object'] ?? [];

        if (($session['mode'] ?? null) !== 'payment' || ($session['payment_status'] ?? null) !== 'paid') {
            return;
        }

        if (! in_array($session['metadata']['type'] ?? null, self::SLIDEZZ_PAYMENT_TYPES, true)) {
            return;
        }

        $amount = (int) ($session['amount_total'] ?? 0);

        if ($amount <= 0) {
            return;
        }

        $userId = (int) ($session['metadata']['user_id'] ?? 0);
        $user = $userId > 0 ? User::find($userId) : null;

        $this->dispatchPurchase(
            'stripe_checkout_'.($session['id'] ?? ''),
            $user,
            $amount,
            $session['currency'] ?? 'usd',
            'credit_pack',
        );
    }

    /**
     * Paid subscription invoices (first real charge + renewals). $0 invoices
     * such as a trial start are skipped — the StartTrial event covers those.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleInvoice(array $payload): void
    {
        $invoice = $payload['data']['object'] ?? [];
        $amount = (int) ($invoice['amount_paid'] ?? 0);

        if ($amount <= 0) {
            return;
        }

        $customerId = $invoice['customer'] ?? null;
        $user = $customerId ? User::where('stripe_id', $customerId)->first() : null;

        $this->dispatchPurchase(
            'stripe_invoice_'.($invoice['id'] ?? ''),
            $user,
            $amount,
            $invoice['currency'] ?? 'usd',
            'subscription',
        );
    }

    private function dispatchPurchase(string $eventId, ?User $user, int $amountInCents, string $currency, string $contentName): void
    {
        $userData = $user ? [
            'email' => $user->email,
            'external_id' => (string) $user->id,
        ] : [];

        SendMetaConversionEvent::dispatchAfterResponse(
            'Purchase',
            $eventId,
            $userData,
            [
                'currency' => strtoupper($currency),
                'value' => round($amountInCents / 100, 2),
                'content_name' => $contentName,
            ],
        );
    }
}
