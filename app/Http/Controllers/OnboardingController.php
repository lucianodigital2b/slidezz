<?php

namespace App\Http\Controllers;

use App\Jobs\SendMetaConversionEvent;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AI\CarouselGenerationService;
use App\Services\Billing\BillingCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Exceptions\IncompletePayment;

class OnboardingController extends Controller
{
    /**
     * Max carousel-preview images the platform Gemini key will cover for a single
     * user who has not connected their own key (2 carousels x 4 slides). A durable
     * per-user counter enforces this so a page remount can't re-bill the platform.
     */
    private const PREVIEW_PLATFORM_IMAGE_CAP = 8;

    public function show(Request $request, BillingCatalog $catalog): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at !== null) {
            return redirect()->route('dashboard');
        }

        $workspace = Workspace::where('owner_id', $user->id)->first();

        // Saving the profile no longer completes onboarding — the wizard still has the
        // "aha" preview and the plans step. A returning user whose profile is already
        // saved resumes straight on the plans step (has_profile === true).
        return Inertia::render('Onboarding', [
            'has_profile' => $workspace?->profile !== null,
            // Drives whether the "aha" preview attempts photos: true when the user has
            // their own Gemini key, or when the platform covers the preview images
            // (marketing spend). The wizard also flips this on when a key is typed in
            // the BYOK step.
            'preview_images_enabled' => $user->byokGeminiKey() !== null
                || (bool) config('services.carousel_image.onboarding_preview'),
            'plans' => $catalog->plans($catalog->currencyFor($request)),
            // Launch offer: the lifetime deal is shown as an extra card in the plans grid.
            'lifetime' => $catalog->lifetime($catalog->currencyFor($request)),
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
            'gemini_api_key' => ['nullable', 'string', 'max:200'],
        ]);

        // BYOK step of the wizard (optional — there's a skip button): images run
        // on the user's own Gemini key, so capture it here when provided. It's also
        // what powers the "aha" preview step that follows.
        if (filled($validated['gemini_api_key'] ?? null)) {
            $request->user()->gemini_api_key = trim($validated['gemini_api_key']);
            $request->user()->save();
        }

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

        // Do NOT complete onboarding here: the wizard advances client-side to the
        // preview ("aha") step and then the plans step. Completion happens when the
        // user subscribes (complete) or skips (skip).
        return redirect()->route('onboarding');
    }

    /**
     * Two brand-tailored carousel topics for the onboarding "aha" preview. Reuses
     * the daily idea generator and is cached per user per day so re-mounting the
     * step is cheap.
     */
    public function previewTopics(Request $request, CarouselGenerationService $service): JsonResponse
    {
        $user = $request->user();
        abort_if($user->onboarding_completed_at !== null, 403);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $profile = $workspace?->profile ?? [];

        if (blank($profile['brand_name'] ?? null)) {
            return response()->json(['topics' => []]);
        }

        $allowed = ['Portuguese (Brazil)', 'English'];
        $language = in_array($request->string('lang')->toString(), $allowed, true)
            ? $request->string('lang')->toString()
            : 'Portuguese (Brazil)';

        $cacheKey = "onboarding_preview_topics:{$user->id}:".now()->toDateString().':'.md5($language);

        try {
            $ideas = Cache::remember(
                $cacheKey,
                now()->endOfDay(),
                fn () => $service->generateIdeas($profile, $language),
            );
        } catch (\Throwable $e) {
            \Log::warning('Onboarding preview topics failed', ['message' => $e->getMessage()]);

            return response()->json(['topics' => [], 'error' => true]);
        }

        $topics = collect($ideas)
            ->take(2)
            ->map(fn (array $idea) => ['topic' => $idea['title'], 'title' => $idea['title']])
            ->values();

        return response()->json(['topics' => $topics]);
    }

    /**
     * Generate one Editorial Press deck (4 slides) as NDJSON for the preview step.
     * No premium gate — this is the pre-payment "aha" teaser.
     */
    public function previewDeck(Request $request, CarouselGenerationService $service): JsonResponse
    {
        $user = $request->user();
        abort_if($user->onboarding_completed_at !== null, 403);

        $validated = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
        ]);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $handle = Str::slug((string) data_get($workspace?->profile, 'brand_name', ''));

        try {
            $ndjson = $service->generateSlides(
                topic: $validated['topic'],
                style: $service->buildStyle('editorial-press', null),
                slideCount: 4,
                wordHighlight: true,
                language: 'Portuguese (Brazil)',
                template: 'editorial-press',
                imageStyle: '',
                handle: $handle,
                ctaSlide: true,
            );
        } catch (\Throwable $e) {
            \Log::warning('Onboarding preview deck failed', ['message' => $e->getMessage()]);

            return response()->json([
                'error' => 'generation_failed',
                'message' => 'Não foi possível gerar o carrossel. Tente novamente.',
            ], 503);
        }

        return response()->json(['ndjson' => $ndjson]);
    }

    /**
     * Generate one slide background image for the preview. BYOK-only, mirroring
     * CarouselGenerationController@generateImage but without the premium gate.
     */
    public function previewImage(Request $request, CarouselGenerationService $service): JsonResponse
    {
        $user = $request->user();
        abort_if($user->onboarding_completed_at !== null, 403);

        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:4000'],
            'aspect_ratio' => ['nullable', 'string', 'in:1:1,4:5,9:16,3:4,16:9'],
        ]);

        $byokKey = $user->byokGeminiKey();
        $usingPlatformKey = false;

        // No personal key: cover the preview on the platform key when enabled (marketing
        // spend), capped once per user via a durable atomic counter. Otherwise 402, and
        // the client renders the deck text-only.
        if ($byokKey === null) {
            if (! config('services.carousel_image.onboarding_preview')) {
                return response()->json([
                    'error' => 'missing_byok_key',
                    'message' => 'Conecte sua chave Gemini para gerar as imagens.',
                ], 402);
            }

            $counterKey = "onboarding_preview_platform_images:{$user->id}";
            // `add` creates the row atomically (no-op if present); `increment` is then
            // atomic on the database cache store, so parallel slide requests count once.
            Cache::add($counterKey, 0, now()->addDays(30));
            $count = Cache::increment($counterKey);

            if ($count > self::PREVIEW_PLATFORM_IMAGE_CAP) {
                return response()->json([
                    'error' => 'missing_byok_key',
                    'message' => 'Conecte sua chave Gemini para gerar as imagens.',
                ], 402);
            }

            $usingPlatformKey = true;
        }

        try {
            $base64 = $service->generateImage(
                $validated['prompt'],
                $validated['aspect_ratio'] ?? '4:5',
                $byokKey, // null on the platform path → platform-configured Gemini key
            );
        } catch (\Throwable $e) {
            // Refund the reserved budget so a failed image doesn't burn the user's cap.
            if ($usingPlatformKey) {
                Cache::decrement("onboarding_preview_platform_images:{$user->id}");
            }

            \Log::warning('Onboarding preview image failed', ['message' => $e->getMessage()]);

            return response()->json(['error' => 'Image generation failed'], 500);
        }

        return response()->json(['base64' => $base64]);
    }

    /**
     * Skip the plans step: finish onboarding without subscribing (soft paywall
     * applies from the dashboard).
     */
    public function skip(Request $request): RedirectResponse
    {
        return $this->completeOnboarding($request->user());
    }

    /**
     * Mark onboarding done and grant the welcome image credits, once. Idempotent:
     * a user who is already onboarded just gets redirected.
     */
    private function completeOnboarding(User $user): RedirectResponse
    {
        if ($user->onboarding_completed_at === null) {
            $user->onboarding_completed_at = now();
            $user->save();
            // Welcome grant: free managed-image credits to try the generator (1 credit = 1 image).
            $user->addCredits(15);
        }

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

    /**
     * Send the user to Stripe Checkout for the lifetime launch offer from the plans
     * step. Unlike LifetimeController@purchase (which returns to the dashboard), the
     * success URL completes onboarding so a mid-onboarding buyer isn't bounced back.
     * Fulfillment (lifetime_access_at) still happens in the Stripe webhook.
     */
    public function subscribeLifetime(Request $request, BillingCatalog $catalog): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasLifetimeAccess()) {
            return $this->completeOnboarding($user);
        }

        $priceId = $catalog->lifetime($catalog->currencyFor($request))['price_id'];

        abort_if(! $priceId, 404, 'Lifetime price not configured for this currency.');

        $checkout = $user->checkout($priceId, [
            'success_url' => route('onboarding.complete').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('onboarding'),
            'allow_promotion_codes' => true,
            'metadata' => [
                'type' => 'lifetime',
                'user_id' => (string) $user->id,
            ],
        ]);

        return redirect($checkout->url);
    }

    public function complete(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at === null) {
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

        $this->completeOnboarding($user);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Assinatura ativada! Bem-vindo ao Slidezz.']);

        return redirect()->route('dashboard');
    }
}
