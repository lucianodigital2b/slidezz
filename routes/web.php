<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ScheduleController;
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
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::inertia('library', 'Library')->name('library');
    Route::inertia('automations', 'Automations')->name('automations');
    Route::inertia('slideshow-editor', 'SlideEditor')->name('slideshow-editor');
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
});

require __DIR__.'/settings.php';
