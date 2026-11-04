<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Fulfills the weekly pass (one-time payment): 7 more days of access from now
 * or from the current expiry, whichever is later, plus the pass credits.
 * Idempotent per Checkout session.
 */
class HandleStripeWebhookForWeeklyPass
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;

        if (($payload['type'] ?? null) !== 'checkout.session.completed') {
            return;
        }

        $session = $payload['data']['object'];
        $metadata = $session['metadata'] ?? [];

        if (($metadata['type'] ?? null) !== 'weekly_pass' || ($session['payment_status'] ?? null) !== 'paid') {
            return;
        }

        $userId = (int) ($metadata['user_id'] ?? 0);
        $user = $userId > 0 ? User::find($userId) : null;

        if (! $user) {
            Log::error('WeeklyPassWebhook: user not found', ['user_id' => $userId]);

            return;
        }

        $sessionId = $session['id'] ?? null;

        if ($sessionId && $user->weekly_pass_session_id === $sessionId) {
            return;
        }

        $base = $user->hasActivePass() ? $user->pass_expires_at : now();
        $credits = (int) config('plans.weekly.credits_per_cycle', 20);

        $user->pass_expires_at = $base->copy()->addDays((int) config('plans.weekly.pass_days', 7));
        $user->weekly_pass_session_id = $sessionId;
        $user->save();
        $user->addCredits($credits);

        Log::info('WeeklyPassWebhook: pass granted', [
            'user_id' => $user->id,
            'credits' => $credits,
            'expires_at' => $user->pass_expires_at->toIso8601String(),
        ]);
    }
}
