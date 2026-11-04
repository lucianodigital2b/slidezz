<?php

namespace App\Services\Agent;

use App\Models\User;

/**
 * Which Messages API the agent talks to for a given user: their own Anthropic
 * key (BYOK), the platform Anthropic key, or the platform DeepSeek key through
 * DeepSeek's Anthropic-compatible endpoint.
 */
final readonly class AgentConnection
{
    public function __construct(
        public string $apiKey,
        public string $model,
        public ?string $baseUrl = null,
        // DeepSeek's endpoint rejects image blocks; the runner swaps them for text.
        public bool $supportsImages = true,
    ) {}

    public static function for(User $user): ?self
    {
        $anthropicModel = config('services.anthropic.agent_model', 'claude-opus-5-5');

        if ($byok = $user->byokAnthropicKey()) {
            return new self($byok, $anthropicModel);
        }

        if ($key = config('services.anthropic.key')) {
            return new self($key, $anthropicModel);
        }

        if ($key = config('services.deepseek.api_key')) {
            return new self(
                $key,
                config('services.deepseek.agent_model', 'deepseek-v4-pro'),
                config('services.deepseek.anthropic_base_url', 'https://api.deepseek.com/anthropic'),
                supportsImages: false,
            );
        }

        return null;
    }
}
