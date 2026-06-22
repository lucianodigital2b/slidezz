<?php

namespace App\Http\Controllers;

use App\Jobs\SendMetaConversionEvent;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Billing\BillingCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;

class OnboardingController extends Controller
{
    public function show(Request $request, BillingCatalog $catalog): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at !== null) {
            return redirect()->route('dashboard');
        }

        $workspace = Workspace::where('owner_id', $user->id)->first();

        // If profile was already saved (e.g. user returning to onboarding), complete it now.
        if ($workspace?->profile !== null) {
            return $this->completeOnboarding($user);
        }

        return Inertia::render('Onboarding', [
            'has_profile' => false,
            'plans' => $catalog->plans($catalog->currencyFor($request)),
        ]);
    }

    public function saveProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'goal' => ['required', 'string', 'max:100'],
            'brand_name' => ['required', 'string', 'max:200'],
            'brand_description' => ['required', 'string', 'max:1000'],
            'target_audience' => ['required', 'string', 'max:1000'],
            'tone_of_voice' => ['required', 'array', 'min:1'],
            'tone_of_voice.*' => ['string', 'max:50'],
            'palette' => ['required', 'array'],
            'palette.name' => ['required', 'string', 'max:100'],
            'palette.primary' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.secondary' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.accent' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'visual_style' => ['nullable', 'string', 'max:2000'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
        }

        $profile = [
            'goal' => $validated['goal'],
            'brand_name' => $validated['brand_name'],
            'brand_description' => $validated['brand_description'],
            'target_audience' => $validated['target_audience'],
            'tone_of_voice' => $validated['tone_of_voice'],
            'palette' => $validated['palette'],
            'visual_style' => $validated['visual_style'] ?? null,
        ];

        if ($logoPath) {
            $profile['logo_path'] = $logoPath;
        }

        Workspace::updateOrCreate(
            ['owner_id' => $request->user()->id],
            [
                'name' => $validated['brand_name'],
                'logo_path' => $logoPath,
                'profile' => $profile,
            ]
        );

        return $this->completeOnboarding($request->user());
    }

    private function completeOnboarding(User $user): RedirectResponse
    {
        $user->onboarding_completed_at = now();
        $user->save();
        $user->addCredits(3);

        return redirect()->route('dashboard');
    }

    public function subscribe(Request $request, BillingCatalog $catalog): RedirectResponse
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('plans')))],
            'cycle' => ['nullable', 'string', 'in:monthly,annual'],
        ]);

        $cycle = $validated['cycle'] ?? 'monthly';
        $currency = $catalog->currencyFor($request);
        $priceId = $catalog->subscriptionPriceId($validated['plan'], $cycle, $currency);

        abort_if(! $priceId, 404, 'Plan price not configured for this currency.');

        try {
            $checkout = $request->user()
                ->newSubscription($validated['plan'], $priceId)
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

            // Subscription trial just started — report it to Meta. A deterministic
            // event_id keeps it idempotent if the success URL is hit more than once.
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
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assinatura ativada! Bem-vindo ao Slidezz.']);

        return redirect()->route('dashboard');
    }
}
