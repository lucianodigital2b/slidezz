<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
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
            ->assertRedirect('/settings/profile');
    }

    public function test_only_accounts_from_users_workspaces_are_returned(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $ownAccount = SocialAccount::factory()->create(['workspace_id' => $workspace->id]);

        $otherWorkspace = Workspace::factory()->create();
        SocialAccount::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $this->actingAs($user)
            ->get('/settings/profile')
            ->assertInertia(fn ($page) => $page
                ->has('socialAccounts', 1)
                ->where('socialAccounts.0.id', $ownAccount->id)
            );
    }

    public function test_connect_redirects_unauthenticated_user(): void
    {
        $this->get('/social-accounts/tiktok/connect')->assertRedirect('/login');
    }

    public function test_instagram_connect_is_forbidden_for_non_allowed_user(): void
    {
        config(['services.instagram.feature_user_ids' => '']);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/social-accounts/instagram/connect')
            ->assertForbidden();
    }

    public function test_instagram_connect_is_allowed_for_listed_user(): void
    {
        $user = User::factory()->create();
        config(['services.instagram.feature_user_ids' => "999,{$user->id}"]);

        $this->actingAs($user)
            ->get('/social-accounts/instagram/connect')
            ->assertRedirect();
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
            ->assertRedirect('/settings/profile');

        $this->assertDatabaseMissing('social_accounts', ['id' => $account->id]);
    }

    public function test_instagram_callback_falls_back_to_session_state_when_instagram_omits_it(): void
    {
        Http::fake([
            'api.instagram.com/oauth/access_token' => Http::response(['access_token' => 'short-lived', 'user_id' => '17841400000000001']),
            'graph.instagram.com/*/access_token*' => Http::response(['access_token' => 'long-lived', 'expires_in' => 5_184_000]),
            'graph.instagram.com/access_token*' => Http::response(['access_token' => 'long-lived', 'expires_in' => 5_184_000]),
            'graph.instagram.com/*' => Http::response(['id' => '17841400000000001', 'username' => 'tester', 'name' => 'Tester']),
        ]);

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $nonce = 'nonce-value';
        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspace->id.'|'.$nonce, config('app.key')),
        ])), '+/', '-_'), '=');

        // Instagram redirects back with `code` but drops `state`; the controller
        // must recover the state from the session it stashed before redirecting.
        $this->actingAs($user)
            ->withSession(['instagram_oauth_state' => $state])
            ->get('/social-accounts/instagram/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'instagram',
            'provider_id' => '17841400000000001',
            'workspace_id' => $workspace->id,
            'handle' => 'tester',
        ]);
    }

    public function test_instagram_callback_downloads_avatar_to_media_disk(): void
    {
        $disk = env('MEDIA_DISK', 'public');
        Storage::fake($disk);

        // Instagram CDN avatar URLs expire, so we download and re-host them.
        $expiringAvatar = 'https://scontent.cdninstagram.com/v/t51.82787-19/'.str_repeat('a', 600).'.jpg?oe=expires';

        Http::fake([
            'api.instagram.com/oauth/access_token' => Http::response(['access_token' => 'short-lived', 'user_id' => '27215298438096407']),
            'graph.instagram.com/access_token*' => Http::response(['access_token' => 'long-lived', 'expires_in' => 5_184_000]),
            'graph.instagram.com/*' => Http::response(['id' => '27215298438096407', 'username' => 'dailyhair.app', 'profile_picture_url' => $expiringAvatar]),
            'scontent.cdninstagram.com/*' => Http::response('fake-image-bytes', 200),
        ]);

        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $nonce = 'nonce-value';
        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspace->id.'|'.$nonce, config('app.key')),
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['instagram_oauth_state' => $state])
            ->get('/social-accounts/instagram/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('success');

        // The avatar file is re-hosted on our media disk...
        Storage::disk($disk)->assertExists('instagram/avatars/27215298438096407.jpg');

        // ...and the stored avatar no longer points at the expiring Instagram CDN URL.
        $account = SocialAccount::where('provider_id', '27215298438096407')->firstOrFail();
        $this->assertNotEquals($expiringAvatar, $account->avatar);
        $this->assertStringNotContainsString('scontent.cdninstagram.com', (string) $account->avatar);
    }

    public function test_instagram_callback_rejects_tampered_state(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => 'nonce-value',
            'hmac' => 'forged-hmac',
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['instagram_oauth_state' => $state])
            ->get('/social-accounts/instagram/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('error');

        $this->assertDatabaseMissing('social_accounts', ['provider' => 'instagram']);
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
