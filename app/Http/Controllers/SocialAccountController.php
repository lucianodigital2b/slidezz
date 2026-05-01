<?php

namespace App\Http\Controllers;

use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SocialAccountController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('profile.edit');
    }

    public function connect(Request $request, string $provider): RedirectResponse
    {
        $workspace = Workspace::firstOrCreate(
            ['owner_id' => $request->user()->id],
            ['name' => $request->user()->name."'s Workspace"]
        );

        session(['current_workspace_id' => $workspace->id]);

        $publisher = SocialPublisherFactory::make($provider);
        $redirectUrl = $publisher->authenticate();

        return redirect()->away($redirectUrl);
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        if ($request->has('error')) {
            return redirect()->route('profile.edit')
                ->with('error', $request->input('error_description', 'OAuth authorization was denied.'));
        }

        try {
            $publisher = SocialPublisherFactory::make($provider);
            $publisher->handleCallback($request->all());
        } catch (\Throwable $e) {
            return redirect()->route('profile.edit')
                ->with('error', 'Failed to connect account: '.$e->getMessage());
        }

        return redirect()->route('profile.edit')
            ->with('success', ucfirst($provider).' account connected successfully.');
    }

    public function destroy(Request $request, SocialAccount $socialAccount): RedirectResponse
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)
            ->where('id', $socialAccount->workspace_id)
            ->firstOrFail();

        abort_unless($socialAccount->workspace_id === $workspace->id, 403);

        $socialAccount->delete();

        return redirect()->route('profile.edit')
            ->with('success', 'Account disconnected.');
    }
}
