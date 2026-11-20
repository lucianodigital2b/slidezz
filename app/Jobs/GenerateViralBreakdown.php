<?php

namespace App\Jobs;

use App\Models\ViralBreakdown;
use App\Services\AI\ViralBreakdownAnalyzer;
use App\Services\Rendering\VideoRenderer;
use App\Services\Video\FrameDescriber;
use App\Services\Video\FrameSampler;
use App\Services\Video\GroqTranscriber;
use App\Services\Video\TikTokVideoFetcher;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class GenerateViralBreakdown implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;

    public int $tries = 1;

    public function __construct(public ViralBreakdown $viralBreakdown) {}

    public function handle(
        TikTokVideoFetcher $fetcher,
        GroqTranscriber $transcriber,
        FrameSampler $sampler,
        FrameDescriber $describer,
        ViralBreakdownAnalyzer $analyzer,
        VideoRenderer $renderer,
    ): void {
        $breakdown = $this->viralBreakdown;

        if ($breakdown->status !== 'pending') {
            return;
        }

        $breakdown->update(['status' => 'fetching', 'progress' => 5, 'error' => null]);

        $localVideoPath = null;
        $frameSample = null;
        $bundleDir = null;

        try {
            // a) fetching
            $source = $fetcher->fetch($breakdown->source_url);
            $source['platform'] = 'tiktok';

            if (($source['duration'] ?? 0) > 180) {
                throw new RuntimeException('Por enquanto o breakdown aceita vídeos de até 3 minutos.');
            }

            $source['author']['followers'] = $fetcher->followers($source['author']['handle']);
            $localVideoPath = tempnam(sys_get_temp_dir(), 'slidezz-breakdown-').'.mp4';
            $fetcher->download($source['play_url'], $localVideoPath);

            $disk = Storage::disk(config('filesystems.media_disk'));
            $dir = $breakdown->storageDirectory();

            $sourcePath = $dir.'/source.mp4';
            $stream = fopen($localVideoPath, 'r');
            $disk->put($sourcePath, $stream, 'public');
            if (is_resource($stream)) {
                fclose($stream);
            }

            $source['video_path'] = $sourcePath;
            $source['video_url'] = $disk->url($sourcePath);

            if (isset($source['author']['avatar']) && is_string($source['author']['avatar']) && $source['author']['avatar'] !== '') {
                $avatarTemp = tempnam(sys_get_temp_dir(), 'slidezz-avatar-').'.jpg';

                try {
                    Http::timeout(60)->withOptions(['sink' => $avatarTemp])->get($source['author']['avatar']);

                    if (is_file($avatarTemp) && filesize($avatarTemp) > 0) {
                        $avatarPath = $dir.'/avatar.jpg';
                        $avatarStream = fopen($avatarTemp, 'r');
                        $disk->put($avatarPath, $avatarStream, 'public');
                        if (is_resource($avatarStream)) {
                            fclose($avatarStream);
                        }

                        $source['author']['avatar_path'] = $avatarPath;
                        $source['author']['avatar_url'] = $disk->url($avatarPath);
                    }
                } catch (\Throwable $e) {
                    Log::info('[Breakdown] Avatar download failed: '.$e->getMessage());
                } finally {
                    if (is_file($avatarTemp)) {
                        unlink($avatarTemp);
                    }
                }
            }

            $breakdown->update(['source' => $source, 'status' => 'transcribing', 'progress' => 15]);

            // b) transcribing
            $transcript = $transcriber->transcribe($localVideoPath);
            $breakdown->update(['transcript' => $transcript, 'status' => 'analyzing', 'progress' => 30]);

            // c) analyzing
            try {
                $frameSample = $sampler->contactSheets($localVideoPath, (float) ($source['duration'] ?? 0));
                $frameNotes = $describer->describe($frameSample['sheets']);
            } finally {
                $sampler->cleanup($frameSample);
                $frameSample = null;
            }

            $result = $analyzer->analyze($transcript, $frameNotes, $source, $breakdown->language);

            $breakdown->update(['result' => $result, 'caption' => $result['caption'], 'status' => 'rendering', 'progress' => 40]);

            // d) rendering
            $bundleDir = storage_path('app/private/remotion-bundles/'.Str::uuid());
            $renderer->bundle($bundleDir);

            $stages = $result['stages'] ?? [];
            $totalSlides = count($stages) + 1;
            $slides = [];
            $tracker = new \stdClass;
            $tracker->lastWritten = 40;

            $fontBaseUrl = rtrim(config('app.url'), '/').'/fonts/breakdown';

            $coverHeadline = $this->headline($source, $breakdown->language);
            $coverProps = [
                'accent' => '#3BE37A',
                'fontBaseUrl' => $fontBaseUrl,
                'headline' => $coverHeadline,
                'avatarSrc' => $source['author']['avatar_url'] ?? null,
                'handle' => $source['author']['handle'],
                'followersLabel' => $this->followersLabel($source['author']['followers'], (int) ($source['likes'] ?? 0), $breakdown->language),
                'niche' => $result['niche'] ?? '',
                'videoSrc' => $source['video_url'],
                'durationSeconds' => 4,
            ];

            $this->renderAndPublishSlide(
                $renderer,
                $coverProps,
                'BreakdownCover',
                $bundleDir,
                $disk,
                $dir,
                0,
                'cover',
                '',
                4,
                $breakdown,
                $tracker,
                $totalSlides,
                0,
            );

            $slides[] = [
                'index' => 0,
                'kind' => 'cover',
                'key' => 'cover',
                'title' => '',
                'duration' => 4,
                'path' => $dir.'/slide-0.mp4',
                'url' => $disk->url($dir.'/slide-0.mp4'),
            ];

            foreach ($stages as $stageIndex => $stage) {
                $stageWordStart = $stage['start_word'];
                $stageWordEnd = $stage['end_word'];
                $stageWords = array_slice($transcript['words'], $stageWordStart, $stageWordEnd - $stageWordStart + 1);
                $stageNotes = array_map(
                    fn ($note): array => [
                        'fromWord' => $note['from_word'] - $stageWordStart,
                        'toWord' => $note['to_word'] - $stageWordStart,
                        'text' => $note['text'],
                    ],
                    $stage['notes'] ?? [],
                );

                $props = [
                    'accent' => '#3BE37A',
                    'fontBaseUrl' => $fontBaseUrl,
                    'videoSrc' => $source['video_url'],
                    'viewsLabel' => $this->compactNumber((int) $source['views'], $breakdown->language),
                    'sourceDuration' => $transcript['duration'] ?: $source['duration'],
                    'stage' => [
                        'key' => $stage['key'],
                        'title' => $stage['title'],
                        'label' => $stage['label'],
                        'start' => $stage['start'],
                        'end' => $stage['end'],
                        'videoNote' => $stage['video_note'],
                        'videoNoteSide' => $stage['video_note_side'],
                        'words' => array_map(
                            fn ($word): array => [
                                'text' => trim((string) $word['word']),
                                'start' => $word['start'],
                                'end' => $word['end'],
                            ],
                            $stageWords,
                        ),
                        'notes' => $stageNotes,
                    ],
                ];

                $slideIndex = $stageIndex + 1;
                $duration = ($stage['end'] - $stage['start']) + 0.6;

                $this->renderAndPublishSlide(
                    $renderer,
                    $props,
                    'BreakdownSlide',
                    $bundleDir,
                    $disk,
                    $dir,
                    $slideIndex,
                    'stage',
                    $stage['key'],
                    $duration,
                    $breakdown,
                    $tracker,
                    $totalSlides,
                    $slideIndex,
                );

                $slides[] = [
                    'index' => $slideIndex,
                    'kind' => 'stage',
                    'key' => $stage['key'],
                    'title' => $stage['title'],
                    'duration' => $duration,
                    'path' => $dir.'/slide-'.$slideIndex.'.mp4',
                    'url' => $disk->url($dir.'/slide-'.$slideIndex.'.mp4'),
                ];
            }

            $breakdown->update([
                'status' => 'done',
                'progress' => 100,
                'slides' => $slides,
                'error' => null,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->markFailed($e);

            throw $e;
        } finally {
            if ($localVideoPath && is_file($localVideoPath)) {
                unlink($localVideoPath);
            }

            $sampler->cleanup($frameSample);

            if ($bundleDir && is_dir($bundleDir)) {
                File::deleteDirectory($bundleDir);
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        $fresh = $this->viralBreakdown->fresh();

        if ($fresh && ! in_array($fresh->status, ['done', 'failed'], true)) {
            $this->markFailed($exception);
        }
    }

    /**
     * Render a single slide and upload it to the media disk.
     *
     * @param  Filesystem  $disk
     */
    private function renderAndPublishSlide(
        VideoRenderer $renderer,
        array $props,
        string $compositionId,
        string $bundleDir,
        $disk,
        string $dir,
        int $slideIndex,
        string $kind,
        string $key,
        float $duration,
        ViralBreakdown $breakdown,
        \stdClass $tracker,
        int $totalSlides,
        int $done,
    ): void {
        $slideStartProgress = 40 + (int) floor(60 * $done / $totalSlides);
        $slideEndProgress = 40 + (int) floor(60 * ($done + 1) / $totalSlides);

        $onProgress = function (int $progress) use (
            $breakdown,
            $slideStartProgress,
            $slideEndProgress,
            $tracker,
        ): void {
            $global = (int) floor($slideStartProgress + ($slideEndProgress - $slideStartProgress) * ($progress / 100));

            if ($global - $tracker->lastWritten >= 3 || $global >= $slideEndProgress) {
                $tracker->lastWritten = $global;
                $breakdown->update(['progress' => min(99, $global)]);
            }
        };

        $outputPath = $renderer->render($props, $onProgress, $compositionId, $bundleDir);

        $diskPath = $dir.'/slide-'.$slideIndex.'.mp4';
        $stream = fopen($outputPath, 'r');
        $disk->put($diskPath, $stream, 'public');
        if (is_resource($stream)) {
            fclose($stream);
        }

        File::delete($outputPath);

        $breakdown->update(['progress' => $slideEndProgress]);
        $tracker->lastWritten = max($tracker->lastWritten, $slideEndProgress);
    }

    /**
     * @param  array<string, mixed>  $source
     * @return list<list<array{text: string, accent: bool}>>
     */
    private function headline(array $source, string $language): array
    {
        $handle = (string) ($source['author']['handle'] ?? '');
        $name = mb_strtoupper((string) ($source['author']['name'] ?? ('@'.$handle)));
        $name = mb_substr($name, 0, 22);

        $views = (int) ($source['views'] ?? 0);
        $thousandsSeparator = $language === 'English' ? ',' : '.';
        $number = number_format($views, 0, '', $thousandsSeparator);

        if ($language === 'English') {
            return [
                [['text' => "LET'S BREAK DOWN HOW", 'accent' => false]],
                [['text' => $name, 'accent' => true]],
                [
                    ['text' => 'GOT ', 'accent' => false],
                    ['text' => $number, 'accent' => true],
                    ['text' => ' VIEWS', 'accent' => false],
                ],
            ];
        }

        return [
            [['text' => 'VEJA COMO', 'accent' => false]],
            [['text' => $name, 'accent' => true]],
            [
                ['text' => 'FEZ ', 'accent' => false],
                ['text' => $number, 'accent' => true],
                ['text' => ' DE VIEWS', 'accent' => false],
            ],
        ];
    }

    /**
     * tikwm's profile endpoint often sits behind Cloudflare; the video's likes stand in for followers.
     */
    private function followersLabel(?int $followers, int $likes, string $language): string
    {
        $english = $language === 'English';

        if ($followers !== null) {
            return $this->compactNumber($followers, $language).($english ? ' followers' : ' seguidores');
        }

        if ($likes > 0) {
            return $this->compactNumber($likes, $language).($english ? ' likes' : ' curtidas');
        }

        return '';
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

    private function markFailed(\Throwable $exception): void
    {
        Log::error('[Breakdown] Generation failed', [
            'viral_breakdown_id' => $this->viralBreakdown->id,
            'message' => $exception->getMessage(),
            'class' => $exception::class,
        ]);

        $this->viralBreakdown->update([
            'status' => 'failed',
            'error' => Str::limit($exception->getMessage(), 1000),
        ]);
    }
}
