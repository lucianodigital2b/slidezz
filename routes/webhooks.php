<?php

use App\Http\Controllers\InstagramWebhookController;
use App\Http\Controllers\TikTokWebhookController;
use Illuminate\Support\Facades\Route;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;

Route::get('webhooks/tiktok', [TikTokWebhookController::class, 'verify'])->name('webhooks.tiktok.verify');
Route::post('webhooks/tiktok', [TikTokWebhookController::class, 'handle'])->name('webhooks.tiktok.handle');

Route::get('webhooks/instagram', [InstagramWebhookController::class, 'verify'])->name('webhooks.instagram.verify');
Route::post('webhooks/instagram', [InstagramWebhookController::class, 'handle'])->name('webhooks.instagram.handle');

Route::post('stripe/webhook', [CashierWebhookController::class, 'handleWebhook'])->name('cashier.webhook');
