<?php

namespace Tests\Feature;

use App\Jobs\GenerateSlideshow;
use App\Models\ContentProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SlideshowGeneratorControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_generator_page_lists_recent_carousels(): void
    {
        [$user, $workspace] = $this->premiumUser();

        ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'slideshow',
            'title' => 'Skincare coreano',
        ]);
        ContentProject::factory()->create(['workspace_id' => $workspace->id, 'type' => 'reel']);

        $this->actingAs($user)
            ->get('/tiktok/create')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CreateTikTok')
                ->has('recent', 1)
                ->where('recent.0.title', 'Skincare coreano')
                ->has('tiktokAccounts')
            );
    }

    public function test_it_queues_a_generation(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/tiktok', [
                'topic' => 'skincare coreano',
                'slide_count' => 5,
                'image_source' => 'pinterest',
                'text_position' => 'bottom',
                'text_preset' => 'neon',
            ])
            ->assertStatus(202)
            ->assertJsonPath('status', 'generating');

        $project = ContentProject::first();

        $this->assertSame($workspace->id, $project->workspace_id);
        $this->assertSame('slideshow', $project->type);
        $this->assertSame(5, $project->script_data['slide_count']);
        $this->assertSame('bottom', $project->script_data['text_position']);
        $this->assertSame('neon', $project->script_data['text_preset']);

        Queue::assertPushed(GenerateSlideshow::class);
    }

    public function test_it_blocks_users_without_premium_access(): void
    {
        Queue::fake();
        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->postJson('/tiktok', ['topic' => 'skincare coreano'])
            ->assertStatus(402)
            ->assertJsonPath('error', 'premium_required');

        Queue::assertNothingPushed();
    }

    public function test_it_validates_the_request(): void
    {
        [$user] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/tiktok', [
                'topic' => '',
                'slide_count' => 99,
                'image_source' => 'flickr',
                'text_preset' => 'comic-sans',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['topic', 'slide_count', 'image_source', 'text_preset']);
    }

    public function test_another_workspace_cannot_read_a_carousel(): void
    {
        [$user] = $this->premiumUser();
        $other = ContentProject::factory()->create(['type' => 'slideshow']);

        $this->actingAs($user)->getJson("/tiktok/{$other->id}")->assertStatus(403);
    }

    public function test_it_downloads_every_slide_as_a_zip(): void
    {
        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Storage::disk('public')->put('tiktok/1/1/01.jpg', 'first');
        Storage::disk('public')->put('tiktok/1/1/02.jpg', 'second');

        [$user, $workspace] = $this->premiumUser();

        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'slideshow',
            'status' => 'ready',
            'title' => 'Skincare coreano',
            'script_data' => [
                'caption' => 'Uma legenda.',
                'hashtags' => ['skincare'],
                'slides' => [
                    ['text' => 'a', 'path' => 'tiktok/1/1/01.jpg', 'url' => 'http://localhost/01.jpg'],
                    ['text' => 'b', 'path' => 'tiktok/1/1/02.jpg', 'url' => 'http://localhost/02.jpg'],
                ],
            ],
        ]);

        $response = $this->actingAs($user)->get("/tiktok/{$project->id}/download");

        $response->assertOk();
        $response->assertDownload('skincare-coreano.zip');
    }

    public function test_deleting_a_carousel_removes_its_rendered_slides(): void
    {
        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Storage::disk('public')->put('tiktok/1/1/01.jpg', 'first');

        [$user, $workspace] = $this->premiumUser();

        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'slideshow',
            'script_data' => ['slides' => [['text' => 'a', 'path' => 'tiktok/1/1/01.jpg']]],
        ]);

        $this->actingAs($user)->deleteJson("/tiktok/{$project->id}")->assertOk();

        Storage::disk('public')->assertMissing('tiktok/1/1/01.jpg');
        $this->assertDatabaseMissing('content_projects', ['id' => $project->id]);
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
