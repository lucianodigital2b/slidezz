<?php

namespace Tests\Feature;

use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\TikTokPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TikTokPublisherTest extends TestCase
{
    use RefreshDatabase;

    private const INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/content/init/';

    private const VIDEO_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';

    public function test_it_sends_the_carousel_to_the_tiktok_inbox_as_a_draft(): void
    {
        Http::fake([self::INIT_URL => Http::response([
            'data' => ['publish_id' => 'v_pub_id_123'],
            'error' => ['code' => 'ok', 'message' => '', 'log_id' => 'abc'],
        ])]);

        $schedule = $this->schedule();

        $publishId = (new TikTokPublisher)->publish($schedule->contentProject, $schedule);

        $this->assertSame('v_pub_id_123', $publishId);

        Http::assertSent(function ($request): bool {
            $body = $request->data();

            return $request->url() === self::INIT_URL
                && $body['media_type'] === 'PHOTO'
                && $body['post_mode'] === 'MEDIA_UPLOAD'
                && $body['source_info']['source'] === 'PULL_FROM_URL'
                && $body['source_info']['photo_cover_index'] === 0
                && $body['source_info']['photo_images'] === [
                    'https://slidezz.test/01.jpg',
                    'https://slidezz.test/02.jpg',
                ]
                && $body['post_info']['title'] === 'Estudei 4 anos na Coreia'
                && $body['post_info']['description'] === "Uma legenda.\n\n#skincare #coreano";
        });
    }

    public function test_slide_urls_are_rebuilt_from_their_paths_on_the_current_media_domain(): void
    {
        config(['filesystems.media_disk' => 'public', 'filesystems.disks.public.url' => 'https://media.verified.test']);
        Http::fake([self::INIT_URL => Http::response([
            'data' => ['publish_id' => 'v_pub_id_123'],
            'error' => ['code' => 'ok'],
        ])]);

        $schedule = $this->schedule([
            'slides' => [
                ['text' => 'a', 'path' => 'tiktok/1/1/01.jpg', 'url' => 'https://old.r2.dev/tiktok/1/1/01.jpg'],
                ['text' => 'b', 'path' => 'tiktok/1/1/02.jpg', 'url' => 'https://old.r2.dev/tiktok/1/1/02.jpg'],
            ],
        ]);

        (new TikTokPublisher)->publish($schedule->contentProject, $schedule);

        Http::assertSent(fn ($request): bool => $request->data()['source_info']['photo_images'] === [
            'https://media.verified.test/tiktok/1/1/01.jpg',
            'https://media.verified.test/tiktok/1/1/02.jpg',
        ]);
    }

    public function test_an_unverified_domain_surfaces_an_actionable_message(): void
    {
        Http::fake([self::INIT_URL => Http::response([
            'data' => [],
            'error' => ['code' => 'url_ownership_unverified', 'message' => 'unverified'],
        ], 400)]);

        $schedule = $this->schedule();

        $this->expectExceptionMessageMatches('/domínio das imagens não está verificado/');

        (new TikTokPublisher)->publish($schedule->contentProject, $schedule);
    }

    public function test_it_refuses_a_project_with_no_rendered_slides(): void
    {
        Http::fake();

        $schedule = $this->schedule(['image_urls' => []]);

        $this->expectExceptionMessageMatches('/não tem imagens renderizadas/');

        (new TikTokPublisher)->publish($schedule->contentProject, $schedule);
    }

    public function test_it_uploads_a_video_to_the_tiktok_inbox_as_a_draft(): void
    {
        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Storage::disk('public')->put('videos/render.mp4', str_repeat('x', 1000));

        Http::fake([
            self::VIDEO_INIT_URL => Http::response([
                'data' => ['publish_id' => 'v_inbox_1', 'upload_url' => 'https://upload.tiktokapis.com/video/?upload_id=1'],
                'error' => ['code' => 'ok'],
            ]),
            'upload.tiktokapis.com/*' => Http::response(null, 201),
        ]);

        $schedule = $this->schedule(['video_path' => 'videos/render.mp4'], 'video');

        $publishId = (new TikTokPublisher)->publish($schedule->contentProject, $schedule);

        $this->assertSame('v_inbox_1', $publishId);

        Http::assertSent(fn ($request): bool => $request->url() === self::VIDEO_INIT_URL
            && $request->data()['source_info'] === [
                'source' => 'FILE_UPLOAD',
                'video_size' => 1000,
                'chunk_size' => 1000,
                'total_chunk_count' => 1,
            ]);

        Http::assertSent(fn ($request): bool => $request->method() === 'PUT'
            && $request->hasHeader('Content-Range', 'bytes 0-999/1000')
            && strlen($request->body()) === 1000);
    }

    public function test_a_video_that_is_missing_from_the_disk_is_refused(): void
    {
        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Http::fake();

        $schedule = $this->schedule(['video_path' => 'videos/gone.mp4'], 'video');

        $this->expectExceptionMessageMatches('/ainda não foi renderizado/');

        (new TikTokPublisher)->publish($schedule->contentProject, $schedule);
    }

    public function test_it_reads_back_the_publish_status(): void
    {
        Http::fake(['*status/fetch/' => Http::response([
            'data' => ['status' => 'SEND_TO_USER_INBOX'],
        ])]);

        $account = SocialAccount::factory()->create(['provider' => 'tiktok', 'expires_at' => now()->addDay()]);

        $status = (new TikTokPublisher)->fetchStatus($account, 'v_pub_id_123');

        $this->assertSame('SEND_TO_USER_INBOX', $status['status']);
    }

    /**
     * @param  array<string, mixed>  $scriptData
     */
    private function schedule(array $scriptData = [], string $type = 'slideshow'): Schedule
    {
        $workspace = Workspace::factory()->create();

        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => $type,
            'status' => 'ready',
            'script_data' => [
                'hook' => 'Estudei 4 anos na Coreia',
                'caption' => 'Uma legenda.',
                'hashtags' => ['skincare', 'coreano'],
                'image_urls' => ['https://slidezz.test/01.jpg', 'https://slidezz.test/02.jpg'],
                ...$scriptData,
            ],
        ]);

        return Schedule::factory()->create([
            'content_project_id' => $project->id,
            'social_account_id' => SocialAccount::factory()->create([
                'workspace_id' => $workspace->id,
                'provider' => 'tiktok',
                'expires_at' => now()->addDay(),
            ]),
        ]);
    }
}
