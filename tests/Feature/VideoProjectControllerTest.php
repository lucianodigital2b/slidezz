<?php

namespace Tests\Feature;

use App\Jobs\RenderVideo;
use App\Models\SlideProject;
use App\Models\User;
use App\Models\VideoProject;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VideoProjectControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
    }

    public function test_index_lists_only_the_workspace_videos(): void
    {
        [$user, $workspace] = $this->premiumUser();

        VideoProject::factory()->create(['workspace_id' => $workspace->id, 'title' => 'Meu vídeo']);
        VideoProject::factory()->create();

        $this->actingAs($user)
            ->get('/videos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('VideosIndex')
                ->has('videos', 1)
                ->where('videos.0.title', 'Meu vídeo')
                ->where('videos.0.clip_count', 2)
                ->where('videos.0.cover.type', 'image')
            );
    }

    public function test_it_creates_an_empty_video(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $response = $this->actingAs($user)->postJson('/videos')->assertCreated();

        $video = VideoProject::findOrFail($response->json('id'));

        $this->assertSame($workspace->id, $video->workspace_id);
        $this->assertSame('stories', $video->format);
        // MySQL re-orders JSON object keys, so compare without key order.
        $this->assertEquals(['clips' => [], 'audio' => null], $video->timeline);
    }

    public function test_it_turns_slideshow_images_into_image_clips(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $slideProject = $this->slideProject($workspace, ['format' => 'post', 'title' => 'Dicas de skincare']);

        $response = $this->actingAs($user)
            ->post("/slideshow-editor/{$slideProject->id}/video", [
                'images' => [
                    UploadedFile::fake()->image('slide-1.jpg', 1080, 1350),
                    UploadedFile::fake()->image('slide-2.jpg', 1080, 1350),
                ],
            ], ['Accept' => 'application/json'])
            ->assertCreated();

        $video = VideoProject::findOrFail($response->json('id'));
        $clips = $video->timeline['clips'];

        $this->assertSame($slideProject->id, $video->slide_project_id);
        $this->assertSame('Dicas de skincare', $video->title);
        $this->assertSame('post', $video->format);
        $this->assertCount(2, $clips);
        $this->assertSame(['none', 'fade'], array_column($clips, 'transition'));
        $this->assertSame(['image', 'image'], array_column($clips, 'type'));
        Storage::disk('public')->assertExists($video->storageDirectory().'/slide-01.jpg');
        $this->assertSame($this->mediaUrl($video->storageDirectory().'/slide-02.jpg'), $clips[1]['src']);
    }

    public function test_slideshow_images_can_go_straight_to_a_render(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();
        $slideProject = $this->slideProject($workspace);

        $response = $this->actingAs($user)
            ->post("/slideshow-editor/{$slideProject->id}/video", [
                'images' => [UploadedFile::fake()->image('slide-1.jpg')],
                'render' => '1',
            ], ['Accept' => 'application/json'])
            ->assertCreated();

        $video = VideoProject::findOrFail($response->json('id'));

        $this->assertSame('rendering', $video->status);
        $this->assertSame(0, $video->render_progress);
        Queue::assertPushed(RenderVideo::class, fn (RenderVideo $job): bool => $job->videoProject->is($video) && $job->useFfmpeg);
    }

    public function test_slideshow_images_are_not_rendered_unless_asked(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();
        $slideProject = $this->slideProject($workspace);

        $response = $this->actingAs($user)
            ->post("/slideshow-editor/{$slideProject->id}/video", [
                'images' => [UploadedFile::fake()->image('slide-1.jpg')],
            ], ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertSame('draft', VideoProject::findOrFail($response->json('id'))->status);
        Queue::assertNothingPushed();
    }

    public function test_slideshows_from_another_workspace_cannot_become_videos(): void
    {
        [$user] = $this->premiumUser();
        $slideProject = $this->slideProject(Workspace::factory()->create());

        $this->actingAs($user)
            ->post("/slideshow-editor/{$slideProject->id}/video", [
                'images' => [UploadedFile::fake()->image('slide.jpg')],
            ], ['Accept' => 'application/json'])
            ->assertForbidden();

        $this->assertSame(0, VideoProject::count());
    }

    public function test_the_editor_receives_the_project(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->ready()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->get("/videos/{$video->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('VideoEditor')
                ->where('videoProject.id', $video->id)
                ->where('videoProject.status', 'ready')
                ->where('videoProject.video_url', $this->mediaUrl('videos/render.mp4'))
                ->has('videoProject.timeline.clips', 2)
            );
    }

    public function test_update_saves_a_normalized_timeline(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);
        $imageUrl = $this->mediaUrl('videos/a.jpg');
        $musicUrl = $this->mediaUrl('videos/song.mp3');

        $this->actingAs($user)
            ->putJson("/videos/{$video->id}", [
                'title' => 'Rotina da manhã',
                'format' => 'post',
                'timeline' => [
                    'clips' => [[
                        'id' => 'clip-1',
                        'type' => 'image',
                        'src' => $imageUrl,
                        'duration' => 2.5,
                        'trimStart' => 0,
                        'transition' => 'slide',
                        'text' => '',
                        'textPosition' => 'bottom',
                        'zoom' => true,
                        'muted' => false,
                        'unexpected' => 'dropped',
                    ]],
                    'audio' => ['src' => $musicUrl, 'volume' => 0.4],
                ],
            ])
            ->assertOk();

        $video->refresh();

        $this->assertSame('Rotina da manhã', $video->title);
        $this->assertSame('post', $video->format);
        $this->assertEquals([
            'id' => 'clip-1',
            'type' => 'image',
            'src' => $imageUrl,
            'duration' => 2.5,
            'trimStart' => 0,
            'transition' => 'slide',
            'text' => '',
            'textPosition' => 'bottom',
            'zoom' => true,
            'muted' => false,
        ], $video->timeline['clips'][0]);
        $this->assertSame(['src' => $musicUrl, 'volume' => 0.4], $video->timeline['audio']);
    }

    public function test_update_rejects_media_hosted_elsewhere(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->putJson("/videos/{$video->id}", $this->timelinePayload([
                'src' => 'http://169.254.169.254/latest/meta-data',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('timeline.clips.0.src');

        $this->assertSame([], $video->fresh()->timeline['clips']);
    }

    public function test_update_rejects_invalid_clip_settings(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->putJson("/videos/{$video->id}", $this->timelinePayload([
                'transition' => 'spin',
                'duration' => 120,
                'textPosition' => 'left',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'timeline.clips.0.transition',
                'timeline.clips.0.duration',
                'timeline.clips.0.textPosition',
            ]);
    }

    public function test_other_workspaces_cannot_touch_a_video(): void
    {
        [$user] = $this->premiumUser();
        $video = VideoProject::factory()->create();

        $this->actingAs($user)->get("/videos/{$video->id}")->assertForbidden();
        $this->actingAs($user)->putJson("/videos/{$video->id}", $this->timelinePayload())->assertForbidden();
        $this->actingAs($user)->postJson("/videos/{$video->id}/render")->assertForbidden();
        $this->actingAs($user)->getJson("/videos/{$video->id}/status")->assertForbidden();
        $this->actingAs($user)->delete("/videos/{$video->id}")->assertForbidden();

        $this->assertModelExists($video);
    }

    public function test_media_upload_reports_the_file_type(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);

        $image = $this->actingAs($user)
            ->post("/videos/{$video->id}/media", ['file' => UploadedFile::fake()->image('photo.png')], ['Accept' => 'application/json'])
            ->assertCreated();

        $clip = $this->actingAs($user)
            ->post("/videos/{$video->id}/media", ['file' => UploadedFile::fake()->create('clip.mp4', 500, 'video/mp4')], ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertSame('image', $image->json('type'));
        $this->assertSame('video', $clip->json('type'));
        $this->assertStringStartsWith($this->mediaUrl($video->storageDirectory().'/'), $clip->json('url'));
        $this->assertCount(2, Storage::disk('public')->files($video->storageDirectory()));
    }

    public function test_media_upload_rejects_unsupported_files(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->post("/videos/{$video->id}/media", ['file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }

    public function test_render_queues_the_job(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->create([
            'workspace_id' => $workspace->id,
            'status' => 'failed',
            'render_error' => 'old failure',
        ]);

        $this->actingAs($user)
            ->postJson("/videos/{$video->id}/render")
            ->assertAccepted()
            ->assertJsonPath('status', 'rendering');

        $video->refresh();

        $this->assertSame('rendering', $video->status);
        $this->assertSame(0, $video->render_progress);
        $this->assertNull($video->render_error);
        Queue::assertPushed(RenderVideo::class, fn (RenderVideo $job): bool => $job->videoProject->is($video));
    }

    public function test_render_needs_at_least_one_clip(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->empty()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)->postJson("/videos/{$video->id}/render")->assertUnprocessable();

        $this->assertSame('draft', $video->fresh()->status);
        Queue::assertNothingPushed();
    }

    public function test_render_is_not_queued_twice(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->rendering()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)->postJson("/videos/{$video->id}/render")->assertAccepted();

        $this->assertSame(40, $video->fresh()->render_progress);
        Queue::assertNothingPushed();
    }

    public function test_status_reports_render_progress(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->rendering()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->getJson("/videos/{$video->id}/status")
            ->assertOk()
            ->assertExactJson([
                'status' => 'rendering',
                'render_progress' => 40,
                'render_error' => null,
                'video_url' => null,
            ]);
    }

    public function test_download_sends_the_render_as_an_attachment(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->create([
            'workspace_id' => $workspace->id,
            'title' => 'Dicas de Skincare',
            'status' => 'ready',
            'video_path' => 'videos/render.mp4',
        ]);
        Storage::disk('public')->put('videos/render.mp4', 'mp4');

        $response = $this->actingAs($user)->get("/videos/{$video->id}/download")->assertOk();

        $this->assertStringContainsString('attachment; filename=dicas-de-skincare.mp4', (string) $response->headers->get('Content-Disposition'));
        $this->assertSame('mp4', $response->streamedContent());
    }

    public function test_download_needs_a_render(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->create(['workspace_id' => $workspace->id, 'video_path' => null]);

        $this->actingAs($user)->get("/videos/{$video->id}/download")->assertNotFound();
    }

    public function test_other_workspaces_cannot_download_a_video(): void
    {
        [$user] = $this->premiumUser();
        $video = VideoProject::factory()->create(['video_path' => 'videos/render.mp4']);
        Storage::disk('public')->put('videos/render.mp4', 'mp4');

        $this->actingAs($user)->get("/videos/{$video->id}/download")->assertForbidden();
    }

    public function test_destroy_removes_the_video_and_its_files(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $video = VideoProject::factory()->create(['workspace_id' => $workspace->id]);
        Storage::disk('public')->put($video->storageDirectory().'/render.mp4', 'mp4');

        $this->actingAs($user)
            ->delete("/videos/{$video->id}")
            ->assertRedirect('/videos');

        $this->assertModelMissing($video);
        Storage::disk('public')->assertMissing($video->storageDirectory().'/render.mp4');
    }

    /**
     * @param  array<string, mixed>  $clipOverrides
     * @return array<string, mixed>
     */
    private function timelinePayload(array $clipOverrides = []): array
    {
        return [
            'title' => 'Vídeo',
            'format' => 'stories',
            'timeline' => [
                'clips' => [[
                    'id' => 'clip-1',
                    'type' => 'image',
                    'src' => $this->mediaUrl('videos/a.jpg'),
                    'duration' => 3,
                    'trimStart' => 0,
                    'transition' => 'fade',
                    'text' => 'Olá',
                    'textPosition' => 'center',
                    'zoom' => false,
                    'muted' => false,
                    ...$clipOverrides,
                ]],
                'audio' => null,
            ],
        ];
    }

    private function mediaUrl(string $path): string
    {
        return url(Storage::disk('public')->url($path));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function slideProject(Workspace $workspace, array $attributes = []): SlideProject
    {
        return SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => 'Slideshow',
            'format' => 'stories',
            'slides' => [],
            ...$attributes,
        ]);
    }

    /**
     * @return array{0: User, 1: Workspace}
     */
    private function premiumUser(): array
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
        ]);

        return [$user, Workspace::factory()->create(['owner_id' => $user->id])];
    }
}
