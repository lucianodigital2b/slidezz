<?php

namespace App\Http\Controllers;

use App\Jobs\AnalyzeProfile;
use App\Models\ProfileAnalysis;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileAnalysisController extends Controller
{
    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $analyses = ProfileAnalysis::where('workspace_id', $workspace->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (ProfileAnalysis $analysis): array => [
                'id' => $analysis->id,
                'status' => $analysis->status,
                'created_at' => $analysis->created_at->diffForHumans(),
                'summary' => $analysis->report['summary'] ?? null,
                'error' => $analysis->error,
            ]);

        $latest = ProfileAnalysis::where('workspace_id', $workspace->id)->latest()->first();

        $connectedAccounts = SocialAccount::where('workspace_id', $workspace->id)
            ->whereIn('provider', ['tiktok', 'instagram'])
            ->get(['provider', 'handle'])
            ->map(fn (SocialAccount $account): array => [
                'provider' => $account->provider,
                'username' => $account->handle,
            ]);

        return Inertia::render('ProfileAnalysis', [
            'analyses' => $analyses,
            'latestReport' => $latest?->report,
            'latestStatus' => $latest?->status,
            'latestError' => $latest?->error,
            'connectedAccounts' => $connectedAccounts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $this->workspace($request);

        $validated = $request->validate([
            'links' => ['nullable', 'array', 'max:10'],
            'links.*' => ['nullable', 'string', 'url'],
            'language' => ['nullable', Rule::in(['pt', 'en'])],
        ]);

        $links = collect($validated['links'] ?? [])
            ->map(fn ($link): string => trim((string) $link))
            ->filter(fn (string $link): bool => $link !== '')
            ->values()
            ->all();

        $hasConnectedAccount = SocialAccount::where('workspace_id', $workspace->id)
            ->whereIn('provider', ['tiktok', 'instagram'])
            ->exists();

        if ($links === [] && ! $hasConnectedAccount) {
            throw ValidationException::withMessages([
                'links' => 'Cole ao menos um link ou conecte uma conta do TikTok ou Instagram.',
            ]);
        }

        $language = $validated['language'] ?? ($request->user()->locale === 'en' ? 'en' : 'pt');

        $analysis = ProfileAnalysis::create([
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'language' => $language,
            'links' => $links,
        ]);

        AnalyzeProfile::dispatch($analysis);

        return response()->json([
            'id' => $analysis->id,
            'status' => 'pending',
        ], 201);
    }

    public function show(Request $request, ProfileAnalysis $profileAnalysis): JsonResponse
    {
        $this->authorizeWorkspace($request, $profileAnalysis->workspace_id);

        return response()->json([
            'id' => $profileAnalysis->id,
            'status' => $profileAnalysis->status,
            'report' => $profileAnalysis->report,
            'error' => $profileAnalysis->error,
            'completed_at' => $profileAnalysis->completed_at?->toISOString(),
        ]);
    }

    public function destroy(Request $request, ProfileAnalysis $profileAnalysis): RedirectResponse
    {
        $this->authorizeWorkspace($request, $profileAnalysis->workspace_id);

        $profileAnalysis->delete();

        return to_route('profile-analysis.index');
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }

    private function authorizeWorkspace(Request $request, int $workspaceId): void
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        abort_unless($workspaceIds->contains($workspaceId), 403);
    }
}
