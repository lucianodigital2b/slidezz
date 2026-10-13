<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokensController extends Controller
{
    /**
     * Show the user's personal access tokens (used to connect MCP clients such
     * as Claude Code).
     */
    public function edit(Request $request): Response
    {
        $tokens = $request->user()->tokens()
            ->latest()
            ->get(['id', 'name', 'last_used_at', 'created_at'])
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => $token->id,
                'name' => $token->name,
                'last_used_at' => $token->last_used_at?->diffForHumans(),
                'created_at' => $token->created_at->diffForHumans(),
            ]);

        return Inertia::render('settings/api-tokens', [
            'tokens' => $tokens,
            // The plaintext token is flashed exactly once, right after creation.
            'newToken' => $request->session()->get('newToken'),
            'mcpUrl' => rtrim(config('app.url'), '/').'/mcp',
        ]);
    }

    /**
     * Create a new personal access token and flash its plaintext value once.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $token = $request->user()->createToken($validated['name']);

        return to_route('api-tokens.edit')->with('newToken', $token->plainTextToken);
    }

    /**
     * Revoke one of the user's tokens.
     */
    public function destroy(Request $request, string $token): RedirectResponse
    {
        $request->user()->tokens()->whereKey($token)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Token revogado.')]);

        return to_route('api-tokens.edit');
    }
}
