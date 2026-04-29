<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;

class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        if ($request->user()->onboarding_completed_at !== null) {
            return redirect()->route('dashboard');
        }

        $workspace = Workspace::where('owner_id', $request->user()->id)->first();

        return Inertia::render('Onboarding', [
            'has_profile' => $workspace?->industry !== null,
            'plans' => config('plans'),
        ]);
    }

    public function saveProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'workspace_name' => ['required', 'string', 'max:100'],
            'industry' => ['required', 'string', 'max:100'],
            'vibe' => ['required', 'string', 'max:100'],
            'brand_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'goal' => ['required', 'string', 'max:100'],
            'target_audience' => ['required', 'string', 'max:300'],
            'tone_of_voice' => ['required', 'string', 'max:100'],
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
        }

        Workspace::updateOrCreate(
            ['owner_id' => $request->user()->id],
            [
                'name' => $validated['workspace_name'],
                'industry' => $validated['industry'],
                'vibe' => $validated['vibe'],
                'brand_color' => $validated['brand_color'],
                'logo_path' => $logoPath,
                'goal' => $validated['goal'],
                'target_audience' => $validated['target_audience'],
                'tone_of_voice' => $validated['tone_of_voice'],
            ]
        );

        return to_route('onboarding');
    }

    public function subscribe(Request $request): RedirectResponse
    {
        $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('plans')))],
        ]);

        $plan = config('plans.'.$request->plan);

        try {
            $checkout = $request->user()
                ->newSubscription($request->plan, $plan['price_id'])
                ->trialDays(14)
                ->allowPromotionCodes()
                ->checkout([
                    'success_url' => route('onboarding.complete').'?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('onboarding'),
                ]);

            return redirect($checkout->url);
        } catch (IncompletePayment $e) {
            return redirect()->route('cashier.payment', [$e->payment->id, 'redirect' => route('onboarding')]);
        }
    }

    public function complete(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at === null) {
            $user->onboarding_completed_at = now();
            $user->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assinatura ativada! Bem-vindo ao Slidezz.']);

        return redirect()->route('dashboard');
    }
}
