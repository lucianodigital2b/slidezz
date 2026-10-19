<?php

namespace App\Services\Agent;

interface ModelClient
{
    /**
     * Send a Messages API request and return the decoded message as a plain
     * associative array with keys: id, content[], stop_reason, usage.
     *
     * @param  array<string, mixed>  $params
     * @return array{id: ?string, content: array<int, mixed>, stop_reason: ?string, usage: array<string, mixed>|null}
     */
    public function send(array $params, string $apiKey): array;
}
