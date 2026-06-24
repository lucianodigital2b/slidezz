<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationsController extends Controller
{
    /**
     * Show the integrations settings (BYOK Gemini key).
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/integrations', [
            'byokEnabled' => $user->byokEnabled(),
            'hasGeminiKey' => filled($user->gemini_api_key),
        ]);
    }

    /**
     * Store or clear the user's own Gemini API key (BYOK). Only persisted when
     * the user's plan allows BYOK; otherwise it's a no-op upsell surface.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => ['nullable', 'string', 'max:200'],
        ]);

        $user = $request->user();

        abort_unless($user->byokEnabled(), 403, 'BYOK is not available on your plan.');

        $user->gemini_api_key = filled($validated['gemini_api_key'] ?? null)
            ? trim($validated['gemini_api_key'])
            : null;
        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Integração atualizada.')]);

        return to_route('integrations.edit');
    }
}
