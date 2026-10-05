<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use App\Services\AI\AppScreenshotCopyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "App screenshots" creation mode: the store-listing screenshots for the App
 * Store and Google Play, in every device size and every store locale.
 */
class AppScreenshotController extends Controller
{
    /** Design formats the mode can produce, mapped to the store they belong to. */
    private const FORMATS = ['appstore', 'appstore_ipad', 'playstore'];

    /** Device mockups a screenshot can sit in, mirroring DEVICE_FRAMES in appStore.ts. */
    private const DEVICE_FRAMES = ['iphone-14-pro', 'iphone', 'flat'];

    public function __construct(private readonly AppScreenshotCopyService $copyService) {}

    public function create(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();

        return Inertia::render('CreateAppScreenshots', [
            'brand' => $this->brandProfile($workspace),
            'appName' => data_get($workspace?->profile, 'brand_name') ?? $workspace?->name,
        ]);
    }

    /**
     * Create the project shell and hand the editor the brief it needs to build
     * the screenshots client-side (the uploaded device shots ride along in
     * sessionStorage, like the carousel wizard's CTA image).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'app_name' => ['required', 'string', 'max:120'],
            'pitch' => ['required', 'string', 'max:2000'],
            'format' => ['required', 'string', 'in:'.implode(',', self::FORMATS)],
            'theme' => ['required', 'string', 'max:60'],
            'layout' => ['required', 'string', 'in:caption_top,caption_bottom,alternate'],
            'device_frame' => ['nullable', 'string', 'in:'.implode(',', self::DEVICE_FRAMES)],
            'screen_count' => ['required', 'integer', 'min:1', 'max:10'],
            'language' => ['nullable', 'string', 'max:50'],
            'tone' => ['nullable', 'string', 'max:200'],
            'screen_labels' => ['nullable', 'array', 'max:10'],
            'screen_labels.*' => ['nullable', 'string', 'max:200'],
            'locales' => ['nullable', 'array', 'max:40'],
            'locales.*' => ['string', 'max:12'],
            'ai_copy' => ['nullable', 'boolean'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'format' => $validated['format'],
            'slides' => [],
            'prompt' => $validated['pitch'],
            'template' => 'app-screenshots',
        ]);

        return redirect()
            ->route('slideshow-editor.edit', $project)
            ->with('screenshotConfig', [
                'appName' => $validated['app_name'],
                'pitch' => $validated['pitch'],
                'format' => $validated['format'],
                'theme' => $validated['theme'],
                'layout' => $validated['layout'],
                'deviceFrame' => $validated['device_frame'] ?? self::DEVICE_FRAMES[0],
                'screenCount' => $validated['screen_count'],
                'language' => $validated['language'] ?? 'Portuguese (Brazil)',
                'tone' => $validated['tone'] ?? '',
                'screenLabels' => array_values($validated['screen_labels'] ?? []),
                'locales' => array_values($validated['locales'] ?? []),
                'aiCopy' => $request->boolean('ai_copy', true),
            ]);
    }

    /** Write the caption overlay (headline + subheadline) for each screenshot. */
    public function captions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:120'],
            'pitch' => ['required', 'string', 'max:2000'],
            'count' => ['required', 'integer', 'min:1', 'max:10'],
            'language' => ['nullable', 'string', 'max:50'],
            'store' => ['nullable', 'string', 'in:appstore,playstore'],
            'tone' => ['nullable', 'string', 'max:200'],
            'screen_labels' => ['nullable', 'array', 'max:10'],
            'screen_labels.*' => ['nullable', 'string', 'max:200'],
        ]);

        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para gerar textos com IA.',
            ], 402);
        }

        try {
            $captions = $this->copyService->generateCaptions(
                appName: $validated['app_name'],
                pitch: $validated['pitch'],
                count: $validated['count'],
                language: $validated['language'] ?? 'Portuguese (Brazil)',
                store: $validated['store'] ?? 'appstore',
                screenLabels: array_values($validated['screen_labels'] ?? []),
                tone: ($validated['tone'] ?? '') ?: 'confident and benefit-driven',
            );
        } catch (\Throwable $e) {
            \Log::error('App screenshot caption generation failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);

            return response()->json([
                'error' => 'generation_failed',
                'message' => 'Não foi possível gerar os textos. Tente novamente.',
            ], 503);
        }

        return response()->json(['captions' => $captions]);
    }

    /** Translate every caption of a project into one store locale. */
    public function translate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'language' => ['required', 'string', 'max:60'],
            'app_name' => ['nullable', 'string', 'max:120'],
            'items' => ['required', 'array', 'min:1', 'max:60'],
            'items.*.id' => ['required', 'string', 'max:64'],
            'items.*.text' => ['required', 'string', 'max:400'],
            'items.*.highlight' => ['nullable', 'string', 'max:200'],
            'items.*.max_chars' => ['nullable', 'integer', 'min:8', 'max:400'],
        ]);

        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para localizar as telas com IA.',
            ], 402);
        }

        try {
            $translations = $this->copyService->translate(
                items: $validated['items'],
                language: $validated['language'],
                appName: $validated['app_name'] ?? '',
            );
        } catch (\Throwable $e) {
            \Log::error('App screenshot translation failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'language' => $validated['language'],
            ]);

            return response()->json([
                'error' => 'translation_failed',
                'message' => 'Não foi possível traduzir as telas. Tente novamente.',
            ], 503);
        }

        return response()->json(['translations' => $translations]);
    }

    /**
     * @return array{color: ?string, accent: ?string, logoUrl: ?string}
     */
    private function brandProfile(?Workspace $workspace): array
    {
        if (! $workspace) {
            return ['color' => null, 'accent' => null, 'logoUrl' => null];
        }

        $logoPath = $workspace->logo_path ?? data_get($workspace->profile, 'logo_path');
        $primary = data_get($workspace->profile, 'palette.primary') ?? $workspace->brand_color;

        return [
            'color' => $primary,
            'accent' => data_get($workspace->profile, 'palette.accent') ?? $primary,
            'logoUrl' => $logoPath ? Storage::disk('public')->url($logoPath) : null,
        ];
    }
}
