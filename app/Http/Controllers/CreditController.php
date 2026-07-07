<?php

namespace App\Http\Controllers;

use App\Services\Billing\BillingCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CreditController extends Controller
{
    public function purchase(Request $request, BillingCatalog $catalog): Response
    {
        $request->validate([
            'pack' => ['required', 'string'],
        ]);

        $packs = collect(config('credits.packs'));
        $pack = $packs->firstWhere('key', $request->input('pack'));
        $priceId = $catalog->creditPackPriceId($request->input('pack'), $catalog->currencyFor($request));

        abort_if(! $pack || ! $priceId, 404, 'Credit pack not found.');

        $checkout = $request->user()->checkout($priceId, [
            'success_url' => route('dashboard').'?credits_purchased=1',
            'cancel_url' => route('dashboard'),
            'metadata' => [
                'type' => 'credit_pack',
                'credits' => (string) $pack['credits'],
                'user_id' => (string) $request->user()->id,
            ],
        ]);

        return Inertia::location($checkout->url);
    }
}
