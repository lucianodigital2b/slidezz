<?php

namespace App\Services\Billing;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Provisions the account behind a completed guest checkout and persists the
 * Cashier subscription that Stripe created during the session. Kept separate
 * from the controller so the provisioning rules stay unit-testable without
 * touching the Stripe API.
 */
class CheckoutFulfillment
{
    /**
     * Create (or reconcile) the user for a finished checkout session and store
     * the subscription Stripe just created.
     *
     * @param  array{
     *     email: string,
     *     name: ?string,
     *     stripe_customer_id: string,
     *     plan: string,
     *     subscription: array{
     *         id: string,
     *         status: string,
     *         trial_end: ?int,
     *         ends_at: ?int,
     *         items: array<int, array{id: string, product: string, price: string, quantity: ?int}>
     *     }
     * }  $data
     * @return array{user: User, is_new: bool}
     */
    public function fulfill(array $data): array
    {
        $user = User::where('email', $data['email'])->first();
        $isNew = $user === null;

        if ($isNew) {
            $user = new User;
            $user->name = $data['name'] ?: Str::before($data['email'], '@');
            $user->email = $data['email'];
            // Random password: the user reaches the app via the post-checkout
            // login and can set a real password through the reset flow.
            $user->password = Hash::make(Str::random(40));
            $user->email_verified_at = now();
        }

        if (! $user->stripe_id) {
            $user->stripe_id = $data['stripe_customer_id'];
        }

        $user->save();

        $this->syncSubscription($user, $data['plan'], $data['subscription']);

        return ['user' => $user, 'is_new' => $isNew];
    }

    /**
     * Mirror the Stripe subscription into Cashier's tables. Matched by the
     * Stripe id so a webhook arriving later updates the same row instead of
     * duplicating it.
     *
     * @param  array{id: string, status: string, trial_end: ?int, ends_at: ?int, items: array<int, array{id: string, product: string, price: string, quantity: ?int}>}  $sub
     */
    private function syncSubscription(User $user, string $plan, array $sub): void
    {
        $firstItem = $sub['items'][0] ?? null;

        $subscription = $user->subscriptions()->updateOrCreate(
            ['stripe_id' => $sub['id']],
            [
                'type' => $plan,
                'stripe_status' => $sub['status'],
                'stripe_price' => $firstItem['price'] ?? null,
                'quantity' => $firstItem['quantity'] ?? 1,
                'trial_ends_at' => ! empty($sub['trial_end']) ? Carbon::createFromTimestamp($sub['trial_end']) : null,
                'ends_at' => ! empty($sub['ends_at']) ? Carbon::createFromTimestamp($sub['ends_at']) : null,
            ],
        );

        foreach ($sub['items'] as $item) {
            $subscription->items()->updateOrCreate(
                ['stripe_id' => $item['id']],
                [
                    'stripe_product' => $item['product'],
                    'stripe_price' => $item['price'],
                    'quantity' => $item['quantity'] ?? 1,
                ],
            );
        }
    }
}
