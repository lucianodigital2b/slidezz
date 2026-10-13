<?php

namespace App\Jobs;

use App\Enums\SlideTextPreset;
use App\Models\Asset;
use App\Models\AutomationRun;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Services\AI\SlideshowScriptService;
use App\Services\Images\ImageSourceFactory;
use App\Services\Media\MediaLibrary;
use App\Services\Rendering\SlideshowRenderer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Turns a topic into a finished TikTok photo carousel: script, photos, rendered
 * JPEGs, and (when an account is connected) a scheduled post.
 *
 * The whole pipeline is headless, which is what lets automations run on cron.
 */
class GenerateSlideshow implements ShouldQueue
{
    use Queueable;

    /** Image generation and Pinterest paging are slow; give the run room. */
    public int $timeout = 900;

    public int $tries = 1;

    public function __construct(
        public ContentProject $contentProject,
        public ?AutomationRun $automationRun = null,
    ) {}

    public function handle(
        SlideshowScriptService $scriptService,
        SlideshowRenderer $renderer,
        MediaLibrary $library,
    ): void {
        $options = $this->contentProject->script_data ?? [];

        try {
            $script = $scriptService->generate(
                topic: (string) ($options['topic'] ?? ''),
                slideCount: (int) ($options['slide_count'] ?? 6),
                language: (string) ($options['language'] ?? 'Portuguese (Brazil)'),
                avoidTopics: (array) ($options['avoid_topics'] ?? []),
            );

            $images = $this->sourceImages($script['slides'], (string) ($options['image_source'] ?? 'pinterest'), $library);
            $slides = $this->renderSlides(
                $renderer,
                $script['slides'],
                $images,
                (string) ($options['text_position'] ?? 'center'),
                SlideTextPreset::tryFrom((string) ($options['text_preset'] ?? '')) ?? SlideTextPreset::Classic,
            );

            $this->contentProject->update([
                'title' => Str::limit($script['hook'], 120, ''),
                'status' => 'ready',
                'script_data' => [
                    ...$options,
                    'hook' => $script['hook'],
                    'caption' => $script['caption'],
                    'hashtags' => $script['hashtags'],
                    'slides' => $slides,
                    'image_urls' => array_column($slides, 'url'),
                ],
            ]);

            $this->scheduleIfRequested($options);

            $this->automationRun?->update([
                'status' => 'succeeded',
                'content_project_id' => $this->contentProject->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Slideshow] Generation failed', [
                'content_project_id' => $this->contentProject->id,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);

            $this->contentProject->update([
                'status' => 'failed',
                'script_data' => [...$options, 'error' => $e->getMessage()],
            ]);

            $this->automationRun?->update(['status' => 'failed', 'error' => $e->getMessage()]);

            throw $e;
        }
    }

    /**
     * One photo per slide, never repeating a picture the workspace already used.
     *
     * @param  list<array{text: string, image_query: string}>  $slides
     * @return list<array{url: string, source_id: ?string, query: string}>
     */
    private function sourceImages(array $slides, string $sourceName, MediaLibrary $library): array
    {
        $source = ImageSourceFactory::make($sourceName, $this->contentProject->workspace->owner?->byokGeminiKey());
        $used = $this->recentlyUsedImageUrls();
        $picked = [];

        foreach ($slides as $slide) {
            // Ask for a few candidates so a query whose top hits are all already
            // used still yields something fresh.
            $candidates = $source->search($slide['image_query'], 3, $used);
            $image = $candidates[0];

            $used[] = $image['url'];
            $picked[] = [
                'url' => $image['url'],
                'source_id' => $image['source_id'],
                'query' => $slide['image_query'],
            ];
        }

        $this->recordAssets($picked, $sourceName);
        $this->rememberInLibrary($picked, $sourceName, $library);

        return $picked;
    }

    /**
     * @param  list<array{text: string, image_query: string}>  $slides
     * @param  list<array{url: string, source_id: ?string, query: string}>  $images
     * @return list<array{index: int, text: string, url: string, path: string, source_url: string}>
     */
    private function renderSlides(
        SlideshowRenderer $renderer,
        array $slides,
        array $images,
        string $textPosition,
        SlideTextPreset $preset,
    ): array {
        $disk = Storage::disk($this->disk());
        $directory = "tiktok/{$this->contentProject->workspace_id}/{$this->contentProject->id}";
        $rendered = [];

        foreach ($slides as $index => $slide) {
            $jpeg = $renderer->render($images[$index]['url'], $slide['text'], $textPosition, $preset);
            $path = sprintf('%s/%02d.jpg', $directory, $index + 1);

            // TikTok pulls these by URL, so they must be world-readable.
            $disk->put($path, $jpeg, 'public');

            $rendered[] = [
                'index' => $index,
                'text' => $slide['text'],
                'path' => $path,
                'url' => url($disk->url($path)),
                'source_url' => $images[$index]['url'],
            ];
        }

        return $rendered;
    }

    /**
     * Every photo the generator sources becomes a library item, so the workspace
     * accumulates a matchable catalogue just by running. A failure here is not
     * worth losing a finished carousel over.
     *
     * @param  list<array{url: string, source_id: ?string, query: string}>  $images
     */
    private function rememberInLibrary(array $images, string $sourceName, MediaLibrary $library): void
    {
        foreach ($images as $image) {
            if (! str_starts_with($image['url'], 'http')) {
                continue;
            }

            try {
                $library->storeFromUrl($this->contentProject->workspace, $image['url'], [
                    'source' => $sourceName,
                    'source_id' => $image['source_id'],
                    'query' => $image['query'],
                ]);
            } catch (\Throwable $e) {
                Log::warning('[MediaLibrary] Could not save a generated photo', [
                    'content_project_id' => $this->contentProject->id,
                    'url' => $image['url'],
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @param  list<array{url: string, source_id: ?string, query: string}>  $images
     */
    private function recordAssets(array $images, string $sourceName): void
    {
        foreach ($images as $image) {
            // Generated images are data URIs — nothing to remember or de-duplicate.
            if (! str_starts_with($image['url'], 'http')) {
                continue;
            }

            Asset::create([
                'workspace_id' => $this->contentProject->workspace_id,
                'type' => 'image',
                'url' => $image['url'],
                'metadata' => [
                    'source' => $sourceName,
                    'query' => $image['query'],
                    'source_id' => $image['source_id'],
                    'content_project_id' => $this->contentProject->id,
                ],
            ]);
        }
    }

    /**
     * @return list<string>
     */
    private function recentlyUsedImageUrls(): array
    {
        return Asset::where('workspace_id', $this->contentProject->workspace_id)
            ->where('type', 'image')
            ->where('created_at', '>=', now()->subDays(90))
            ->orderByDesc('id')
            ->limit(2000)
            ->pluck('url')
            ->all();
    }

    /**
     * @param  array<string, mixed>  $options
     */
    private function scheduleIfRequested(array $options): void
    {
        $accountId = $options['social_account_id'] ?? null;
        $publishAt = $options['publish_at'] ?? null;

        if (! $accountId || ! $publishAt) {
            return;
        }

        Schedule::create([
            'content_project_id' => $this->contentProject->id,
            'social_account_id' => $accountId,
            'publish_at' => $publishAt,
        ]);
    }

    private function disk(): string
    {
        return config('filesystems.media_disk');
    }
}
