<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class SlideProjectController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('SlideEditor', [
            'slideProject' => null,
        ]);
    }

    public function edit(Request $request, SlideProject $slideProject): Response
    {
        $this->authorizeWorkspace($request, $slideProject);

        $wizardConfig = session('wizardTopic') ? [
            'topic' => session('wizardTopic'),
            'style' => session('wizardStyle'),
        ] : null;

        return Inertia::render('SlideEditor', [
            'slideProject' => $slideProject->only('id', 'title', 'format', 'slides'),
            'wizardConfig' => $wizardConfig,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'format' => ['required', 'string', 'in:post,stories'],
            'slides' => ['required', 'array'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'format' => $validated['format'],
            'slides' => $validated['slides'],
        ]);

        return response()->json(['id' => $project->id]);
    }

    public function update(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'format' => ['required', 'string', 'in:post,stories'],
            'slides' => ['required', 'array'],
        ]);

        $slideProject->update($validated);

        return response()->json(['id' => $slideProject->id]);
    }

    public function duplicate(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject);

        $copy = $slideProject->replicate();
        $copy->title = $slideProject->title.' (cópia)';
        $copy->save();

        return response()->json(['id' => $copy->id]);
    }

    public function destroy(Request $request, SlideProject $slideProject): HttpResponse
    {
        $this->authorizeWorkspace($request, $slideProject);
        $slideProject->delete();

        return response()->noContent();
    }

    private function authorizeWorkspace(Request $request, SlideProject $slideProject): void
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        abort_unless($workspaceIds->contains($slideProject->workspace_id), 403);
    }
}
