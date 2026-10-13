<?php

namespace Tests\Feature;

use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class InstagramWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- verify (subscription handshake) ---

    public function test_verify_echoes_challenge_when_token_matches(): void
    {
        config(['services.instagram.webhook_verify_token' => 'my-token']);

        $this->get('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=my-token&hub.challenge=CHALLENGE123')
            ->assertStatus(200)
            ->assertContent('CHALLENGE123');
    }

    public function test_verify_rejects_wrong_token(): void
    {
        config(['services.instagram.webhook_verify_token' => 'my-token']);

        $this->get('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=X')
            ->assertStatus(403);
    }

    public function test_verify_rejects_when_no_token_configured(): void
    {
        config(['services.instagram.webhook_verify_token' => null]);

        $this->get('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=anything&hub.challenge=X')
            ->assertStatus(403);
    }

    // --- signature verification ---

    public function test_handle_rejects_invalid_signature(): void
    {
        config(['services.instagram.client_secret' => 'app-secret']);

        $this->postJson('/webhooks/instagram', ['object' => 'instagram', 'entry' => []], [
            'X-Hub-Signature-256' => 'sha256=invalid',
        ])->assertStatus(401);
    }

    public function test_handle_rejects_missing_signature(): void
    {
        config(['services.instagram.client_secret' => 'app-secret']);

        $this->postJson('/webhooks/instagram', ['object' => 'instagram', 'entry' => []])
            ->assertStatus(401);
    }

    public function test_handle_accepts_valid_signature(): void
    {
        $secret = 'app-secret';
        config(['services.instagram.client_secret' => $secret]);

        $body = json_encode(['object' => 'instagram', 'entry' => []]);

        $this->call('POST', '/webhooks/instagram', [], [], [], [
            'HTTP_X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $body, $secret),
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertStatus(200)->assertJson(['message' => 'OK']);
    }

    // --- routing + event handling ---

    public function test_comment_on_known_post_routes_to_workspace_and_refreshes_analytics(): void
    {
        Bus::fake();
        config(['services.instagram.client_secret' => null]);

        $account = SocialAccount::factory()->create([
            'provider' => 'instagram',
            'provider_id' => 'ig_account_1',
        ]);
        $schedule = Schedule::factory()->create([
            'social_account_id' => $account->id,
            'platform_post_id' => 'media_999',
        ]);

        $this->postJson('/webhooks/instagram', [
            'object' => 'instagram',
            'entry' => [[
                'id' => 'ig_account_1',
                'changes' => [[
                    'field' => 'comments',
                    'value' => ['id' => 'comment_1', 'text' => 'nice!', 'media' => ['id' => 'media_999']],
                ]],
            ]],
        ])->assertStatus(200)->assertJson(['message' => 'OK']);

        Bus::assertDispatched(SyncPostAnalytics::class);
    }

    public function test_comment_routes_to_the_correct_workspace_among_many(): void
    {
        Bus::fake();
        config(['services.instagram.client_secret' => null]);

        // Two workspaces, each with its own Instagram account.
        $otherAccount = SocialAccount::factory()->create(['provider' => 'instagram', 'provider_id' => 'ig_other']);
        Schedule::factory()->create(['social_account_id' => $otherAccount->id, 'platform_post_id' => 'media_999']);

        $target = SocialAccount::factory()->create(['provider' => 'instagram', 'provider_id' => 'ig_target']);
        $targetSchedule = Schedule::factory()->create(['social_account_id' => $target->id, 'platform_post_id' => 'media_777']);

        $this->postJson('/webhooks/instagram', [
            'object' => 'instagram',
            'entry' => [[
                'id' => 'ig_target',
                'changes' => [['field' => 'comments', 'value' => ['media' => ['id' => 'media_777']]]],
            ]],
        ])->assertStatus(200);

        // Only the schedule owned by the targeted account gets refreshed.
        Bus::assertDispatchedTimes(SyncPostAnalytics::class, 1);
        Bus::assertDispatched(SyncPostAnalytics::class, fn (SyncPostAnalytics $job) => $job->schedule->is($targetSchedule));
    }

    public function test_event_for_unknown_account_does_not_crash_or_dispatch(): void
    {
        Bus::fake();
        config(['services.instagram.client_secret' => null]);

        $this->postJson('/webhooks/instagram', [
            'object' => 'instagram',
            'entry' => [['id' => 'not_connected', 'changes' => [['field' => 'comments', 'value' => []]]]],
        ])->assertStatus(200)->assertJson(['message' => 'OK']);

        Bus::assertNotDispatched(SyncPostAnalytics::class);
    }

    public function test_non_instagram_object_is_ignored(): void
    {
        config(['services.instagram.client_secret' => null]);

        $this->postJson('/webhooks/instagram', ['object' => 'page', 'entry' => []])
            ->assertStatus(200)->assertJson(['message' => 'Ignored']);
    }

    public function test_unhandled_field_returns_ok(): void
    {
        Bus::fake();
        config(['services.instagram.client_secret' => null]);

        $account = SocialAccount::factory()->create(['provider' => 'instagram', 'provider_id' => 'ig_x']);

        $this->postJson('/webhooks/instagram', [
            'object' => 'instagram',
            'entry' => [['id' => 'ig_x', 'changes' => [['field' => 'story_insights', 'value' => []]]]],
        ])->assertStatus(200)->assertJson(['message' => 'OK']);

        Bus::assertNotDispatched(SyncPostAnalytics::class);
        // Workspace exists but no dispatch — just structured logging for now.
        $this->assertDatabaseHas('workspaces', ['id' => $account->workspace_id]);
    }
}
