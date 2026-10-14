<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TikTokWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- verify endpoint ---

    public function test_verify_returns_challenge(): void
    {
        $response = $this->get('/webhooks/tiktok?hub.challenge=abc123');

        $response->assertStatus(200);
        $response->assertContent('abc123');
    }

    public function test_verify_returns_empty_when_no_challenge(): void
    {
        $response = $this->get('/webhooks/tiktok');

        $response->assertStatus(200);
        $response->assertContent('');
    }

    // --- handle endpoint (no webhook secret configured) ---

    public function test_handle_returns_ok_without_signature_when_no_secret_configured(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'post.publish.complete',
            'data' => ['publish_id' => 'fake_id', 'status' => 'UPLOAD_COMPLETE'],
        ]);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
    }

    // --- signature verification ---

    public function test_handle_rejects_request_with_invalid_signature(): void
    {
        config(['services.tiktok.webhook_secret' => 'test-secret']);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'post.publish.complete',
            'data' => [],
        ], ['X-TikTok-Signature' => 'sha256=invalidsignature']);

        $response->assertStatus(401);
    }

    public function test_handle_rejects_request_with_missing_signature(): void
    {
        config(['services.tiktok.webhook_secret' => 'test-secret']);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'post.publish.complete',
            'data' => [],
        ]);

        $response->assertStatus(401);
    }

    public function test_handle_accepts_request_with_valid_signature(): void
    {
        $secret = 'test-secret';
        config(['services.tiktok.webhook_secret' => $secret]);

        $body = json_encode(['event' => 'some.event', 'data' => []]);
        $signature = 'sha256='.hash_hmac('sha256', $body, $secret);

        $response = $this->call('POST', '/webhooks/tiktok', [], [], [], [
            'HTTP_X-TikTok-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
    }

    // --- post.publish.* events ---

    public function test_inbox_delivered_marks_schedule_as_published(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_001',
            'status' => ScheduleStatus::Publishing,
        ]);

        $this->postJson('/webhooks/tiktok', $this->event('post.publish.inbox_delivered', ['publish_id' => 'tiktok_pub_001']));

        $this->assertDatabaseHas('schedules', [
            'id' => $schedule->id,
            'status' => ScheduleStatus::Published->value,
        ]);
    }

    public function test_publish_failed_marks_schedule_as_failed_with_the_reason(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_003',
            'status' => ScheduleStatus::Publishing,
        ]);

        $this->postJson('/webhooks/tiktok', $this->event('post.publish.failed', ['publish_id' => 'tiktok_pub_003', 'reason' => 'picture_size_check_failed']));

        $schedule->refresh();
        $this->assertSame(ScheduleStatus::Failed, $schedule->status);
        $this->assertStringContainsString('1080p', $schedule->error_log);
    }

    public function test_an_event_for_a_settled_schedule_changes_nothing(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_004',
            'status' => ScheduleStatus::Published,
        ]);

        $this->postJson('/webhooks/tiktok', $this->event('post.publish.failed', ['publish_id' => 'tiktok_pub_004']));

        $this->assertSame(ScheduleStatus::Published, $schedule->fresh()->status);
    }

    public function test_a_draft_posted_publicly_is_linked_to_its_video_and_synced(): void
    {
        config(['services.tiktok.webhook_secret' => null]);
        Queue::fake();

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'p_inbox_url~v2.111',
            'status' => ScheduleStatus::Published,
        ]);

        // The id is an int64 inside TikTok's JSON-encoded content.
        $this->postJson('/webhooks/tiktok', [
            'event' => 'post.publish.publicly_available',
            'content' => '{"publish_id":"p_inbox_url~v2.111","post_id":7696526215116508424,"publish_type":"INBOX_SHARE"}',
        ])->assertOk();

        $this->assertSame('7696526215116508424', $schedule->fresh()->public_post_id);
        Queue::assertPushed(SyncPostAnalytics::class, fn (SyncPostAnalytics $job): bool => $job->schedule->is($schedule));
    }

    public function test_an_event_for_an_unknown_publish_id_does_not_crash(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $response = $this->postJson('/webhooks/tiktok', $this->event('post.publish.complete', ['publish_id' => 'nonexistent_id']));

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
    }

    /**
     * TikTok's payload shape: `content` is a JSON-encoded string.
     *
     * @param  array<string, string>  $content
     * @return array<string, mixed>
     */
    private function event(string $event, array $content): array
    {
        return [
            'client_key' => 'test',
            'event' => $event,
            'create_time' => now()->timestamp,
            'user_openid' => 'open_id',
            'content' => json_encode($content),
        ];
    }

    public function test_unhandled_event_returns_ok(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'some.future.event',
            'data' => [],
        ]);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
    }
}
