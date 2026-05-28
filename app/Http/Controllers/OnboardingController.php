<?php

namespace App\Http\Controllers;

use App\Models\User;
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
            'plans' => config('plans'),
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
