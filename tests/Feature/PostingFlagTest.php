<?php

namespace Tests\Feature;

use App\Models\ContentProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostingFlagTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_cannot_post_by_default(): void
    {
        $this->assertFalse(User::factory()->create()->fresh()->canPost());
    }

    public function test_user_without_flag_is_redirected_from_schedule(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/schedule')
            ->assertRedirect('/dashboard');
    }

    public function test_user_without_flag_cannot_send_tiktok_draft(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $project = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->postJson("/tiktok/{$project->id}/draft")
            ->assertForbidden()
            ->assertJson(['error' => 'posting_disabled']);
    }

    public function test_user_without_flag_gets_403_from_posts_api(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/posts')
            ->assertForbidden()
            ->assertJson(['error' => 'posting_disabled']);
    }

    public function test_user_with_flag_can_use_posts_api(): void
    {
        Sanctum::actingAs(User::factory()->canPost()->create());

        $this->getJson('/api/posts')->assertOk();
    }

    public function test_instagram_needs_the_flag_even_when_allowlisted(): void
    {
        $user = User::factory()->create();
        config()->set('services.instagram.feature_user_ids', (string) $user->id);

        $this->assertFalse($user->canUseInstagram());

        $user->forceFill(['can_post' => true])->save();

        $this->assertTrue($user->fresh()->canUseInstagram());
    }

    public function test_flag_is_shared_with_inertia(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertInertia(fn ($page) => $page->where('canPost', false));
    }
}
