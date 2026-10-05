<?php

namespace Tests\Feature;

use App\Jobs\BuildSlideshowFromHook;
use App\Jobs\DescribeMediaItem;
use App\Models\ContentProject;
use App\Models\MediaLibraryItem;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AI\SlideshowScriptService;
use App\Services\Media\MediaLibrary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BuildSlideshowFromHookTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Bus::fake([DescribeMediaItem::class]);

        $this->workspace = Workspace::factory()->create(['owner_id' => User::factory()]);
    }

    public function test_it_dresses_the_hook_with_photos_from_the_library(): void
    {
        $this->fakeScript();
        $gym = $this->libraryItem('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);
        $food = $this->libraryItem('Bowl of oatmeal on a counter', ['oatmeal', 'breakfast', 'kitchen']);

        BuildSlideshowFromHook::dispatchSync($this->project());

        $project = ContentProject::first();

        $this->assertSame('ready', $project->status);
        $this->assertCount(2, $project->script_data['slides']);
        $this->assertSame(
            [$gym->id, $food->id],
            array_column($project->script_data['slides'], 'media_library_item_id'),
        );

        foreach ($project->script_data['slides'] as $slide) {
            Storage::disk('public')->assertExists($slide['path']);
        }
    }

    public function test_the_imported_hook_survives_untouched(): void
    {
        $this->fakeScript(hookFromModel: 'Um hook completamente diferente');
        $this->libraryItem('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);
        $this->libraryItem('Bowl of oatmeal on a counter', ['oatmeal', 'breakfast']);

        BuildSlideshowFromHook::dispatchSync($this->project());

        $project = ContentProject::first();

        $this->assertSame('Estudei 4 anos na Coreia', $project->script_data['hook']);
        $this->assertSame('Estudei 4 anos na Coreia', $project->script_data['slides'][0]['text']);
    }

    public function test_it_falls_back_to_the_image_source_when_the_library_has_no_fit(): void
    {
        $this->fakeScript();
        $this->fakePinterest();
        // Only the first slide can be matched locally.
        $this->libraryItem('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);

        BuildSlideshowFromHook::dispatchSync($this->project());

        $this->assertSame('ready', ContentProject::first()->status);
        // The downloaded fallback joined the library, so the next run can reuse it.
        $this->assertSame(2, MediaLibraryItem::forWorkspace($this->workspace->id)->count());
        $this->assertSame(
            1,
            MediaLibraryItem::forWorkspace($this->workspace->id)->where('source', 'pinterest')->whereNotNull('source_url')->count(),
        );
    }

    public function test_it_counts_a_photo_as_used_so_the_library_rotates(): void
    {
        $this->fakeScript();
        $gym = $this->libraryItem('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);
        $this->libraryItem('Bowl of oatmeal on a counter', ['oatmeal', 'breakfast']);

        BuildSlideshowFromHook::dispatchSync($this->project());

        $gym->refresh();

        $this->assertSame(1, $gym->used_count);
        $this->assertNotNull($gym->last_used_at);
    }

    public function test_it_never_puts_the_same_photo_on_two_slides(): void
    {
        $this->fakeScript(['gym weights fitness', 'gym weights fitness']);
        $this->libraryItem('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);
        $this->libraryItem('Dumbbells on a rack', ['gym', 'weights', 'fitness']);

        BuildSlideshowFromHook::dispatchSync($this->project());

        $ids = array_column(ContentProject::first()->script_data['slides'], 'media_library_item_id');

        $this->assertCount(2, array_unique($ids));
    }

    public function test_a_failure_marks_the_project_failed(): void
    {
        $this->mock(SlideshowScriptService::class, function ($mock): void {
            $mock->shouldReceive('generateFromHook')->andThrow(new \RuntimeException('modelo fora do ar'));
        });

        $project = $this->project();

        try {
            BuildSlideshowFromHook::dispatchSync($project);
        } catch (\Throwable) {
            // The job rethrows so the queue records the failure.
        }

        $project->refresh();

        $this->assertSame('failed', $project->status);
        $this->assertSame('modelo fora do ar', $project->script_data['error']);
    }

    /**
     * @param  list<string>  $queries
     */
    private function fakeScript(array $queries = ['gym weights fitness', 'oatmeal breakfast kitchen'], string $hookFromModel = 'Estudei 4 anos na Coreia'): void
    {
        $slides = [];

        foreach ($queries as $index => $query) {
            $slides[] = [
                'text' => $index === 0 ? $hookFromModel : "Dica número {$index}",
                'image_query' => $query,
            ];
        }

        $this->mock(SlideshowScriptService::class, function ($mock) use ($slides): void {
            // The real service forces the imported hook back over slide 1; the double
            // returns what the model wrote so the job's own guard is exercised.
            $mock->shouldReceive('generateFromHook')->andReturnUsing(function (string $hook) use ($slides): array {
                $slides[0]['text'] = $hook;

                return [
                    'hook' => $hook,
                    'slides' => $slides,
                    'caption' => 'Uma legenda.',
                    'hashtags' => ['skincare'],
                ];
            });
        });
    }

    /**
     * @param  list<string>  $keywords
     */
    private function libraryItem(string $description, array $keywords): MediaLibraryItem
    {
        $item = app(MediaLibrary::class)->store($this->workspace, $this->photoBinary());

        $item->update([
            'description' => $description,
            'keywords' => $keywords,
            'described_at' => now(),
            'orientation' => 'portrait',
        ]);

        return $item->fresh();
    }

    private function project(): ContentProject
    {
        return ContentProject::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Estudei 4 anos na Coreia',
            'type' => 'slideshow',
            'status' => 'generating',
            'script_data' => [
                'hook' => 'Estudei 4 anos na Coreia',
                'source' => 'hook_csv',
                'slide_count' => 2,
                'image_source' => 'pinterest',
                'text_position' => 'center',
                'language' => 'Portuguese (Brazil)',
            ],
        ]);
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
            'i.pinimg.com/*' => Http::response($this->photoBinary(40), 200, ['Content-Type' => 'image/jpeg']),
        ]);
    }

    /**
     * Distinct bytes per call, so library de-duplication does not collapse
     * photos that are meant to be different pictures.
     */
    private function photoBinary(?int $shade = null): string
    {
        static $counter = 0;
        $counter++;

        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, $shade ?? (100 + $counter), 120, 120));

        ob_start();
        imagejpeg($image, null, 80);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
