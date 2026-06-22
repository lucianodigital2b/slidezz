<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\SlideTemplate;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SlideTemplateController extends Controller
{
    /**
     * List the current workspace's saved templates (without the heavy slides
     * payload — only what a gallery needs).
     */
    public function index(Request $request): JsonResponse
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();

        $templates = $workspace
            ? SlideTemplate::where('workspace_id', $workspace->id)
                ->latest()
                ->get(['id', 'title', 'format', 'thumbnail', 'created_at'])
            : collect();

        return response()->json(['templates' => $templates]);
    }

    /**
     * Save the editor's current slides as a reusable template.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'format' => ['required', 'string', 'in:post,stories'],
            'slides' => ['required', 'array', 'min:1'],
            'thumbnail' => ['nullable', 'string'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        $template = SlideTemplate::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'format' => $validated['format'],
            'slides' => $validated['slides'],
            'thumbnail' => $validated['thumbnail'] ?? null,
        ]);

        return response()->json(['id' => $template->id]);
    }

    /**
     * Create a fresh project from a template's slides and open it in the editor
     * (which renders the cloned slides).
     */
    public function use(Request $request, SlideTemplate $slideTemplate): RedirectResponse
    {
        $workspace = $this->authorizeWorkspace($request, $slideTemplate);

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $slideTemplate->title,
            'format' => $slideTemplate->format,
            'slides' => $slideTemplate->slides,
        ]);

        return redirect()->route('slideshow-editor.edit', $project);
    }

    public function destroy(Request $request, SlideTemplate $slideTemplate): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideTemplate);

        $slideTemplate->delete();

        return response()->json(['success' => true]);
    }

    private function authorizeWorkspace(Request $request, SlideTemplate $slideTemplate): Workspace
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)
            ->where('id', $slideTemplate->workspace_id)
            ->first();

        abort_unless($workspace !== null, 403);

        return $workspace;
    }
}
