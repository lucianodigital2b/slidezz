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
     * Store or clear the user's own Gemini API key (BYOK). Every user can set
     * a key — image generation only works with one connected.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => ['nullable', 'string', 'max:200'],
        ]);

        $user = $request->user();

        $user->gemini_api_key = filled($validated['gemini_api_key'] ?? null)
            ? trim($validated['gemini_api_key'])
            : null;
        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Integração atualizada.')]);

        return to_route('integrations.edit');
    }
}
