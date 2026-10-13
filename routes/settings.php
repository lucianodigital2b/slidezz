<?php

use App\Http\Controllers\Settings\ApiTokensController;
use App\Http\Controllers\Settings\BillingController;
use App\Http\Controllers\Settings\BrandController;
use App\Http\Controllers\Settings\IntegrationsController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    Route::get('settings/brand', [BrandController::class, 'edit'])->name('brand.edit');
    Route::post('settings/brand', [BrandController::class, 'update'])->name('brand.update');

    Route::get('settings/integrations', [IntegrationsController::class, 'edit'])->name('integrations.edit');
    Route::patch('settings/integrations', [IntegrationsController::class, 'update'])->name('integrations.update');

    Route::get('settings/api-tokens', [ApiTokensController::class, 'edit'])->name('api-tokens.edit');
    Route::post('settings/api-tokens', [ApiTokensController::class, 'store'])->name('api-tokens.store');
    Route::delete('settings/api-tokens/{token}', [ApiTokensController::class, 'destroy'])->name('api-tokens.destroy');

    Route::get('settings/billing', [BillingController::class, 'edit'])->name('billing.edit');
    Route::post('settings/billing/subscribe', [BillingController::class, 'subscribe'])->name('billing.subscribe');
    Route::post('settings/billing/cancel', [BillingController::class, 'cancel'])->name('billing.cancel');
    Route::post('settings/billing/resume', [BillingController::class, 'resume'])->name('billing.resume');
    Route::get('settings/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::get('settings/billing/invoices/{invoice}', [BillingController::class, 'downloadInvoice'])->name('billing.invoice.download');
});
