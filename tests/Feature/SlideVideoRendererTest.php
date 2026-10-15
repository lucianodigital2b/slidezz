<?php

namespace Tests\Feature;

use App\Jobs\RenderVideo;
use App\Models\VideoProject;
use App\Services\Rendering\SlideVideoRenderer;
use App\Services\Rendering\VideoRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SlideVideoRendererTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'filesystems.media_disk' => 'public',
            'services.ffmpeg.binary' => 'ffmpeg',
        ]);
        Storage::fake('public');
    }

    public function test_the_filter_graph_overlaps_transitions_and_concatenates_cuts(): void
    {
        [$graph, $label, $frames] = SlideVideoRenderer::filterGraph([
            $this->clip('none'),
            $this->clip('fade'),
            $this->clip('none'),
            $this->clip('slide', 1),
        ], 1080, 1920);

        $this->assertStringContainsString('[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', $graph);
        $this->assertStringContainsString('[v0][v1]xfade=transition=fade:duration=0.5:offset=2.5[x1]', $graph);
        $this->assertStringContainsString('[x1][v2]concat=n=2:v=1:a=0[x2]', $graph);
        $this->assertStringContainsString('[x2][v3]xfade=transition=slideright:duration=0.5:offset=8[x3]', $graph);
        $this->assertSame('x3', $label);
        // 90 + (90 - 15) + 90 + (30 - 15), as timelineFrames() counts it.
        $this->assertSame(270, $frames);
    }

    public function test_a_transition_never_outlasts_a_short_clip(): void
    {
        [$graph] = SlideVideoRenderer::filterGraph([$this->clip('none', 0.3), $this->clip('fade')], 1080, 1350);

        $this->assertStringContainsString('xfade=transition=fade:duration=0.2667:offset=0.0333', $graph);
    }

    public function test_it_only_takes_still_image_timelines(): void
    {
        $this->assertTrue(SlideVideoRenderer::supports(['clips' => [$this->clip('none')], 'audio' => null]));
        $this->assertFalse(SlideVideoRenderer::supports(['clips' => [], 'audio' => null]));
        $this->assertFalse(SlideVideoRenderer::supports(['clips' => [[...$this->clip('none'), 'text' => 'Oi']], 'audio' => null]));
        $this->assertFalse(SlideVideoRenderer::supports(['clips' => [[...$this->clip('none'), 'zoom' => true]], 'audio' => null]));
        $this->assertFalse(SlideVideoRenderer::supports(['clips' => [[...$this->clip('none'), 'type' => 'video']], 'audio' => null]));
        $this->assertFalse(SlideVideoRenderer::supports([
            'clips' => [$this->clip('none')],
            'audio' => ['src' => 'http://localhost/storage/song.mp3', 'volume' => 1],
        ]));
    }

    public function test_progress_is_read_from_the_latest_out_time(): void
    {
        $this->assertSame(2.5, SlideVideoRenderer::secondsFrom("frame=10\nout_time_us=1000000\nout_time_us=2500000\nprogress=continue\n"));
        $this->assertNull(SlideVideoRenderer::secondsFrom('frame=10'));
    }

    public function test_the_job_renders_slides_with_ffmpeg(): void
    {
        $video = VideoProject::factory()->rendering()->create();
        $this->storeClipSources($video);
        $inputs = [];

        Process::fake(function (PendingProcess $process) use (&$inputs) {
            $command = $process->command;

            foreach ($command as $index => $argument) {
                if ($argument === '-i') {
                    $inputs[] = file_get_contents($command[$index + 1]);
                }
            }

            file_put_contents(end($command), 'fake-mp4');

            return Process::result("out_time_us=3000000\nprogress=continue\n");
        });

        (new RenderVideo($video, useFfmpeg: true))->handle(app(VideoRenderer::class), app(SlideVideoRenderer::class));

        $video->refresh();

        Process::assertRan(fn (PendingProcess $process): bool => $process->command[0] === 'ffmpeg');
        $this->assertSame(['slide-0', 'slide-1'], $inputs);
        $this->assertSame('ready', $video->status);
        $this->assertSame('fake-mp4', Storage::disk('public')->get($video->video_path));
    }

    public function test_the_job_falls_back_to_remotion_when_ffmpeg_cannot_draw_the_timeline(): void
    {
        $video = VideoProject::factory()->rendering()->create();
        $timeline = $video->timeline;
        $timeline['clips'][0]['text'] = 'Legenda';
        $video->update(['timeline' => $timeline]);

        Process::fake(function (PendingProcess $process) {
            file_put_contents($process->command[3], 'fake-mp4');

            return Process::result('progress:100');
        });

        (new RenderVideo($video, useFfmpeg: true))->handle(app(VideoRenderer::class), app(SlideVideoRenderer::class));

        Process::assertRan(fn (PendingProcess $process): bool => str_ends_with($process->command[1], 'render.mjs'));
        $this->assertSame('ready', $video->fresh()->status);
    }

    /**
     * Puts a file behind each clip URL of the factory timeline on the fake media disk.
     */
    private function storeClipSources(VideoProject $video): void
    {
        foreach ($video->timeline['clips'] as $index => $clip) {
            Storage::disk('public')->put(Str::after($clip['src'], '/storage/'), "slide-{$index}");
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function clip(string $transition, float $duration = 3): array
    {
        return [
            'id' => (string) Str::uuid(),
            'type' => 'image',
            'src' => 'http://localhost/storage/videos/slide.jpg',
            'duration' => $duration,
            'trimStart' => 0,
            'transition' => $transition,
            'text' => '',
            'textPosition' => 'center',
            'zoom' => false,
            'muted' => false,
        ];
    }
}
