<?php

namespace App\Http\Middleware;

use App\Services\Billing\BillingCatalog;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'trial_ends_at' => $request->user()?->trial_ends_at?->toDateString(),
                'on_trial' => $request->user()?->onTrial(),
                'onboarding_complete' => $request->user()?->hasCompletedOnboarding(),
                'credits' => $request->user()?->credits ?? 0,
                // Soft paywall: lifetime purchase or active subscription unlocks the generator.
                'premium_access' => (bool) $request->user()?->hasPremiumAccess(),
                'lifetime_access' => (bool) $request->user()?->hasLifetimeAccess(),
                // Images are BYOK-only, so surfaces like the dashboard nudge the
                // user to connect a Gemini key when none is set yet.
                'has_gemini_key' => filled($request->user()?->gemini_api_key),
            ],
            // Localized pricing (BRL for Brazil, USD otherwise) so the credits modal
            // and other in-app upsells render the right currency for each user.
            'pricing' => $request->user() ? $this->pricing($request) : null,
            'igEnabled' => (bool) $request->user()?->canUseInstagram(),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Plans, credit packs and the lifetime launch offer resolved to the request's currency.
     *
     * @return array{currency: string, plans: array<string, array<string, mixed>>, packs: list<array<string, mixed>>, lifetime: array{price_label: string|null, price_id: string|null}}
     */
    private function pricing(Request $request): array
    {
        $catalog = app(BillingCatalog::class);
        $currency = $catalog->currencyFor($request);

        return [
            'currency' => $currency,
            'plans' => $catalog->plans($currency),
            'packs' => $catalog->packs($currency),
            'lifetime' => $catalog->lifetime($currency),
        ];
    }
}
