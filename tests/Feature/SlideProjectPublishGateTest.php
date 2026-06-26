<?php

namespace Tests\Feature;

use App\Models\SlideProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlideProjectPublishGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_publish_to_instagram_is_forbidden_for_non_allowed_user(): void
    {
        config(['services.instagram.feature_user_ids' => '']);

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => 'Gated',
            'format' => 'post',
            'slides' => [],
        ]);

        $this->actingAs($user)
            ->postJson("/slideshow-editor/{$project->id}/publish/instagram")
            ->assertForbidden();
    }

    public function test_publish_gate_passes_for_listed_user_then_validates(): void
    {
        $user = User::factory()->create();
        config(['services.instagram.feature_user_ids' => (string) $user->id]);

        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => 'Allowed',
            'format' => 'post',
            'slides' => [],
        ]);

        // A listed user gets past the gate, so an empty payload fails validation
        // (422) rather than being blocked by the feature flag (403).
        $this->actingAs($user)
            ->postJson("/slideshow-editor/{$project->id}/publish/instagram")
            ->assertStatus(422);
    }
}
