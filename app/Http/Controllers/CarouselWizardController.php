<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use App\Services\AI\CarouselGenerationService;
use App\Services\AI\UrlContentExtractorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CarouselWizardController extends Controller
{
    public function __construct(
        private readonly CarouselGenerationService $carouselGenerationService,
        private readonly UrlContentExtractorService $urlContentExtractorService,
    ) {}

    public function create(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $carouselConfig = data_get($workspace?->profile, 'carousel');

        return Inertia::render('CreateCarousel', [
            'workspaceConfig' => $carouselConfig,
        ]);
    }

    public function extractUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:500'],
            'type' => ['required', 'string', 'in:youtube,instagram,blog'],
        ]);

        try {
            $data = $this->urlContentExtractorService->extract($validated['url'], $validated['type']);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($data);
    }

    public function saveConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template' => ['required', 'string', 'max:100'],
            'archetype' => ['required', 'string', 'max:100'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();
        $profile = $workspace->profile ?? [];
        $profile['carousel'] = [
            'template' => $validated['template'],
            'archetype' => $validated['archetype'],
        ];
        $workspace->update(['profile' => $profile]);

        return response()->json(['success' => true]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:2000'],
            'template' => ['required', 'string', 'max:100'],
            'archetype' => ['required', 'string', 'max:100'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:10'],
            'save_config' => ['boolean'],
            'format' => ['nullable', 'string', 'in:post,stories'],
            'generate_images' => ['boolean'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        if ($request->boolean('save_config')) {
            $profile = $workspace->profile ?? [];
            $profile['carousel'] = [
                'template' => $validated['template'],
                'archetype' => $validated['archetype'],
            ];
            $workspace->update(['profile' => $profile]);
        }

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'format' => $validated['format'] ?? 'post',
            'slides' => [],
            'prompt' => $validated['topic'],
            'template' => $validated['template'],
        ]);

        $style = $this->carouselGenerationService->buildStyle($validated['template'], $validated['archetype']);

        return redirect()
            ->route('slideshow-editor.edit', $project)
            ->with('wizardTopic', $validated['topic'])
            ->with('wizardStyle', $style)
            ->with('wizardSlideCount', $validated['slide_count'] ?? 3)
            ->with('wizardGenerateImages', $request->boolean('generate_images', true));
    }
}
