<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateVideoScript;
use App\Models\VideoScript;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VideoScriptController extends Controller
{
    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $videoScripts = VideoScript::where('workspace_id', $workspace->id)
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (VideoScript $videoScript): array => [
                'id' => $videoScript->id,
                'title' => $this->historyTitle($videoScript),
                'status' => $videoScript->status,
                'created_at' => $videoScript->created_at->diffForHumans(),
            ])
            ->all();

        return Inertia::render('VideoScripts', [
            'videoScripts' => $videoScripts,
            'prefillTopic' => mb_substr((string) $request->query('topic'), 0, 500),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $this->workspace($request);

        $validated = $request->validate([
            'topic' => ['nullable', 'string', 'max:500', 'required_without:reference_url'],
            'reference_url' => ['nullable', 'url', 'required_without:topic'],
            'source_url' => ['nullable', 'url'],
            'target_seconds' => ['nullable', 'integer', 'between:15,180'],
            'language' => ['nullable', 'string', Rule::in(['pt', 'en'])],
        ]);

        $locale = $request->user()->locale ?? 'pt';
        $languageShort = $validated['language'] ?? $locale;
        $language = $languageShort === 'en' ? 'English' : 'Portuguese (Brazil)';

        $videoScript = VideoScript::create([
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'topic' => $validated['topic'] ?? null,
            'reference_url' => $validated['reference_url'] ?? null,
            'source_url' => $validated['source_url'] ?? null,
            'language' => $language,
            'target_seconds' => (int) ($validated['target_seconds'] ?? 45),
        ]);

        GenerateVideoScript::dispatch($videoScript);

        return response()->json(['id' => $videoScript->id], 201);
    }

    public function show(Request $request, VideoScript $videoScript): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoScript->workspace_id);

        return response()->json($this->payload($videoScript));
    }

    public function destroy(Request $request, VideoScript $videoScript): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoScript->workspace_id);

        $videoScript->delete();

        return response()->json(['success' => true]);
    }

    private function historyTitle(VideoScript $videoScript): string
    {
        if (is_array($videoScript->result) && ! empty($videoScript->result['title'])) {
            return (string) $videoScript->result['title'];
        }

        if ($videoScript->topic !== null && $videoScript->topic !== '') {
            return $videoScript->topic;
        }

        return 'Roteiro sem título';
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(VideoScript $videoScript): array
    {
        return [
            'id' => $videoScript->id,
            'status' => $videoScript->status,
            'result' => $videoScript->result,
            'error' => $videoScript->error,
            'completed_at' => $videoScript->completed_at?->toISOString(),
        ];
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
