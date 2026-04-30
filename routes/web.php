<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\CarouselGenerationController;
use App\Http\Controllers\CarouselWizardController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SlideProjectController;
use App\Http\Controllers\SocialAccountController;
use App\Http\Middleware\EnsureOnboardingComplete;
use App\Http\Middleware\RedirectBasedOnCountry;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->middleware(RedirectBasedOnCountry::class)->name('home');

Route::inertia('/en', 'LandingEn', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home.en');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding');
    Route::post('onboarding/profile', [OnboardingController::class, 'saveProfile'])->name('onboarding.profile');
    Route::post('onboarding/subscribe', [OnboardingController::class, 'subscribe'])->name('onboarding.subscribe');
    Route::get('onboarding/complete', [OnboardingController::class, 'complete'])->name('onboarding.complete');
});

Route::middleware(['auth', 'verified', EnsureOnboardingComplete::class])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::inertia('library', 'Library')->name('library');
    Route::inertia('automations', 'Automations')->name('automations');
    Route::get('slideshow-editor', [SlideProjectController::class, 'index'])->name('slideshow-editor.index');
    Route::get('slideshow-editor/create', [SlideProjectController::class, 'create'])->name('slideshow-editor.create');
    Route::get('slideshow-editor/{slideProject}', [SlideProjectController::class, 'edit'])->name('slideshow-editor.edit');
    Route::post('slideshow-editor', [SlideProjectController::class, 'store'])->name('slideshow-editor.store');
    Route::put('slideshow-editor/{slideProject}', [SlideProjectController::class, 'update'])->name('slideshow-editor.update');
    Route::post('slideshow-editor/{slideProject}/duplicate', [SlideProjectController::class, 'duplicate'])->name('slideshow-editor.duplicate');
    Route::delete('slideshow-editor/{slideProject}', [SlideProjectController::class, 'destroy'])->name('slideshow-editor.destroy');
    Route::inertia('image-collections', 'ImageCollections')->name('image-collections');
    Route::inertia('database', 'Database')->name('database');

    Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule');
    Route::post('schedule', [ScheduleController::class, 'store'])->name('schedule.store');

    Route::get('social-accounts', [SocialAccountController::class, 'index'])->name('social-accounts.index');
    Route::get('social-accounts/{provider}/connect', [SocialAccountController::class, 'connect'])->name('social-accounts.connect');
    Route::get('social-accounts/{provider}/callback', [SocialAccountController::class, 'callback'])->name('social-accounts.callback');
    // Alias matching the redirect URIs registered in the TikTok Developer Portal
    Route::get('{provider}/callback', [SocialAccountController::class, 'callback']);
    Route::delete('social-accounts/{socialAccount}', [SocialAccountController::class, 'destroy'])->name('social-accounts.destroy');

    Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics');
    Route::post('analytics/sync', [AnalyticsController::class, 'sync'])->name('analytics.sync');

    Route::post('carousel/generate', [CarouselGenerationController::class, 'generate'])->name('carousel.generate');
    Route::post('carousel/generate-image', [CarouselGenerationController::class, 'generateImage'])->name('carousel.generate-image');

    Route::get('carousel/create', [CarouselWizardController::class, 'create'])->name('carousel.create');
    Route::post('carousel/extract-url', [CarouselWizardController::class, 'extractUrl'])->name('carousel.extract-url');
    Route::post('carousel/save-config', [CarouselWizardController::class, 'saveConfig'])->name('carousel.save-config');
    Route::post('carousel', [CarouselWizardController::class, 'store'])->name('carousel.store');
});

require __DIR__.'/settings.php';
