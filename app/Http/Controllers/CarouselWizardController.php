<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\SlideTemplate;
use App\Models\Workspace;
use App\Services\AI\CarouselGenerationService;
use App\Services\AI\UrlContentExtractorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        $templates = $workspace
            ? SlideTemplate::where('workspace_id', $workspace->id)
                ->latest()
                ->get(['id', 'title', 'format', 'thumbnail'])
            : collect();

        return Inertia::render('CreateCarousel', [
            'workspaceConfig' => $carouselConfig,
            'savedTemplates' => $templates,
            // Prefill when arriving from the dashboard "Ideias do dia" picker.
            'initialTopic' => $request->string('topic')->toString() ?: null,
            'initialTitle' => $request->string('title')->toString() ?: null,
        ]);
    }

    /**
     * AI-generated "ideas of the day" from the workspace's brand DNA. Cached once
     * per user per day to keep the dashboard cheap; `?refresh=1` forces a fresh set.
     */
    public function ideas(Request $request): JsonResponse
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $profile = $workspace?->profile ?? [];

        if (blank($profile['brand_name'] ?? null)) {
            return response()->json(['ideas' => []]);
        }

        // The lang param feeds the LLM prompt, so accept only the supported
        // locales (never the raw string) to avoid prompt injection.
        $allowed = ['Portuguese (Brazil)', 'English'];
        $language = in_array($request->string('lang')->toString(), $allowed, true)
            ? $request->string('lang')->toString()
            : 'Portuguese (Brazil)';

        // Language is part of the key so PT and EN sets are cached separately.
        $cacheKey = "carousel_ideas:{$request->user()->id}:".now()->toDateString().':'.md5($language);

        if ($request->boolean('refresh')) {
            Cache::forget($cacheKey);
        }

        try {
            $ideas = Cache::remember(
                $cacheKey,
                now()->endOfDay(),
                fn () => $this->carouselGenerationService->generateIdeas($profile, $language),
            );
        } catch (\Throwable $e) {
            \Log::warning('Carousel idea generation failed', ['message' => $e->getMessage()]);

            return response()->json(['ideas' => [], 'error' => true]);
        }

        return response()->json(['ideas' => $ideas]);
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
            'archetype' => ['nullable', 'string', 'max:100'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();
        $profile = $workspace->profile ?? [];
        $profile['carousel'] = [
            'template' => $validated['template'],
            'archetype' => $validated['archetype'] ?? '',
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
            'archetype' => ['nullable', 'string', 'max:100'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:10'],
            'save_config' => ['boolean'],
            'save_as_template' => ['boolean'],
            'format' => ['nullable', 'string', 'in:post,stories'],
            'image_mode' => ['nullable', 'string', 'in:none,background,grid,alternate,mixed'],
            'image_style' => ['nullable', 'string', 'max:500'],
            'word_highlight' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:50'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        if ($request->boolean('save_config')) {
            $profile = $workspace->profile ?? [];
            $profile['carousel'] = [
                'template' => $validated['template'],
                'archetype' => $validated['archetype'] ?? '',
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

        $style = $this->carouselGenerationService->buildStyle($validated['template'], $validated['archetype'] ?? null);

        return redirect()
            ->route('slideshow-editor.edit', $project)
            ->with('wizardTopic', $validated['topic'])
            ->with('wizardStyle', $style)
            ->with('wizardTemplate', $validated['template'])
            ->with('wizardSlideCount', $validated['slide_count'] ?? 3)
            ->with('wizardImageMode', $validated['image_mode'] ?? 'mixed')
            ->with('wizardImageStyle', $validated['image_style'] ?? '')
            ->with('wizardWordHighlight', $validated['word_highlight'] ?? true)
            ->with('wizardLanguage', $validated['language'] ?? 'Portuguese (Brazil)')
            ->with('wizardSaveAsTemplate', $request->boolean('save_as_template'));
    }
}
