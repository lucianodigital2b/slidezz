<?php

namespace Tests\Feature\Api;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
    }

    public function test_requires_a_token(): void
    {
        $this->getJson('/api/posts')->assertUnauthorized();
    }

    public function test_lists_only_own_social_accounts(): void
    {
        [$user, $account] = $this->accountFor('tiktok');
        SocialAccount::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/social-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $account->id);
    }

    public function test_store_uploads_images_and_schedules_a_tiktok_carousel(): void
    {
        [$user, $account] = $this->accountFor('tiktok');
        Sanctum::actingAs($user);

        $response = $this->post('/api/posts', [
            'social_account_id' => $account->id,
            'publish_at' => now()->addDay()->toISOString(),
            'caption' => 'Rotina de cachos',
            'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()->assertJsonPath('data.status', 'pending');

        $project = ContentProject::firstOrFail();
        $this->assertSame('carousel', $project->type);
        $this->assertSame('Rotina de cachos', $project->script_data['caption']);
        $this->assertCount(2, $project->script_data['slides']);
        Storage::disk('public')->assertExists($project->script_data['slides'][0]['path']);
    }

    public function test_store_converts_an_offset_publish_at_to_utc(): void
    {
        [$user, $account] = $this->accountFor('tiktok');
        Sanctum::actingAs($user);

        $local = now()->addDay()->startOfHour()->setTimezone('America/Sao_Paulo');

        $this->post('/api/posts', [
            'social_account_id' => $account->id,
            'publish_at' => $local->format('Y-m-d\TH:i:sP'),
            'images' => [UploadedFile::fake()->image('a.jpg')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame(
            $local->copy()->utc()->format('Y-m-d H:i:s'),
            Schedule::firstOrFail()->getRawOriginal('publish_at'),
        );
    }

    public function test_store_single_instagram_image_becomes_an_image_post(): void
    {
        [$user, $account] = $this->accountFor('instagram');
        Sanctum::actingAs($user);

        $this->post('/api/posts', [
            'social_account_id' => $account->id,
            'publish_at' => now()->addDay()->toISOString(),
            'images' => [UploadedFile::fake()->image('a.jpg')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $project = ContentProject::firstOrFail();
        $this->assertSame('image', $project->type);
        $this->assertNotEmpty($project->script_data['image_url']);
    }

    public function test_store_rejects_account_from_other_user(): void
    {
        [$user] = $this->accountFor('tiktok');
        $other = SocialAccount::factory()->create();
        Sanctum::actingAs($user);

        $this->post('/api/posts', [
            'social_account_id' => $other->id,
            'publish_at' => now()->addDay()->toISOString(),
            'images' => [UploadedFile::fake()->image('a.jpg')],
        ], ['Accept' => 'application/json'])->assertNotFound();

        $this->assertSame(0, Schedule::count());
    }

    public function test_update_duplicate_and_delete(): void
    {
        [$user, $account] = $this->accountFor('tiktok');
        $schedule = Schedule::factory()->create([
            'social_account_id' => $account->id,
            'content_project_id' => ContentProject::factory()->create(['workspace_id' => $account->workspace_id])->id,
            'publish_at' => now()->addDay(),
            'status' => ScheduleStatus::Pending,
        ]);
        Sanctum::actingAs($user);

        $this->patchJson("/api/posts/{$schedule->id}", ['caption' => 'nova', 'publish_at' => now()->addDays(2)->toISOString()])
            ->assertOk()
            ->assertJsonPath('data.caption', 'nova');

        $this->postJson("/api/posts/{$schedule->id}/duplicate", ['publish_at' => now()->addDays(3)->toISOString()])
            ->assertCreated();
        $this->assertSame(2, Schedule::count());

        $this->deleteJson("/api/posts/{$schedule->id}")->assertNoContent();
        $this->assertModelMissing($schedule);
    }

    public function test_cannot_touch_other_users_posts(): void
    {
        [$user] = $this->accountFor('tiktok');
        [, $otherAccount] = $this->accountFor('tiktok');
        $schedule = Schedule::factory()->create(['social_account_id' => $otherAccount->id]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/posts/{$schedule->id}")->assertForbidden();
        $this->getJson('/api/posts')->assertOk()->assertJsonCount(0, 'data');
    }

    /**
     * @return array{0: User, 1: SocialAccount}
     */
    private function accountFor(string $provider): array
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => $provider]);

        return [$user, $account];
    }
}
