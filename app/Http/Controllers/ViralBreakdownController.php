<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateViralBreakdown;
use App\Models\ViralBreakdown;
use App\Models\Workspace;
use App\Services\Video\TikTokVideoFetcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use ZipArchive;

class ViralBreakdownController extends Controller
{
    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $breakdowns = ViralBreakdown::where('workspace_id', $workspace->id)
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (ViralBreakdown $breakdown): array => [
                'id' => $breakdown->id,
                'title' => $this->summaryTitle($breakdown),
                'status' => $breakdown->status,
                'progress' => $breakdown->progress,
                'cover_url' => $this->coverUrl($breakdown),
                'created_at' => $breakdown->created_at?->diffForHumans(),
            ])
            ->all();

        return Inertia::render('ViralBreakdowns', [
            'breakdowns' => $breakdowns,
            'prefillUrl' => mb_substr((string) $request->query('url'), 0, 500),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $workspace = $this->workspace($request);

        $validated = $request->validate([
            'url' => [
                'required',
                'url',
                'max:500',
                function (string $attribute, mixed $value, callable $fail): void {
                    if (! app(TikTokVideoFetcher::class)->isSupportedUrl((string) $value)) {
                        $fail('Por enquanto só links do TikTok.');
                    }
                },
            ],
            'language' => ['nullable', 'string', Rule::in(['pt', 'en'])],
        ]);

        $locale = $request->user()->locale ?? 'pt';
        $languageShort = $validated['language'] ?? $locale;
        $language = $languageShort === 'en' ? 'English' : 'Portuguese (Brazil)';

        $breakdown = ViralBreakdown::create([
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'progress' => 0,
            'source_url' => $validated['url'],
            'language' => $language,
        ]);

        GenerateViralBreakdown::dispatch($breakdown);

        return response()->json(['id' => $breakdown->id], 201);
    }

    public function show(Request $request, ViralBreakdown $viralBreakdown): JsonResponse
    {
        $this->authorizeWorkspace($request, $viralBreakdown->workspace_id);

        return response()->json($this->payload($viralBreakdown));
    }

    public function download(Request $request, ViralBreakdown $viralBreakdown): mixed
    {
        $this->authorizeWorkspace($request, $viralBreakdown->workspace_id);

        if ($viralBreakdown->status !== 'done') {
            abort(404);
        }

        $disk = Storage::disk(config('filesystems.media_disk'));
        $slides = $viralBreakdown->slides ?? [];
        $tmp = tempnam(sys_get_temp_dir(), 'breakdown-zip-').'.zip';

        try {
            $zip = new ZipArchive;

            if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException('Falha ao criar o arquivo ZIP.');
            }

            foreach ($slides as $slide) {
                if (! is_array($slide) || ! isset($slide['path'])) {
                    continue;
                }

                $content = $disk->get($slide['path']);
                if ($content === null) {
                    continue;
                }

                $index = (int) ($slide['index'] ?? 0);
                $title = (string) ($slide['title'] ?? 'slide');
                $filename = sprintf('%02d-%s.mp4', $index, Str::slug($title) ?: 'slide');

                $zip->addFromString($filename, $content);
            }

            $zip->close();

            return response()->download($tmp, 'breakdown-'.$viralBreakdown->id.'.zip')->deleteFileAfterSend();
        } catch (\Throwable $e) {
            if (is_file($tmp)) {
                unlink($tmp);
            }

            throw $e;
        }
    }

    public function destroy(Request $request, ViralBreakdown $viralBreakdown): JsonResponse
    {
        $this->authorizeWorkspace($request, $viralBreakdown->workspace_id);

        $disk = Storage::disk(config('filesystems.media_disk'));
        $disk->deleteDirectory($viralBreakdown->storageDirectory());

        $viralBreakdown->delete();

        return response()->json(['success' => true]);
    }

    private function summaryTitle(ViralBreakdown $breakdown): string
    {
        $source = $breakdown->source;

        if (is_array($source) && isset($source['author']['handle'])) {
            $handle = '@'.$source['author']['handle'];
            $views = (int) ($source['views'] ?? 0);
            $viewsLabel = $this->compactNumber($views, $breakdown->language);

            return $handle.' · '.$viewsLabel.' views';
        }

        return $breakdown->source_url ?? 'Breakdown';
    }

    private function coverUrl(ViralBreakdown $breakdown): ?string
    {
        $slides = $breakdown->slides ?? [];

        return isset($slides[0]['url']) ? (string) $slides[0]['url'] : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ViralBreakdown $breakdown): array
    {
        $source = $breakdown->source;
        $result = $breakdown->result;
        $slides = $breakdown->slides ?? [];
        $stages = $result['stages'] ?? [];

        return [
            'id' => $breakdown->id,
            'status' => $breakdown->status,
            'progress' => $breakdown->progress,
            'error' => $breakdown->error,
            'source_url' => $breakdown->source_url,
            'author' => is_array($source) && isset($source['author']) ? [
                'handle' => (string) ($source['author']['handle'] ?? ''),
                'name' => (string) ($source['author']['name'] ?? ''),
                'followers' => $source['author']['followers'] ?? null,
                'avatar_url' => $source['author']['avatar_url'] ?? null,
            ] : null,
            'views' => is_array($source) && isset($source['views']) ? (int) $source['views'] : null,
            'niche' => is_array($result) && isset($result['niche']) ? (string) $result['niche'] : null,
            'caption' => $breakdown->caption,
            'slides' => array_map(fn (array $slide): array => [
                'index' => (int) ($slide['index'] ?? 0),
                'kind' => (string) ($slide['kind'] ?? ''),
                'key' => (string) ($slide['key'] ?? ''),
                'title' => (string) ($slide['title'] ?? ''),
                'duration' => (float) ($slide['duration'] ?? 0),
                'url' => (string) ($slide['url'] ?? ''),
            ], $slides),
            'stages' => array_map(fn (array $stage): array => [
                'key' => (string) ($stage['key'] ?? ''),
                'title' => (string) ($stage['title'] ?? ''),
                'label' => (string) ($stage['label'] ?? ''),
                'start' => (float) ($stage['start'] ?? 0),
                'end' => (float) ($stage['end'] ?? 0),
                'video_note' => (string) ($stage['video_note'] ?? ''),
            ], $stages),
            'completed_at' => $breakdown->completed_at?->toISOString(),
        ];
    }

    private function compactNumber(int $number, string $language): string
    {
        if ($language === 'English') {
            if ($number >= 1_000_000) {
                $value = $number / 1_000_000;
                $formatted = rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.');

                return $formatted.'M';
            }

            if ($number >= 1_000) {
                $value = $number / 1_000;
                $formatted = rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.');

                return $formatted.'K';
            }

            return (string) $number;
        }

        if ($number >= 1_000_000) {
            $value = number_format($number / 1_000_000, 1, ',', '');
            $value = rtrim(rtrim($value, '0'), ',');

            return $value.' mi';
        }

        if ($number >= 1_000) {
            $value = number_format($number / 1_000, 1, ',', '');
            $value = rtrim(rtrim($value, '0'), ',');

            return $value.' mil';
        }

        return (string) $number;
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
