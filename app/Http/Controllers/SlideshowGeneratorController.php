<?php

namespace App\Http\Controllers;

use App\Enums\SlideTextPreset;
use App\Jobs\GenerateSlideshow;
use App\Models\ContentProject;
use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

/**
 * One-off TikTok photo carousels: type a topic, get a finished 9:16 carousel.
 *
 * Recurring generation lives in {@see AutomationController}; both share the
 * {@see GenerateSlideshow} pipeline.
 */
class SlideshowGeneratorController extends Controller
{
    public function create(Request $request): Response
    {
        $workspace = $this->workspace($request);

        return Inertia::render('CreateTikTok', [
            'recent' => ContentProject::where('workspace_id', $workspace->id)
                ->where('type', 'slideshow')
                ->latest('id')
                ->limit(12)
                ->get()
                ->map(fn (ContentProject $project): array => $this->summarize($project))
                ->all(),
            'tiktokAccounts' => SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'tiktok')
                ->get(['id', 'handle', 'avatar'])
                ->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:12'],
            'image_source' => ['nullable', 'string', 'in:pinterest,ai'],
            'text_position' => ['nullable', 'string', 'in:top,center,bottom'],
            'text_preset' => ['nullable', Rule::in(SlideTextPreset::values())],
            'language' => ['nullable', 'string', 'max:50'],
            'social_account_id' => ['nullable', 'integer'],
            'publish_at' => ['nullable', 'date', 'after_or_equal:now'],
        ]);

        // Soft paywall, matching CarouselGenerationController::generate().
        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para gerar carrosséis de TikTok.',
            ], 402);
        }

        $workspace = $this->workspace($request);
        $accountId = $validated['social_account_id'] ?? null;

        if ($accountId) {
            SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'tiktok')
                ->findOrFail($accountId);
        }

        $project = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => Str::limit($validated['topic'], 120, ''),
            'type' => 'slideshow',
            'status' => 'generating',
            'script_data' => [
                'topic' => $validated['topic'],
                'slide_count' => $validated['slide_count'] ?? 6,
                'image_source' => $validated['image_source'] ?? 'pinterest',
                'text_position' => $validated['text_position'] ?? 'center',
                'text_preset' => $validated['text_preset'] ?? SlideTextPreset::Classic->value,
                'language' => $validated['language'] ?? 'Portuguese (Brazil)',
                'social_account_id' => $accountId,
                'publish_at' => $validated['publish_at'] ?? null,
            ],
        ]);

        GenerateSlideshow::dispatch($project);

        return response()->json($this->summarize($project), 202);
    }

    /**
     * Polled by the client while the job runs.
     */
    public function show(Request $request, ContentProject $contentProject): JsonResponse
    {
        $this->authorizeProject($request, $contentProject);

        return response()->json($this->summarize($contentProject));
    }

    public function destroy(Request $request, ContentProject $contentProject): JsonResponse
    {
        $this->authorizeProject($request, $contentProject);

        $disk = Storage::disk(config('filesystems.media_disk'));

        foreach ($contentProject->script_data['slides'] ?? [] as $slide) {
            if (! empty($slide['path'])) {
                $disk->delete($slide['path']);
            }
        }

        $contentProject->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Every slide as a ZIP, so the carousel can be posted by hand from a phone.
     */
    public function download(Request $request, ContentProject $contentProject): BinaryFileResponse
    {
        $this->authorizeProject($request, $contentProject);

        $slides = $contentProject->script_data['slides'] ?? [];

        abort_if($slides === [], 404, 'Este carrossel ainda não tem slides.');

        $disk = Storage::disk(config('filesystems.media_disk'));
        $zipPath = tempnam(sys_get_temp_dir(), 'slidezz-tiktok-').'.zip';
        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Não foi possível montar o ZIP.');
        }

        foreach ($slides as $index => $slide) {
            if (empty($slide['path']) || ! $disk->exists($slide['path'])) {
                continue;
            }

            $zip->addFromString(sprintf('%02d.jpg', $index + 1), $disk->get($slide['path']));
        }

        $caption = trim((string) ($contentProject->script_data['caption'] ?? ''));
        $hashtags = (array) ($contentProject->script_data['hashtags'] ?? []);

        if ($caption !== '' || $hashtags !== []) {
            $tags = implode(' ', array_map(fn (string $tag): string => '#'.$tag, $hashtags));
            $zip->addFromString('legenda.txt', trim($caption."\n\n".$tags));
        }

        $zip->close();

        return response()
            ->download($zipPath, Str::slug($contentProject->title ?: 'carrossel').'.zip')
            ->deleteFileAfterSend();
    }

    /**
     * @return array<string, mixed>
     */
    private function summarize(ContentProject $project): array
    {
        $data = $project->script_data ?? [];

        return [
            'id' => $project->id,
            'title' => $project->title,
            'status' => $project->status,
            'topic' => $data['topic'] ?? null,
            'caption' => $data['caption'] ?? null,
            'hashtags' => $data['hashtags'] ?? [],
            'error' => $data['error'] ?? null,
            'slides' => array_map(
                fn (array $slide): array => ['text' => $slide['text'] ?? '', 'url' => $slide['url'] ?? ''],
                $data['slides'] ?? [],
            ),
            'created_at' => $project->created_at?->toIso8601String(),
        ];
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }

    private function authorizeProject(Request $request, ContentProject $project): void
    {
        abort_unless($project->workspace_id === $this->workspace($request)->id, 403);
    }
}
