<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AppScreenshotController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\CarouselGenerationController;
use App\Http\Controllers\CarouselWizardController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HookCsvController;
use App\Http\Controllers\LifetimeController;
use App\Http\Controllers\MediaLibraryController;
use App\Http\Controllers\MetaEventController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SlideProjectController;
use App\Http\Controllers\SlideshowGeneratorController;
use App\Http\Controllers\SlideTemplateController;
use App\Http\Controllers\SocialAccountController;
use App\Http\Controllers\TikTokDraftController;
use App\Http\Controllers\VideoProjectController;
use App\Http\Middleware\EnsureOnboardingComplete;
use App\Http\Middleware\RedirectBasedOnCountry;
use App\Models\SlideProject;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'LandingEn', [
    'canRegister' => Features::enabled(Features::registration()),
])->middleware(RedirectBasedOnCountry::class)->name('home');

Route::inertia('/br', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home.br');

Route::inertia('/privacy-policy', 'Policy')->name('privacy-policy');
Route::inertia('/terms', 'Terms')->name('terms');

// Public how-to: creating a free Gemini API key on Google AI Studio (linked
// from the onboarding BYOK step and the integrations settings).
Route::inertia('/chave-gemini', 'GeminiKeyGuide')->name('gemini-key.guide');

// Meta Pixel browser events mirrored to the Conversions API (works for guests too).
Route::post('meta/event', [MetaEventController::class, 'store'])
    ->middleware('throttle:60,1')
    ->name('meta.event');

// Guest checkout: pick a plan on the landing page and create the account on
// Stripe Checkout itself, then provision it on the success redirect.
Route::post('checkout', [CheckoutController::class, 'create'])->name('checkout.create');
Route::get('checkout/success', [CheckoutController::class, 'success'])->name('checkout.success');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding');
    Route::post('onboarding/profile', [OnboardingController::class, 'saveProfile'])->name('onboarding.profile');
    Route::post('onboarding/subscribe', [OnboardingController::class, 'subscribe'])->name('onboarding.subscribe');
    Route::post('onboarding/lifetime', [OnboardingController::class, 'subscribeLifetime'])->name('onboarding.lifetime');
    Route::post('onboarding/skip', [OnboardingController::class, 'skip'])->name('onboarding.skip');
    Route::get('onboarding/complete', [OnboardingController::class, 'complete'])->name('onboarding.complete');

    // "Aha" preview: brand-tailored carousels shown between the profile and the
    // plans step. Pre-payment (no premium gate), so throttled to curb abuse.
    Route::post('onboarding/preview/topics', [OnboardingController::class, 'previewTopics'])
        ->middleware('throttle:10,1')->name('onboarding.preview.topics');
    Route::post('onboarding/preview/deck', [OnboardingController::class, 'previewDeck'])
        ->middleware('throttle:12,1')->name('onboarding.preview.deck');
    Route::post('onboarding/preview/image', [OnboardingController::class, 'previewImage'])
        ->middleware('throttle:30,1')->name('onboarding.preview.image');
});

