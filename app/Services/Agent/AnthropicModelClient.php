<?php

namespace App\Services\Agent;

use Anthropic\Client;
use Anthropic\Messages\Message;

class AnthropicModelClient implements ModelClient
{
    /**
     * Send a Messages API request using the official Anthropic PHP SDK and
     * return the response as a plain snake_case-ish array.
     *
     * @param  array<string, mixed>  $params
     * @return array{id: ?string, content: array<int, mixed>, stop_reason: ?string, usage: array<string, mixed>|null}
     */
    public function send(array $params, string $apiKey): array
    {
        $client = new Client(apiKey: $apiKey);

        return self::toArray($client->messages->create(...$params));
    }

    /**
     * The SDK serializes to the API wire format (snake_case keys), which is
     * also what we store and send back on the next request.
     *
     * @return array{id: ?string, content: array<int, mixed>, stop_reason: ?string, usage: array<string, mixed>|null}
     */
    public static function toArray(Message $message): array
    {
        $decoded = json_decode(json_encode($message), true);

        return [
            'id' => $decoded['id'] ?? null,
            'content' => $decoded['content'] ?? [],
            'stop_reason' => $decoded['stop_reason'] ?? null,
            'usage' => $decoded['usage'] ?? null,
        ];
    }
}
