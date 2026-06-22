<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\Billing\BillingCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;

class BillingController extends Controller
{
    public function edit(Request $request, BillingCatalog $catalog): Response
    {
        $user = $request->user();
        $subscription = $user->subscription();
        $invoices = [];

        if ($user->hasStripeId()) {
            $invoices = $user->invoices()->map(fn ($invoice) => [
                'id' => $invoice->id,
                'date' => $invoice->date()->toDateString(),
                'total' => $invoice->total(),
                'status' => $invoice->status,
                'download_url' => route('billing.invoice.download', $invoice->id),
            ])->toArray();
        }

        return Inertia::render('settings/billing', [
            'plans' => $catalog->plans($catalog->currencyFor($request)),
            'subscription' => $subscription ? [
                'name' => $subscription->name,
                'stripe_status' => $subscription->stripe_status,
                'ends_at' => $subscription->ends_at?->toDateString(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'cancelled' => $subscription->cancelled(),
                'active' => $subscription->active(),
            ] : null,
            'on_trial' => $user->onTrial(),
            'invoices' => $invoices,
            'stripe_key' => config('cashier.key'),
        ]);
    }

    public function subscribe(Request $request, BillingCatalog $catalog): RedirectResponse
    {
        $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('plans')))],
            'cycle' => ['nullable', 'string', 'in:monthly,annual'],
        ]);

        $cycle = $request->input('cycle', 'monthly');
        $priceId = $catalog->subscriptionPriceId($request->plan, $cycle, $catalog->currencyFor($request));

        abort_if(! $priceId, 404, 'Plan price not configured for this currency.');

        try {
            $checkout = $request->user()
                ->newSubscription($request->plan, $priceId)
                ->allowPromotionCodes()
                ->checkout([
                    'success_url' => route('billing.edit').'?subscribed=1',
                    'cancel_url' => route('billing.edit'),
                ]);

            return redirect($checkout->url);
        } catch (IncompletePayment $e) {
            return redirect()->route('cashier.payment', [$e->payment->id, 'redirect' => route('billing.edit')]);
        }
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->user()->subscription()->cancel();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assinatura cancelada. Você terá acesso até o fim do período pago.']);

        return to_route('billing.edit');
    }

    public function resume(Request $request): RedirectResponse
    {
        $request->user()->subscription()->resume();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assinatura reativada com sucesso.']);

        return to_route('billing.edit');
    }

    public function portal(Request $request): RedirectResponse
    {
        return $request->user()->redirectToBillingPortal(route('billing.edit'));
    }

    public function downloadInvoice(Request $request, string $invoiceId): \Symfony\Component\HttpFoundation\Response
    {
        return $request->user()->downloadInvoice($invoiceId);
    }
}
