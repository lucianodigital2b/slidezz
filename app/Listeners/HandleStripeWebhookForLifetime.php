<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

class HandleStripeWebhookForLifetime
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;

        if (($payload['type'] ?? null) !== 'checkout.session.completed') {
            return;
        }

        $session = $payload['data']['object'];
        $metadata = $session['metadata'] ?? [];

        if (($metadata['type'] ?? null) !== 'lifetime') {
            return;
        }

        $userId = (int) ($metadata['user_id'] ?? 0);
        $user = $userId > 0 ? User::find($userId) : null;

        if (! $user) {
            Log::error('LifetimeWebhook: user not found', ['user_id' => $userId]);

            return;
        }

        if ($user->lifetime_access_at === null) {
            $user->lifetime_access_at = now();
            $user->save();
        }

        Log::info('LifetimeWebhook: lifetime access granted', ['user_id' => $user->id]);
    }
}
