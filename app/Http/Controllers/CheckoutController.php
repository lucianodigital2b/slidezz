<?php

namespace App\Http\Controllers;

use App\Jobs\SendMetaConversionEvent;
use App\Services\Billing\BillingCatalog;
use App\Services\Billing\CheckoutFulfillment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Exceptions\IncompletePayment;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guest checkout for the public landing page. Visitors pick a plan and create
 * their account directly on Stripe Checkout (email + payment), skipping the
 * register → onboarding → subscribe friction. The account is provisioned when
 * they return to the success url.
 */
class CheckoutController extends Controller
{
    private const TRIAL_DAYS = 14;

    public function create(Request $request, BillingCatalog $catalog): Response
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('plans')))],
            'cycle' => ['nullable', 'string', 'in:monthly,annual'],
        ]);

        $cycle = $validated['cycle'] ?? 'monthly';
        $priceId = $catalog->subscriptionPriceId($validated['plan'], $cycle, BillingCatalog::DEFAULT_CURRENCY);

        abort_if(! $priceId, 404, 'Plan price not configured.');

        // Already authenticated: subscribe against the existing account instead
        // of creating a new one through the guest flow.
        if ($user = $request->user()) {
            // Subscriptions are keyed by plan name (not Cashier's "default"),
            // so check for any active subscription rather than a named one.
            if ($user->subscriptions()->active()->exists()) {
                return Inertia::location(route('billing.edit'));
            }

            try {
                $checkout = $user->newSubscription($validated['plan'], $priceId)
                    ->trialDays(self::TRIAL_DAYS)
                    ->allowPromotionCodes()
                    ->checkout([
                        'success_url' => route('onboarding.complete').'?session_id={CHECKOUT_SESSION_ID}',
                        'cancel_url' => route('home').'#pricing',
                    ]);
            } catch (IncompletePayment $e) {
                return Inertia::location(route('cashier.payment', [$e->payment->id, 'redirect' => route('home')]));
            }

            return Inertia::location($checkout->url);
        }

        $session = Cashier::stripe()->checkout->sessions->create([
            'mode' => 'subscription',
            'line_items' => [['price' => $priceId, 'quantity' => 1]],
            'subscription_data' => ['trial_period_days' => self::TRIAL_DAYS],
            'allow_promotion_codes' => true,
            'billing_address_collection' => 'auto',
            'metadata' => ['plan' => $validated['plan'], 'cycle' => $cycle],
            'success_url' => route('checkout.success').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('home').'#pricing',
        ]);

        return Inertia::location($session->url);
    }

    public function success(Request $request, CheckoutFulfillment $fulfillment): RedirectResponse
    {
        $sessionId = $request->query('session_id');

        if (! $sessionId) {
            return redirect()->route('home');
        }

        $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId, [
            'expand' => ['subscription', 'subscription.items.data.price', 'customer'],
        ]);

        if ($session->mode !== 'subscription' || ! $session->subscription) {
            return redirect()->route('home');
        }

        $subscription = $session->subscription;
        $item = $subscription->items->data[0] ?? null;

        $result = $fulfillment->fulfill([
            'email' => $session->customer_details->email,
            'name' => $session->customer_details->name ?? null,
            'stripe_customer_id' => is_string($session->customer) ? $session->customer : $session->customer->id,
            'plan' => $session->metadata->plan ?? 'starter',
            'subscription' => [
                'id' => $subscription->id,
                'status' => $subscription->status,
                'trial_end' => $subscription->trial_end,
                'ends_at' => $subscription->cancel_at,
                'items' => $item ? [[
                    'id' => $item->id,
                    'product' => $item->price->product,
                    'price' => $item->price->id,
                    'quantity' => $item->quantity,
                ]] : [],
            ],
        ]);

        $user = $result['user'];

        // Never auto-login an existing account from a payment redirect — anyone
        // could check out with someone else's email. They keep the subscription
        // but must authenticate themselves.
        if (! $result['is_new']) {
            return redirect()->route('login')
                ->with('status', 'Sua assinatura está ativa. Faça login para continuar.');
        }

        Auth::login($user);

        SendMetaConversionEvent::dispatchAfterResponse(
            'StartTrial',
            'starttrial_'.$user->id,
            [
                'email' => $user->email,
                'external_id' => (string) $user->id,
                'client_ip_address' => $request->ip(),
                'client_user_agent' => $request->userAgent(),
            ],
            ['currency' => 'USD'],
            $request->fullUrl(),
        );

        return redirect()->route('onboarding');
    }
}
