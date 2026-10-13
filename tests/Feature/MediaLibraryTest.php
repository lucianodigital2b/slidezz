<?php

namespace Tests\Feature;

use App\Exceptions\MediaLibraryException;
use App\Jobs\DescribeMediaItem;
use App\Jobs\ImportPinterestSearchToLibrary;
use App\Models\MediaLibraryItem;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Media\MediaLibrary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');

        $this->user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
        ]);
        $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    }

    public function test_it_stores_the_file_and_reads_its_dimensions(): void
    {
        Bus::fake();

        $item = app(MediaLibrary::class)->storeFromUpload(
            $this->workspace,
            UploadedFile::fake()->createWithContent('praia-manha.jpg', $this->photoBinary(800, 1400)),
        );

        Storage::disk('public')->assertExists($item->path);
        $this->assertSame(800, $item->width);
        $this->assertSame(1400, $item->height);
        $this->assertSame('portrait', $item->orientation);
        $this->assertSame('upload', $item->source);
        $this->assertSame($this->workspace->id, $item->workspace_id);
    }

    public function test_it_seeds_keywords_from_the_filename_so_a_new_item_is_matchable(): void
    {
        Bus::fake();

        $item = app(MediaLibrary::class)->storeFromUpload(
            $this->workspace,
            UploadedFile::fake()->createWithContent('minimal bathroom counter.jpg', $this->photoBinary()),
        );

        $this->assertSame(['minimal', 'bathroom', 'counter'], $item->keywords);
    }

    public function test_it_classifies_orientation(): void
    {
        Bus::fake();
        $library = app(MediaLibrary::class);

        $landscape = $library->store($this->workspace, $this->photoBinary(1600, 900));
        $square = $library->store($this->workspace, $this->photoBinary(1000, 1000));

        $this->assertSame('landscape', $landscape->orientation);
        $this->assertSame('square', $square->orientation);
    }

    public function test_the_same_photo_imported_twice_is_one_item(): void
    {
        Bus::fake();
        $library = app(MediaLibrary::class);
        $binary = $this->photoBinary();

        $first = $library->store($this->workspace, $binary, ['query' => 'praia']);
        $second = $library->store($this->workspace, $binary, ['query' => 'outra coisa']);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, MediaLibraryItem::count());
    }

    public function test_two_workspaces_keep_their_own_copy_of_the_same_photo(): void
    {
        Bus::fake();
        $other = Workspace::factory()->create(['owner_id' => User::factory()]);
        $library = app(MediaLibrary::class);
        $binary = $this->photoBinary();

        $library->store($this->workspace, $binary);
        $library->store($other, $binary);

        $this->assertSame(2, MediaLibraryItem::count());
    }

    public function test_it_queues_a_description_for_every_new_item(): void
    {
        Bus::fake();

        app(MediaLibrary::class)->store($this->workspace, $this->photoBinary());

        Bus::assertDispatched(DescribeMediaItem::class);
    }

    public function test_it_downloads_a_remote_photo_into_the_workspace(): void
    {
        Bus::fake();
        Http::fake(['i.pinimg.com/*' => Http::response($this->photoBinary(), 200, ['Content-Type' => 'image/jpeg'])]);

        $item = app(MediaLibrary::class)->storeFromUrl(
            $this->workspace,
            'https://i.pinimg.com/originals/aa/bb/cc/photo.jpg',
            ['source' => 'pinterest', 'source_id' => '123', 'query' => 'beach sunrise'],
        );

        Storage::disk('public')->assertExists($item->path);
        $this->assertSame('pinterest', $item->source);
        $this->assertSame('123', $item->source_id);
        $this->assertSame('https://i.pinimg.com/originals/aa/bb/cc/photo.jpg', $item->source_url);
    }

    public function test_it_rejects_a_file_that_is_not_an_image(): void
    {
        $this->expectException(MediaLibraryException::class);

        app(MediaLibrary::class)->store($this->workspace, 'isto nao e uma imagem');
    }

    public function test_the_library_page_lists_the_workspace_media(): void
    {
        MediaLibraryItem::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
        MediaLibraryItem::factory()->create(['workspace_id' => Workspace::factory()->create(['owner_id' => User::factory()])->id]);

        $this->actingAs($this->user)
            ->get('/media-library')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MediaLibrary')
                ->has('items', 3)
                ->where('stats.total', 3));
    }

    public function test_uploading_through_the_page_saves_the_files(): void
    {
        Bus::fake();

        $this->actingAs($this->user)
            ->post('/media-library', [
                'files' => [
                    UploadedFile::fake()->createWithContent('a.jpg', $this->photoBinary()),
                    UploadedFile::fake()->createWithContent('b.jpg', $this->photoBinary(900, 1500)),
                ],
            ])
            ->assertRedirect();

        $this->assertSame(2, MediaLibraryItem::forWorkspace($this->workspace->id)->count());
    }

    public function test_importing_a_search_queues_the_job(): void
    {
        Bus::fake();

        $this->actingAs($this->user)
            ->post('/media-library/import', ['query' => 'korean skincare shelfie', 'limit' => 10])
            ->assertRedirect();

        Bus::assertDispatched(
            ImportPinterestSearchToLibrary::class,
            fn (ImportPinterestSearchToLibrary $job): bool => $job->query === 'korean skincare shelfie' && $job->limit === 10,
        );
    }

    public function test_deleting_removes_the_row_and_the_file(): void
    {
        Bus::fake();
        $item = app(MediaLibrary::class)->store($this->workspace, $this->photoBinary());

        $this->actingAs($this->user)->delete("/media-library/{$item->id}")->assertRedirect();

        Storage::disk('public')->assertMissing($item->path);
        $this->assertSame(0, MediaLibraryItem::count());
    }

    public function test_it_refuses_to_delete_another_workspaces_media(): void
    {
        $other = Workspace::factory()->create(['owner_id' => User::factory()]);
        $item = MediaLibraryItem::factory()->create(['workspace_id' => $other->id]);

        $this->actingAs($this->user)->delete("/media-library/{$item->id}")->assertStatus(403);

        $this->assertSame(1, MediaLibraryItem::count());
    }

    private function photoBinary(int $width = 1080, int $height = 1920): string
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, imagecolorallocate($image, random_int(0, 255), 120, 120));

        ob_start();
        imagejpeg($image, null, 80);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
