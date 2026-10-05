<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Jobs\PublishScheduledContent;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SlideProject;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\VideoProject;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TikTokDraftControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
        Queue::fake();
    }

    public function test_it_sends_a_slide_editor_carousel_as_a_draft(): void
    {
        [$user, $workspace, $account] = $this->userWithTikTok();
        $slideProject = $this->slideProject($workspace);

        $response = $this->actingAs($user)
            ->post("/slideshow-editor/{$slideProject->id}/publish/tiktok", [
                'social_account_id' => $account->id,
                'caption' => 'Legenda',
                'images' => [
                    UploadedFile::fake()->image('1.jpg', 1080, 1920),
                    UploadedFile::fake()->image('2.jpg', 1080, 1920),
                ],
            ])
            ->assertAccepted()
            ->assertJsonPath('status', 'publishing');

        $schedule = Schedule::findOrFail($response->json('id'));
        $data = $schedule->contentProject->script_data;

        $this->assertSame('carousel', $schedule->contentProject->type);
        $this->assertSame('Legenda', $data['caption']);
        $this->assertCount(2, $data['image_urls']);
        $this->assertSame($account->id, $schedule->social_account_id);
        Queue::assertPushed(PublishScheduledContent::class, fn ($job): bool => $job->schedule->is($schedule));
    }

    public function test_it_sends_a_rendered_video_as_a_draft(): void
    {
        [$user, $workspace, $account] = $this->userWithTikTok();
        $video = VideoProject::factory()->ready()->create(['workspace_id' => $workspace->id]);

        $response = $this->actingAs($user)
            ->postJson("/videos/{$video->id}/publish/tiktok", ['social_account_id' => $account->id])
            ->assertAccepted();

        $project = Schedule::findOrFail($response->json('id'))->contentProject;

        $this->assertSame('video', $project->type);
        $this->assertSame('videos/render.mp4', $project->script_data['video_path']);
        Queue::assertPushed(PublishScheduledContent::class);
    }

    public function test_a_video_that_was_not_rendered_is_refused(): void
    {
        [$user, $workspace, $account] = $this->userWithTikTok();
        $video = VideoProject::factory()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->postJson("/videos/{$video->id}/publish/tiktok", ['social_account_id' => $account->id])
            ->assertStatus(422);

        Queue::assertNothingPushed();
    }

    public function test_it_sends_a_generated_carousel_as_a_draft(): void
    {
        [$user, $workspace, $account] = $this->userWithTikTok();
        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'slideshow',
            'status' => 'ready',
            'script_data' => ['image_urls' => ['https://slidezz.test/01.jpg']],
        ]);

        $response = $this->actingAs($user)
            ->postJson("/tiktok/{$project->id}/draft", ['social_account_id' => $account->id])
            ->assertAccepted();

        $this->assertSame($project->id, Schedule::findOrFail($response->json('id'))->content_project_id);
    }

    public function test_it_cannot_send_to_another_workspace_account(): void
    {
        [$user, $workspace] = $this->userWithTikTok();
        $video = VideoProject::factory()->ready()->create(['workspace_id' => $workspace->id]);
        $foreignAccount = SocialAccount::factory()->create(['provider' => 'tiktok']);

        $this->actingAs($user)
            ->postJson("/videos/{$video->id}/publish/tiktok", ['social_account_id' => $foreignAccount->id])
            ->assertNotFound();

        Queue::assertNothingPushed();
    }

    public function test_it_cannot_send_another_workspace_video(): void
    {
        [$user, , $account] = $this->userWithTikTok();
        $video = VideoProject::factory()->ready()->create();

        $this->actingAs($user)
            ->postJson("/videos/{$video->id}/publish/tiktok", ['social_account_id' => $account->id])
            ->assertForbidden();
    }

    public function test_status_reports_the_outcome_to_its_owner_only(): void
    {
        [$user, , $account] = $this->userWithTikTok();
        $schedule = Schedule::factory()->failed()->create([
            'social_account_id' => $account->id,
            'error_log' => 'Reconecte a conta.',
        ]);

        $this->actingAs($user)
            ->getJson("/tiktok-drafts/{$schedule->id}")
            ->assertOk()
            ->assertJsonPath('status', ScheduleStatus::Failed->value)
            ->assertJsonPath('error', 'Reconecte a conta.');

        $this->actingAs(User::factory()->create())
            ->getJson("/tiktok-drafts/{$schedule->id}")
            ->assertNotFound();
    }

    /**
     * @return array{0: User, 1: Workspace, 2: SocialAccount}
     */
    private function userWithTikTok(): array
    {
        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => 'tiktok']);

        return [$user, $workspace, $account];
    }

    private function slideProject(Workspace $workspace): SlideProject
    {
        return SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => 'Slideshow',
            'format' => 'stories',
            'slides' => [],
        ]);
    }
}
