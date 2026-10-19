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
     * Show the integrations settings (BYOK Gemini key + Anthropic key).
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/integrations', [
            'byokEnabled' => $user->byokEnabled(),
            'hasGeminiKey' => filled($user->gemini_api_key),
            'hasAnthropicKey' => filled($user->anthropic_api_key),
        ]);
    }

    /**
     * Store or clear the user's own API keys (BYOK). Every user can set keys.
     * Anthropic keys must start with sk-ant- when present.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => ['nullable', 'string', 'max:200'],
            'anthropic_api_key' => ['nullable', 'string', 'max:200', function ($attribute, $value, $fail) {
                if (filled($value) && ! str_starts_with($value, 'sk-ant-')) {
                    $fail('The Anthropic API key must start with sk-ant-.');
                }
            }],
        ]);

        $user = $request->user();

        // Each key has its own form, so only touch the field that was sent.
        if ($request->exists('gemini_api_key')) {
            $user->gemini_api_key = filled($validated['gemini_api_key'] ?? null)
                ? trim($validated['gemini_api_key'])
                : null;
        }

        if ($request->exists('anthropic_api_key')) {
            $user->anthropic_api_key = filled($validated['anthropic_api_key'] ?? null)
                ? trim($validated['anthropic_api_key'])
                : null;
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Integração atualizada.')]);

        return to_route('integrations.edit');
    }
}
