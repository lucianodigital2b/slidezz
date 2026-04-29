<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Models\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'event' => 'video.upload.status',
            'data' => ['publish_id' => 'fake_id', 'status' => 'UPLOAD_COMPLETE'],
        ]);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
    }

    // --- signature verification ---

    public function test_handle_rejects_request_with_invalid_signature(): void
    {
        config(['services.tiktok.webhook_secret' => 'test-secret']);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
            'data' => [],
        ], ['X-TikTok-Signature' => 'sha256=invalidsignature']);

        $response->assertStatus(401);
    }

    public function test_handle_rejects_request_with_missing_signature(): void
    {
        config(['services.tiktok.webhook_secret' => 'test-secret']);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
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

    // --- video.upload.status event ---

    public function test_upload_complete_marks_schedule_as_published(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_001',
            'status' => ScheduleStatus::Publishing,
        ]);

        $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
            'data' => ['publish_id' => 'tiktok_pub_001', 'status' => 'UPLOAD_COMPLETE'],
        ]);

        $this->assertDatabaseHas('schedules', [
            'id' => $schedule->id,
            'status' => ScheduleStatus::Published->value,
        ]);
    }

    public function test_published_status_marks_schedule_as_published(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_002',
            'status' => ScheduleStatus::Publishing,
        ]);

        $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
            'data' => ['publish_id' => 'tiktok_pub_002', 'status' => 'PUBLISHED'],
        ]);

        $this->assertDatabaseHas('schedules', [
            'id' => $schedule->id,
            'status' => ScheduleStatus::Published->value,
        ]);
    }

    public function test_upload_failed_marks_schedule_as_failed(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $schedule = Schedule::factory()->create([
            'platform_post_id' => 'tiktok_pub_003',
            'status' => ScheduleStatus::Publishing,
        ]);

        $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
            'data' => ['publish_id' => 'tiktok_pub_003', 'status' => 'UPLOAD_FAILED'],
        ]);

        $this->assertDatabaseHas('schedules', [
            'id' => $schedule->id,
            'status' => ScheduleStatus::Failed->value,
        ]);
    }

    public function test_upload_status_for_unknown_publish_id_does_not_crash(): void
    {
        config(['services.tiktok.webhook_secret' => null]);

        $response = $this->postJson('/webhooks/tiktok', [
            'event' => 'video.upload.status',
            'data' => ['publish_id' => 'nonexistent_id', 'status' => 'UPLOAD_COMPLETE'],
        ]);

        $response->assertStatus(200)->assertJson(['message' => 'OK']);
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
