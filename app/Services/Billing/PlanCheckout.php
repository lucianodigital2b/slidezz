<?php

namespace App\Services\Billing;

use App\Models\User;

/**
 * Builds the Stripe Checkout url for a plan: the weekly pass is a one-time
 * payment (fulfilled by HandleStripeWebhookForWeeklyPass), monthly and annual
 * are Cashier subscriptions named after the plan key. Callers catch
 * IncompletePayment.
 */
class PlanCheckout
{
    public function __construct(private BillingCatalog $catalog) {}

    public function url(User $user, string $plan, string $currency, string $successUrl, string $cancelUrl): string
    {
        $priceId = $this->catalog->priceId($plan, $currency);

        abort_if(! $priceId, 404, 'Plan price not configured for this currency.');

        if (config("plans.{$plan}.mode") === 'pass') {
            return $user->checkout($priceId, [
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'allow_promotion_codes' => true,
                'metadata' => [
                    'type' => 'weekly_pass',
                    'user_id' => (string) $user->id,
                    'plan' => $plan,
                ],
            ])->url;
        }

        return $user->newSubscription($plan, $priceId)
            ->allowPromotionCodes()
            ->checkout([
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ])
            ->url;
    }
}
