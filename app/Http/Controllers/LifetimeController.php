<?php

namespace App\Http\Controllers;

use App\Services\Billing\BillingCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class LifetimeController extends Controller
{
    /**
     * Send the user to Stripe Checkout for the launch-offer lifetime deal
     * (one-time payment). Fulfillment happens in the Stripe webhook via the
     * `type: lifetime` metadata (see HandleStripeWebhookForLifetime).
     */
    public function purchase(Request $request, BillingCatalog $catalog): Response
    {
        $user = $request->user();

        if ($user->hasLifetimeAccess()) {
            return Inertia::location(route('dashboard'));
        }

        $priceId = $catalog->lifetime($catalog->currencyFor($request))['price_id'];

        abort_if(! $priceId, 404, 'Lifetime price not configured for this currency.');

        $checkout = $user->checkout($priceId, [
            'success_url' => route('dashboard').'?lifetime_purchased=1',
            'cancel_url' => route('dashboard'),
            'allow_promotion_codes' => true,
            'metadata' => [
                'type' => 'lifetime',
                'user_id' => (string) $user->id,
            ],
        ]);

        return Inertia::location($checkout->url);
    }
}
