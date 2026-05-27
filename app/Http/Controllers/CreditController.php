<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CreditController extends Controller
{
    public function purchase(Request $request): RedirectResponse
    {
        $request->validate([
            'pack' => ['required', 'string'],
        ]);

        $packs = collect(config('credits.packs'));
        $pack = $packs->firstWhere('key', $request->input('pack'));

        abort_if(! $pack || ! $pack['price_id'], 404, 'Credit pack not found.');

        $checkout = $request->user()->checkout($pack['price_id'], [
            'success_url' => route('dashboard').'?credits_purchased=1',
            'cancel_url' => route('dashboard'),
            'metadata' => [
                'type' => 'credit_pack',
                'credits' => (string) $pack['credits'],
                'user_id' => (string) $request->user()->id,
            ],
        ]);

        return redirect($checkout->url);
    }
}
