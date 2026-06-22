<?php

namespace Tests\Feature;

use App\Jobs\SendMetaConversionEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class MetaEventControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_mirrors_a_valid_event_to_the_conversions_api(): void
    {
        Bus::fake();

        $response = $this->postJson('/meta/event', [
            'event_name' => 'Lead',
            'event_id' => 'evt-123',
            'event_source_url' => 'https://slidezz.app/',
            'custom_data' => ['content_name' => 'pricing'],
        ]);

        $response->assertNoContent();

        Bus::assertDispatchedAfterResponse(
            SendMetaConversionEvent::class,
            fn (SendMetaConversionEvent $job) => $job->eventName === 'Lead'
                && $job->eventId === 'evt-123'
                && $job->eventSourceUrl === 'https://slidezz.app/'
                && $job->customData['content_name'] === 'pricing',
        );
    }

    public function test_it_rejects_an_event_outside_the_allowlist(): void
    {
        Bus::fake();

        $this->postJson('/meta/event', [
            'event_name' => 'NotARealEvent',
            'event_id' => 'evt-123',
        ])->assertStatus(422);

        Bus::assertNotDispatchedAfterResponse(SendMetaConversionEvent::class);
    }

    public function test_it_attaches_authenticated_user_match_data(): void
    {
        Bus::fake();

        $user = User::factory()->create(['email' => 'creator@example.com']);

        $this->actingAs($user)->postJson('/meta/event', [
            'event_name' => 'CompleteRegistration',
            'event_id' => 'evt-reg',
        ])->assertNoContent();

        Bus::assertDispatchedAfterResponse(
            SendMetaConversionEvent::class,
            fn (SendMetaConversionEvent $job) => $job->userData['email'] === 'creator@example.com'
                && $job->userData['external_id'] === (string) $user->id,
        );
    }
}
