<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\CarouselGenerationController;
use App\Http\Controllers\CarouselWizardController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CreditController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LifetimeController;
use App\Http\Controllers\MetaEventController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SlideProjectController;
use App\Http\Controllers\SlideTemplateController;
use App\Http\Controllers\SocialAccountController;
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
    Route::get('onboarding/complete', [OnboardingController::class, 'complete'])->name('onboarding.complete');
});

Route::middleware(['auth', 'verified', EnsureOnboardingComplete::class])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // AI generator entry: "Ideias do dia" — picks brand-DNA ideas or a custom topic.
    Route::inertia('generate', 'Generate')->name('generate');

    Route::inertia('library', 'Library')->name('library');
    Route::inertia('automations', 'Automations')->name('automations');
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