Route::middleware(['auth', 'verified', EnsureOnboardingComplete::class])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // AI generator entry: "Ideias do dia" — picks brand-DNA ideas or a custom topic.
    Route::inertia('generate', 'Generate')->name('generate');

    Route::inertia('library', 'Library')->name('library');

    // TikTok photo carousels: Pinterest photo + TikTok Sans overlay, rendered server-side.
    Route::get('tiktok/create', [SlideshowGeneratorController::class, 'create'])->name('tiktok.create');
    Route::post('tiktok', [SlideshowGeneratorController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('tiktok.store');
    Route::get('tiktok/{contentProject}', [SlideshowGeneratorController::class, 'show'])->name('tiktok.show');
    Route::get('tiktok/{contentProject}/download', [SlideshowGeneratorController::class, 'download'])->name('tiktok.download');
    Route::delete('tiktok/{contentProject}', [SlideshowGeneratorController::class, 'destroy'])->name('tiktok.destroy');

    // Drafts sent to the creator's TikTok inbox (they add sound + caption and post from the app).
    Route::middleware('throttle:20,1')->group(function () {
        Route::post('tiktok/{contentProject}/draft', [TikTokDraftController::class, 'contentProject'])->name('tiktok.draft');
        Route::post('slideshow-editor/{slideProject}/publish/tiktok', [TikTokDraftController::class, 'slideProject'])->name('slideshow-editor.publish.tiktok');
        Route::post('videos/{videoProject}/publish/tiktok', [TikTokDraftController::class, 'videoProject'])->name('videos.publish.tiktok');
    });
    Route::get('tiktok-drafts/{schedule}', [TikTokDraftController::class, 'status'])->name('tiktok-drafts.status');

    Route::get('automations', [AutomationController::class, 'index'])->name('automations');
    Route::post('automations', [AutomationController::class, 'store'])->name('automations.store');
    Route::put('automations/{automation}', [AutomationController::class, 'update'])->name('automations.update');
    Route::delete('automations/{automation}', [AutomationController::class, 'destroy'])->name('automations.destroy');
    Route::post('automations/{automation}/run', [AutomationController::class, 'runNow'])
        ->middleware('throttle:10,1')
        ->name('automations.run');
    Route::get('media-library', [MediaLibraryController::class, 'index'])->name('media-library');
    Route::post('media-library', [MediaLibraryController::class, 'store'])->name('media-library.store');
    Route::post('media-library/import', [MediaLibraryController::class, 'import'])
        ->middleware('throttle:10,1')
        ->name('media-library.import');
    Route::delete('media-library/{mediaLibraryItem}', [MediaLibraryController::class, 'destroy'])->name('media-library.destroy');

    Route::post('hooks/csv', [HookCsvController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('hooks.csv');

    Route::get('slideshow-editor', [SlideProjectController::class, 'index'])->name('slideshow-editor.index');
    Route::get('slideshow-editor/create', [SlideProjectController::class, 'create'])->name('slideshow-editor.create');
    Route::get('slideshow-editor/{slideProject}', [SlideProjectController::class, 'edit'])->name('slideshow-editor.edit');
    Route::post('slideshow-editor', [SlideProjectController::class, 'store'])->name('slideshow-editor.store');
    Route::put('slideshow-editor/{slideProject}', [SlideProjectController::class, 'update'])->name('slideshow-editor.update');
    Route::post('slideshow-editor/{slideProject}/duplicate', [SlideProjectController::class, 'duplicate'])->name('slideshow-editor.duplicate');

    Route::get('slide-templates', [SlideTemplateController::class, 'index'])->name('slide-templates.index');
    Route::post('slide-templates', [SlideTemplateController::class, 'store'])->name('slide-templates.store');
    Route::post('slide-templates/{slideTemplate}/use', [SlideTemplateController::class, 'use'])->name('slide-templates.use');
    Route::delete('slide-templates/{slideTemplate}', [SlideTemplateController::class, 'destroy'])->name('slide-templates.destroy');
    Route::post('slideshow-editor/{slideProject}/publish/instagram', [SlideProjectController::class, 'publishInstagram'])->name('slideshow-editor.publish.instagram');
    Route::delete('slideshow-editor/{slideProject}', [SlideProjectController::class, 'destroy'])->name('slideshow-editor.destroy');

    // Videos: a clip timeline previewed with @remotion/player, rendered to MP4 by a queued Remotion job.
    Route::get('videos', [VideoProjectController::class, 'index'])->name('videos.index');
    Route::post('videos', [VideoProjectController::class, 'store'])->name('videos.store');
    Route::post('slideshow-editor/{slideProject}/video', [VideoProjectController::class, 'storeFromSlides'])->name('slideshow-editor.video');
    Route::get('videos/{videoProject}', [VideoProjectController::class, 'edit'])->name('videos.edit');
    Route::put('videos/{videoProject}', [VideoProjectController::class, 'update'])->name('videos.update');
    Route::post('videos/{videoProject}/media', [VideoProjectController::class, 'media'])
        ->middleware('throttle:60,1')
        ->name('videos.media');
    Route::post('videos/{videoProject}/render', [VideoProjectController::class, 'render'])
        ->middleware('throttle:10,1')
        ->name('videos.render');
    Route::get('videos/{videoProject}/status', [VideoProjectController::class, 'status'])->name('videos.status');
    Route::delete('videos/{videoProject}', [VideoProjectController::class, 'destroy'])->name('videos.destroy');
    Route::inertia('image-collections', 'ImageCollections')->name('image-collections');
    Route::inertia('database', 'Database')->name('database');

    Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule');
    Route::post('schedule', [ScheduleController::class, 'store'])->name('schedule.store');

    Route::redirect('social-accounts', '/settings/profile');
    Route::get('social-accounts/{provider}/connect', [SocialAccountController::class, 'connect'])->name('social-accounts.connect');
    Route::get('social-accounts/{provider}/callback', [SocialAccountController::class, 'callback'])->name('social-accounts.callback');
    // Alias matching the redirect URIs registered in the TikTok Developer Portal
    Route::get('{provider}/callback', [SocialAccountController::class, 'callback']);
    Route::delete('social-accounts/{socialAccount}', [SocialAccountController::class, 'destroy'])->name('social-accounts.destroy');

    Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics');
    Route::post('analytics/sync', [AnalyticsController::class, 'sync'])->name('analytics.sync');

    Route::post('credits/purchase', [CreditController::class, 'purchase'])->name('credits.purchase');
    Route::post('lifetime/purchase', [LifetimeController::class, 'purchase'])->name('lifetime.purchase');

    Route::post('carousel/generate', [CarouselGenerationController::class, 'generate'])->name('carousel.generate');
    Route::post('carousel/generate-image', [CarouselGenerationController::class, 'generateImage'])->name('carousel.generate-image');

    // App Store / Google Play screenshot mode.
    Route::get('app-screenshots/create', [AppScreenshotController::class, 'create'])->name('app-screenshots.create');
    Route::post('app-screenshots', [AppScreenshotController::class, 'store'])->name('app-screenshots.store');
    Route::post('app-screenshots/captions', [AppScreenshotController::class, 'captions'])
        ->middleware('throttle:20,1')
        ->name('app-screenshots.captions');
    // One request per locale, so a "translate every locale" run fires a burst.
    Route::post('app-screenshots/translate', [AppScreenshotController::class, 'translate'])
        ->middleware('throttle:60,1')
        ->name('app-screenshots.translate');

    Route::get('carousel/create', [CarouselWizardController::class, 'create'])->name('carousel.create');
    // "Ideias do dia": cached daily, but ?refresh=1 forces a fresh LLM call — throttle
    // per user so the regenerate button can't be spammed into a pile of LLM requests.
    Route::get('carousel/ideas', [CarouselWizardController::class, 'ideas'])
        ->middleware('throttle:10,1')
        ->name('carousel.ideas');
    Route::post('carousel/extract-url', [CarouselWizardController::class, 'extractUrl'])->name('carousel.extract-url');
    Route::post('carousel/save-config', [CarouselWizardController::class, 'saveConfig'])->name('carousel.save-config');
    Route::post('carousel', [CarouselWizardController::class, 'store'])->name('carousel.store');

    if (app()->isLocal()) {
        Route::get('dev/test-wizard/{slideProject}', function (SlideProject $slideProject) {
            return redirect()
                ->route('slideshow-editor.edit', $slideProject)
                ->with('wizardTopic', "AI\'s Economics Don't Make Sense")
                ->with('wizardTemplate', 'dark-cards')
                ->with('wizardSlideCount', 5)
                ->with('wizardImageMode', 'alternate')
                ->with('wizardWordHighlight', true);
        })->name('dev.test-wizard');

        // Competitor-style carousel: cinematic, subject-accurate Gemini photos
        // (full-bleed background), bold pop-magazine ALL CAPS typography, and a
        // single gradient-highlighted word with curiosity-gap hooks.
        Route::get('dev/test-wizard-competitor/{slideProject}', function (SlideProject $slideProject) {
            return redirect()
                ->route('slideshow-editor.edit', $slideProject)
                ->with('wizardTopic', 'Neymar vai jogar a Copa de 2026?')
                // ->with('wizardStyle', 'high-energy, pop-culture, attention-grabbing voice. Hook archetype: authoritative prophecy fulfilled hook, revelation that surprises everyone.')
                ->with('wizardTemplate', 'pop-magazine')
                ->with('wizardSlideCount', 5)
                ->with('wizardImageMode', 'background')
                ->with('wizardWordHighlight', true);
        })->name('dev.test-wizard-competitor');

        // Twitter/X-style thread: white background, profile header (avatar, name,
        // verified badge, @handle), tweet body copy, and a media card — rendered
        // with the Chirp-like Albert Sans typeface.
        Route::get('dev/test-wizard-twitter/{slideProject}', function (SlideProject $slideProject) {
            return redirect()
                ->route('slideshow-editor.edit', $slideProject)
                ->with('wizardTopic', 'Mandei meu SaaS pra um amigo e ele achou 5 erros que explicam por que eu tinha zero vendas')
                ->with('wizardStyle', 'direct, first-person founder voice, like a viral Twitter/X thread. Hook archetype: personal confession that reveals a costly mistake.')
                ->with('wizardTemplate', 'twitter-x')
                ->with('wizardSlideCount', 5)
                ->with('wizardImageMode', 'none')
                ->with('wizardWordHighlight', false);
        })->name('dev.test-wizard-twitter');

        // Ticket-style deck: aesthetic Fraunces serif on a die-cut ticket shape over a
        // black canvas. Cover ticket uses the workspace brand color; inner tickets are
        // white, with corner chrome (deck title, number, handle) and the workspace logo.
        Route::get('dev/test-wizard-ticket/{slideProject}', function (SlideProject $slideProject) {
            return redirect()
                ->route('slideshow-editor.edit', $slideProject)
                ->with('wizardTopic', 'Como construímos um produto real sem escrever código')
                ->with('wizardTemplate', 'ticket')
                ->with('wizardSlideCount', 5)
                ->with('wizardImageMode', 'none')
                ->with('wizardWordHighlight', false);
        })->name('dev.test-wizard-ticket');
    }
});

require __DIR__.'/settings.php';
