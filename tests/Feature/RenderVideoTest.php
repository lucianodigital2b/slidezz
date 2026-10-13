<?php

namespace Tests\Feature;

use App\Jobs\RenderVideo;
use App\Models\VideoProject;
use App\Services\Rendering\VideoRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class RenderVideoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'filesystems.media_disk' => 'public',
            'services.remotion.node_binary' => 'node',
            'services.remotion.bundle_path' => null,
        ]);
        Storage::fake('public');
    }

    public function test_it_renders_the_timeline_and_publishes_the_mp4(): void
    {
        $video = VideoProject::factory()->rendering()->create();
        $this->fakeSuccessfulRender();

        $this->runJob($video);

        $video->refresh();

        $this->assertSame('ready', $video->status);
        $this->assertSame(100, $video->render_progress);
        $this->assertNull($video->render_error);
        $this->assertNotNull($video->rendered_at);
        $this->assertStringStartsWith($video->storageDirectory().'/render-', $video->video_path);
        Storage::disk('public')->assertExists($video->video_path);
        $this->assertSame('fake-mp4', Storage::disk('public')->get($video->video_path));
    }

    public function test_remotion_receives_the_format_and_timeline(): void
    {
        $video = VideoProject::factory()->rendering()->create(['format' => 'post']);
        $props = null;

        Process::fake(function (PendingProcess $process) use (&$props) {
            $props = json_decode(file_get_contents($process->command[2]), true);
            file_put_contents($process->command[3], 'fake-mp4');

            return Process::result();
        });

        $this->runJob($video);

        $this->assertSame('post', $props['format']);
        $this->assertSame($video->timeline, $props['timeline']);
        Process::assertRan(fn (PendingProcess $process): bool => $process->command[0] === 'node'
            && str_ends_with($process->command[1], 'render.mjs')
            && count($process->command) === 4);
    }

    public function test_a_prebuilt_bundle_is_passed_when_configured(): void
    {
        config(['services.remotion.bundle_path' => '/srv/remotion-bundle']);
        $video = VideoProject::factory()->rendering()->create();
        $this->fakeSuccessfulRender();

        $this->runJob($video);

        Process::assertRan(fn (PendingProcess $process): bool => ($process->command[4] ?? null) === '/srv/remotion-bundle');
    }

    public function test_a_failed_render_marks_the_project_failed(): void
    {
        $video = VideoProject::factory()->rendering()->create();
        Process::fake(['*' => Process::result(errorOutput: 'Chrome crashed', exitCode: 1)]);

        try {
            $this->runJob($video);
            $this->fail('The render should have thrown.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Chrome crashed', $e->getMessage());
        }

        $video->refresh();

        $this->assertSame('failed', $video->status);
        $this->assertStringContainsString('Chrome crashed', $video->render_error);
        $this->assertNull($video->video_path);
    }

    public function test_a_new_render_replaces_the_previous_file(): void
    {
        $video = VideoProject::factory()->rendering()->create();
        $previousPath = $video->storageDirectory().'/render-old.mp4';
        Storage::disk('public')->put($previousPath, 'old');
        $video->update(['video_path' => $previousPath]);
        $this->fakeSuccessfulRender();

        $this->runJob($video);

        Storage::disk('public')->assertMissing($previousPath);
        Storage::disk('public')->assertExists($video->fresh()->video_path);
    }

    public function test_a_job_killed_mid_render_is_marked_failed(): void
    {
        $video = VideoProject::factory()->rendering()->create();

        (new RenderVideo($video))->failed(new RuntimeException('Job timed out'));

        $this->assertSame('failed', $video->fresh()->status);
        $this->assertSame('Job timed out', $video->fresh()->render_error);
    }

    public function test_progress_is_read_from_the_latest_progress_line(): void
    {
        $this->assertSame(35, VideoRenderer::progressFrom("progress:20\nprogress:35\n"));
        $this->assertSame(100, VideoRenderer::progressFrom("Bundling...\nprogress:100\r\n"));
        $this->assertNull(VideoRenderer::progressFrom('Downloading Chrome Headless Shell - 57.3 Mb/113.3 Mb'));
        $this->assertNull(VideoRenderer::progressFrom('noise progress:50'));
    }

    private function fakeSuccessfulRender(): void
    {
        Process::fake(function (PendingProcess $process) {
            file_put_contents($process->command[3], 'fake-mp4');

            return Process::result("progress:50\nprogress:100");
        });
    }

    private function runJob(VideoProject $video): void
    {
        (new RenderVideo($video))->handle(app(VideoRenderer::class));
    }
}
