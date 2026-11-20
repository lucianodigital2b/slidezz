<?php

namespace App\Http\Controllers;

use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\FacebookPublisher;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SocialAccountController extends Controller
{
    private const PENDING_PAGES = 'facebook_pending_pages';

    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('profile.edit');
    }

    public function connect(Request $request, string $provider): RedirectResponse
    {
        abort_if($provider === 'instagram' && ! $request->user()->canUseInstagram(), 403);
        abort_if($provider === 'facebook' && ! $request->user()->canUseFacebook(), 403);

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

            // A person who manages several Pages picks which ones to connect.
            if ($publisher instanceof FacebookPublisher) {
                $authorized = $publisher->authorizedPages($request->all());

                if (count($authorized['pages']) > 1) {
                    session([self::PENDING_PAGES => [
                        ...$authorized,
                        'expires_at' => now()->addMinutes(30)->timestamp,
                    ]]);

                    return redirect()->route('social-accounts.facebook.pages');
                }

                $publisher->savePages($authorized['workspace_id'], $authorized['pages']);
            } else {
                $publisher->handleCallback($request->all());
            }
        } catch (\Throwable $e) {
            Log::error('[SocialAccount] Failed to connect account', [
                'provider' => $provider,
                'message' => $e->getMessage(),
                'exception' => $e::class,
            ]);

            return redirect()->route('profile.edit')
                ->with('error', 'Failed to connect account: '.$e->getMessage());
        }

        return redirect()->route('profile.edit')
            ->with('success', ucfirst($provider).' account connected successfully.');
    }

    /**
     * Page picker shown after Meta's dialog when more than one Page came back.
     * Page tokens stay in the server-side session, never in the props.
     */
    public function facebookPages(Request $request): Response|RedirectResponse
    {
        $pending = $this->pendingPages($request);

        if (! $pending) {
            return redirect()->route('profile.edit')
                ->with('error', 'The Facebook connection expired. Connect again.');
        }

        $connected = SocialAccount::where('workspace_id', $pending['workspace_id'])
            ->where('provider', 'facebook')
            ->pluck('provider_id')
            ->all();

        $pages = collect($pending['pages'])->map(fn (array $page) => [
            'id' => $page['id'],
            'name' => $page['name'],
            'avatar' => $page['avatar'],
            'connected' => in_array($page['id'], $connected, true),
        ]);

        // Reconnecting keeps the current choice; a first connection starts with all checked.
        $selected = $pages->where('connected', true)->pluck('id');

        return Inertia::render('settings/facebook-pages', [
            'pages' => $pages->values(),
            'selected' => ($selected->isEmpty() ? $pages->pluck('id') : $selected)->values(),
        ]);
    }

    public function saveFacebookPages(Request $request): RedirectResponse
    {
        $pending = $this->pendingPages($request);

        if (! $pending) {
            return redirect()->route('profile.edit')
                ->with('error', 'The Facebook connection expired. Connect again.');
        }

        $ids = array_column($pending['pages'], 'id');

        $validated = $request->validate([
            'page_ids' => ['required', 'array', 'min:1'],
            'page_ids.*' => ['string', 'in:'.implode(',', $ids)],
        ]);

        $selected = array_values(array_filter(
            $pending['pages'],
            fn (array $page) => in_array($page['id'], $validated['page_ids'], true),
        ));

        app(FacebookPublisher::class)->savePages($pending['workspace_id'], $selected);

        // Pages unchecked here are disconnected, like the Disconnect button.
        SocialAccount::where('workspace_id', $pending['workspace_id'])
            ->where('provider', 'facebook')
            ->whereIn('provider_id', array_diff($ids, $validated['page_ids']))
            ->get()
            ->each->delete();

        $request->session()->forget(self::PENDING_PAGES);

        return redirect()->route('profile.edit')
            ->with('success', count($selected).' Facebook Page(s) connected.');
    }

    /**
     * The Pages waiting to be picked, only for the workspace this user owns
     * and only within 30 minutes of Meta's dialog.
     *
     * @return array{workspace_id: int, pages: list<array<string, mixed>>, expires_at: int}|null
     */
    private function pendingPages(Request $request): ?array
    {
        $pending = $request->session()->get(self::PENDING_PAGES);

        if (! $pending || $pending['expires_at'] < now()->timestamp) {
            return null;
        }

        $owns = Workspace::where('id', $pending['workspace_id'])
            ->where('owner_id', $request->user()->id)
            ->exists();

        return $owns ? $pending : null;
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
