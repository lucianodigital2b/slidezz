<?php

namespace App\Services\Meta;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends server-side conversion events to the Meta Conversions API (CAPI).
 *
 * Pair each event with the browser Pixel using a shared `event_id` so Meta
 * deduplicates the two. PII (email/phone/external_id) is SHA-256 hashed here,
 * never sent in clear text.
 */
class MetaConversionsService
{
    public function isConfigured(): bool
    {
        return ! empty(config('services.meta.pixel_id'))
            && ! empty(config('services.meta.capi_token'));
    }

    /**
     * @param  array<string, mixed>  $userData  Raw fields: email, phone, external_id (hashed here); fbp, fbc, client_ip_address, client_user_agent (sent as-is).
     * @param  array<string, mixed>  $customData  e.g. ['currency' => 'USD', 'value' => 36, 'content_name' => 'Pro']
     */
    public function sendEvent(
        string $eventName,
        string $eventId,
        array $userData = [],
        array $customData = [],
        ?string $eventSourceUrl = null,
        string $actionSource = 'website',
    ): bool {
        if (! $this->isConfigured()) {
            return false;
        }

        $event = array_filter([
            'event_name' => $eventName,
            'event_time' => time(),
            'event_id' => $eventId,
            'action_source' => $actionSource,
            'event_source_url' => $eventSourceUrl,
            'user_data' => $this->buildUserData($userData),
            'custom_data' => array_filter($customData, fn ($value) => $value !== null),
        ], fn ($value) => $value !== null && $value !== []);

        $payload = [
            'data' => [$event],
            'access_token' => config('services.meta.capi_token'),
        ];

        if ($testCode = config('services.meta.test_event_code')) {
            $payload['test_event_code'] = $testCode;
        }

        $version = config('services.meta.graph_version', 'v21.0');
        $pixelId = config('services.meta.pixel_id');

        try {
            $response = Http::timeout(10)
                ->post("https://graph.facebook.com/{$version}/{$pixelId}/events", $payload);

            if ($response->failed()) {
                Log::warning('Meta CAPI event failed', [
                    'event' => $eventName,
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('Meta CAPI event error', [
                'event' => $eventName,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $userData
     * @return array<string, string>
     */
    private function buildUserData(array $userData): array
    {
        $result = [];

        foreach (['email' => 'em', 'phone' => 'ph', 'external_id' => 'external_id'] as $key => $field) {
            if (! empty($userData[$key])) {
                $result[$field] = $this->hash((string) $userData[$key]);
            }
        }

        foreach (['fbp', 'fbc', 'client_ip_address', 'client_user_agent'] as $field) {
            if (! empty($userData[$field])) {
                $result[$field] = (string) $userData[$field];
            }
        }

        return $result;
    }

    private function hash(string $value): string
    {
        return hash('sha256', trim(strtolower($value)));
    }
}
