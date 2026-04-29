<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialAccountControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected_from_index(): void
    {
        $this->get('/social-accounts')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_social_accounts_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/social-accounts')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('SocialAccounts/Index')
                ->has('accounts')
            );
    }

    public function test_only_accounts_from_users_workspaces_are_returned(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $ownAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);

        $otherWorkspace = Workspace::factory()->create();
        SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $this->actingAs($user)
            ->get('/social-accounts')
            ->assertInertia(fn ($page) => $page
                ->has('accounts', 1)
                ->where('accounts.0.id', $ownAccount->id)
            );
    }

    public function test_connect_redirects_unauthenticated_user(): void
    {
        $this->get('/social-accounts/tiktok/connect')->assertRedirect('/login');
    }

    public function test_connect_creates_workspace_if_none_exists(): void
    {
        $user = User::factory()->create();

        $this->assertDatabaseMissing('workspaces', ['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get('/social-accounts/tiktok/connect')
            ->assertRedirect();

        $this->assertDatabaseHas('workspaces', ['owner_id' => $user->id]);
    }

    public function test_destroy_removes_own_social_account(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);

        $this->actingAs($user)
            ->delete("/social-accounts/{$account->id}")
            ->assertRedirect('/social-accounts');

        $this->assertDatabaseMissing('social_accounts', ['id' => $account->id]);
    }

    public function test_destroy_cannot_remove_other_users_social_account(): void
    {
        $user = User::factory()->create();
        $otherWorkspace = Workspace::factory()->create();
        $otherAccount = SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $this->actingAs($user)
            ->delete("/social-accounts/{$otherAccount->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('social_accounts', ['id' => $otherAccount->id]);
    }
}
