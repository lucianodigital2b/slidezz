<?php

namespace Tests\Feature;

use App\Enums\SlideTextPreset;
use App\Jobs\GenerateSlideshow;
use App\Models\Asset;
use App\Models\AutomationRun;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AI\SlideshowScriptService;
use App\Services\Rendering\SlideshowRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GenerateSlideshowTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        $this->workspace = Workspace::factory()->create(['owner_id' => User::factory()]);
    }

    public function test_it_renders_every_slide_and_marks_the_project_ready(): void
    {
        $this->fakeScript(3);
        $this->fakePinterest();

        GenerateSlideshow::dispatchSync($this->project());

        $project = ContentProject::first();

        $this->assertSame('ready', $project->status);
        $this->assertSame('Estudei 4 anos na Coreia', $project->title);
        $this->assertCount(3, $project->script_data['image_urls']);
        $this->assertSame('Uma legenda.', $project->script_data['caption']);
        $this->assertSame(['skincare', 'coreano'], $project->script_data['hashtags']);

        foreach ($project->script_data['slides'] as $slide) {
            Storage::disk('public')->assertExists($slide['path']);
        }
    }

    public function test_it_remembers_the_photos_it_used(): void
    {
        $this->fakeScript(2);
        $this->fakePinterest();

        GenerateSlideshow::dispatchSync($this->project());

        $this->assertSame(2, Asset::where('workspace_id', $this->workspace->id)->count());
        $this->assertSame('pinterest', Asset::first()->metadata['source']);
    }

    public function test_it_never_reuses_a_photo_the_workspace_already_used(): void
    {
        Asset::create([
            'workspace_id' => $this->workspace->id,
            'type' => 'image',
            'url' => 'https://i.pinimg.com/originals/photo-0.jpg',
            'metadata' => ['source' => 'pinterest'],
        ]);

        $this->fakeScript(1);
        $this->fakePinterest();

        GenerateSlideshow::dispatchSync($this->project());

        $this->assertNotSame(
            'https://i.pinimg.com/originals/photo-0.jpg',
            ContentProject::first()->script_data['slides'][0]['source_url'],
        );
    }

    public function test_it_schedules_the_post_when_an_account_and_time_are_given(): void
    {
        $account = SocialAccount::factory()->create([
            'workspace_id' => $this->workspace->id,
            'provider' => 'tiktok',
        ]);

        $this->fakeScript(2);
        $this->fakePinterest();

        $publishAt = now()->addHours(3)->startOfSecond();

        GenerateSlideshow::dispatchSync($this->project([
            'social_account_id' => $account->id,
            'publish_at' => $publishAt->toDateTimeString(),
        ]));

        $schedule = Schedule::first();

        $this->assertNotNull($schedule);
        $this->assertSame($account->id, $schedule->social_account_id);
        $this->assertTrue($publishAt->equalTo($schedule->publish_at));
    }

    public function test_it_renders_with_the_chosen_text_preset(): void
    {
        $this->fakeScript(1);
        $this->fakePinterest();

        $renderer = $this->mock(SlideshowRenderer::class);
        $renderer->shouldReceive('render')
            ->once()
            ->with(\Mockery::any(), \Mockery::any(), 'center', SlideTextPreset::Neon)
            ->andReturn('jpeg-bytes');

        GenerateSlideshow::dispatchSync($this->project(['text_preset' => 'neon']));

        $this->assertSame('ready', ContentProject::first()->status);
    }

    public function test_an_unknown_preset_falls_back_to_classic(): void
    {
        $this->fakeScript(1);
        $this->fakePinterest();

        $renderer = $this->mock(SlideshowRenderer::class);
        $renderer->shouldReceive('render')
            ->once()
            ->with(\Mockery::any(), \Mockery::any(), 'center', SlideTextPreset::Classic)
            ->andReturn('jpeg-bytes');

        GenerateSlideshow::dispatchSync($this->project(['text_preset' => 'comic-sans']));

        $this->assertSame('ready', ContentProject::first()->status);
    }

    public function test_a_failed_run_marks_the_project_and_the_automation_run(): void
    {
        $this->fakeScript(2);
        Http::fake(['www.pinterest.com/*' => Http::response('nope', 403)]);

        $run = AutomationRun::factory()->create(['status' => 'running']);
        $project = $this->project();

        try {
            GenerateSlideshow::dispatchSync($project, $run);
        } catch (\Throwable) {
            // The job rethrows so the queue records the failure.
        }

        $this->assertSame('failed', $project->fresh()->status);
        $this->assertNotEmpty($project->fresh()->script_data['error']);
        $this->assertSame('failed', $run->fresh()->status);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function project(array $overrides = []): ContentProject
    {
        return ContentProject::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'skincare coreano',
            'type' => 'slideshow',
            'status' => 'generating',
            'script_data' => [
                'topic' => 'skincare coreano',
                'slide_count' => 3,
                'image_source' => 'pinterest',
                'text_position' => 'center',
                'language' => 'Portuguese (Brazil)',
                ...$overrides,
            ],
        ]);
    }

    private function fakeScript(int $slideCount): void
    {
        $slides = [];

        for ($i = 0; $i < $slideCount; $i++) {
            $slides[] = ['text' => "Dica número {$i}", 'image_query' => "korean skincare {$i}"];
        }

        $this->mock(SlideshowScriptService::class, function ($mock) use ($slides): void {
            $mock->shouldReceive('generate')->andReturn([
                'hook' => 'Estudei 4 anos na Coreia',
                'slides' => $slides,
                'caption' => 'Uma legenda.',
                'hashtags' => ['skincare', 'coreano'],
            ]);
        });
    }

    private function fakePinterest(): void
    {
        $results = [];

        for ($i = 0; $i < 5; $i++) {
            $results[] = [
                'type' => 'pin',
                'id' => (string) $i,
                'images' => ['orig' => [
                    'url' => "https://i.pinimg.com/originals/photo-{$i}.jpg",
                    'width' => 1080,
                    'height' => 1920,
                ]],
            ];
        }

        Http::fake([
            'www.pinterest.com/resource/*' => Http::response([
                'resource_response' => ['bookmark' => '', 'data' => ['results' => $results]],
            ]),
            'www.pinterest.com/' => Http::response('<html></html>', 200, [
                'Set-Cookie' => ['csrftoken=test-token; Path=/'],
            ]),
            'i.pinimg.com/*' => Http::response($this->photoBinary(), 200, ['Content-Type' => 'image/jpeg']),
        ]);
    }

    private function photoBinary(): string
    {
        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, 90, 90, 90));

        ob_start();
        imagejpeg($image, null, 80);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
