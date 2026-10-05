<?php

namespace App\Jobs;

use App\Enums\SlideTextPreset;
use App\Models\ContentProject;
use App\Models\MediaLibraryItem;
use App\Models\Schedule;
use App\Services\AI\SlideshowScriptService;
use App\Services\Images\ImageSourceFactory;
use App\Services\Media\MediaLibrary;
use App\Services\Media\MediaMatcher;
use App\Services\Rendering\SlideshowRenderer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Builds one carousel from a hook that already exists, typically a row of an
 * imported CSV.
 *
 * Where {@see GenerateSlideshow} invents a hook and then searches Pinterest for
 * every slide, this starts from the given line and dresses it with photos the
 * workspace already owns, only reaching for the network when its library has
 * nothing that fits.
 */
class BuildSlideshowFromHook implements ShouldQueue
{
    use Queueable;

    public int $timeout = 900;

    public int $tries = 1;

    public function __construct(public ContentProject $contentProject) {}

    public function handle(
        SlideshowScriptService $scriptService,
        SlideshowRenderer $renderer,
        MediaMatcher $matcher,
        MediaLibrary $library,
    ): void {
        $options = $this->contentProject->script_data ?? [];
        $hook = (string) ($options['hook'] ?? '');

        try {
            $script = $scriptService->generateFromHook(
                hook: $hook,
                slideCount: (int) ($options['slide_count'] ?? 6),
                language: (string) ($options['language'] ?? 'Portuguese (Brazil)'),
                avoidTopics: (array) ($options['avoid_topics'] ?? []),
            );

            $items = $this->matchPhotos($script['slides'], $matcher, $library, $options);
            $slides = $this->renderSlides(
                $renderer,
                $script['slides'],
                $items,
                (string) ($options['text_position'] ?? 'center'),
                SlideTextPreset::tryFrom((string) ($options['text_preset'] ?? '')) ?? SlideTextPreset::Classic,
            );

            foreach ($items as $item) {
                $item->markUsed();
            }

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
        } catch (\Throwable $e) {
            Log::error('[Slideshow] Hook build failed', [
                'content_project_id' => $this->contentProject->id,
                'hook' => $hook,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);

            $this->contentProject->update([
                'status' => 'failed',
                'script_data' => [...$options, 'error' => $e->getMessage()],
            ]);

            throw $e;
        }
    }

    /**
     * Library first, network second. A photo fetched as a fallback is taken into
     * the library too, so the same slide never needs the network twice.
     *
     * @param  list<array{text: string, image_query: string}>  $slides
     * @param  array<string, mixed>  $options
     * @return list<MediaLibraryItem>
     */
    private function matchPhotos(array $slides, MediaMatcher $matcher, MediaLibrary $library, array $options): array
    {
        $workspace = $this->contentProject->workspace;

        // Matching on the query plus the slide's own words beats the query alone:
        // the words carry the subject the writer actually had in mind.
        $queries = array_map(
            fn (array $slide): string => $slide['image_query'].' '.$slide['text'],
            $slides,
        );

        $matched = $matcher->assign($workspace->id, $queries);
        $sourceName = (string) ($options['image_source'] ?? 'pinterest');
        $source = null;
        $filled = [];

        foreach ($matched as $index => $item) {
            if ($item !== null) {
                $filled[] = $item;

                continue;
            }

            $source ??= ImageSourceFactory::make($sourceName, $workspace->owner?->byokGeminiKey());
            $query = $slides[$index]['image_query'];
            $candidates = $source->search($query, 3, $this->libraryUrls($workspace->id));

            $filled[] = $library->storeFromUrl($workspace, $candidates[0]['url'], [
                'source' => $source->name(),
                'source_id' => $candidates[0]['source_id'],
                'query' => $query,
            ]);
        }

        return $filled;
    }

    /**
     * @return list<string>
     */
    private function libraryUrls(int $workspaceId): array
    {
        return MediaLibraryItem::forWorkspace($workspaceId)
            ->whereNotNull('source_url')
            ->orderByDesc('id')
            ->limit(2000)
            ->pluck('source_url')
            ->all();
    }

    /**
     * @param  list<array{text: string, image_query: string}>  $slides
     * @param  list<MediaLibraryItem>  $items
     * @return list<array{index: int, text: string, url: string, path: string, source_url: string, media_library_item_id: int}>
     */
    private function renderSlides(
        SlideshowRenderer $renderer,
        array $slides,
        array $items,
        string $textPosition,
        SlideTextPreset $preset,
    ): array {
        $disk = Storage::disk(config('filesystems.media_disk'));
        $directory = "tiktok/{$this->contentProject->workspace_id}/{$this->contentProject->id}";
        $rendered = [];

        foreach ($slides as $index => $slide) {
            // The library owns the bytes, so hand the renderer a data URI instead
            // of making the app fetch its own public URL over HTTP.
            $jpeg = $renderer->render($items[$index]->dataUri(), $slide['text'], $textPosition, $preset);
            $path = sprintf('%s/%02d.jpg', $directory, $index + 1);

            $disk->put($path, $jpeg, 'public');

            $rendered[] = [
                'index' => $index,
                'text' => $slide['text'],
                'path' => $path,
                'url' => url($disk->url($path)),
                'source_url' => $items[$index]->publicUrl(),
                'media_library_item_id' => $items[$index]->id,
            ];
        }

        return $rendered;
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
}
