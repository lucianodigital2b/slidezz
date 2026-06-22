<?php

namespace Tests\Unit;

use App\Services\Meta\MetaConversionsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MetaConversionsServiceTest extends TestCase
{
    private MetaConversionsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MetaConversionsService;
        config([
            'services.meta.pixel_id' => '1234567890',
            'services.meta.capi_token' => 'test-token',
            'services.meta.test_event_code' => null,
            'services.meta.graph_version' => 'v21.0',
        ]);
    }

    public function test_is_not_configured_without_credentials(): void
    {
        config(['services.meta.pixel_id' => null]);

        $this->assertFalse($this->service->isConfigured());
    }

    public function test_send_event_does_nothing_when_not_configured(): void
    {
        config(['services.meta.capi_token' => null]);
        Http::fake();

        $this->assertFalse($this->service->sendEvent('Lead', 'evt-1'));
        Http::assertNothingSent();
    }

    public function test_send_event_posts_hashed_user_data_to_graph_api(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1]),
        ]);

        $result = $this->service->sendEvent(
            'Purchase',
            'evt-42',
            ['email' => '  Test@Example.com '],
            ['currency' => 'USD', 'value' => 36],
            'https://slidezz.app/checkout',
        );

        $this->assertTrue($result);

        Http::assertSent(function (Request $request) {
            $event = $request->data()['data'][0];

            return str_starts_with($request->url(), 'https://graph.facebook.com/v21.0/1234567890/events')
                && $request->data()['access_token'] === 'test-token'
                && $event['event_name'] === 'Purchase'
                && $event['event_id'] === 'evt-42'
                && $event['action_source'] === 'website'
                && $event['user_data']['em'] === hash('sha256', 'test@example.com')
                && $event['custom_data']['value'] === 36;
        });
    }

    public function test_send_event_includes_test_event_code_when_configured(): void
    {
        config(['services.meta.test_event_code' => 'TEST123']);
        Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1])]);

        $this->service->sendEvent('Lead', 'evt-9');

        Http::assertSent(fn (Request $request) => ($request->data()['test_event_code'] ?? null) === 'TEST123');
    }

    public function test_send_event_returns_false_on_api_failure(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => 'bad'], 400)]);

        $this->assertFalse($this->service->sendEvent('Lead', 'evt-err'));
    }
}
