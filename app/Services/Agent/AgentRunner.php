<?php

namespace App\Services\Agent;

use App\Models\AgentConversation;
use App\Models\AgentMessage;

class AgentRunner
{
    public function __construct(private readonly ModelClient $client) {}

    /**
     * Run a single agent turn: append-only conversation, manual tool loop.
     */
    public function runTurn(AgentConversation $conversation, string $apiKey): void
    {
        $messages = AgentMessage::where('agent_conversation_id', $conversation->id)
            ->orderBy('id')
            ->get()
            ->map(fn (AgentMessage $message): array => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->all();

        $params = [
            'model' => config('services.anthropic.agent_model', 'claude-opus-5-5'),
            'maxTokens' => 16000,
            'system' => AgentPrompt::system(),
            'tools' => AgentToolbox::definitions(),
            'messages' => $messages,
            'outputConfig' => ['effort' => 'medium'],
        ];

        $toolbox = app(AgentToolbox::class);

        for ($i = 0; $i < 25; $i++) {
            $response = $this->client->send($params, $apiKey);

            $assistantContent = $response['content'] ?? [];
            $stopReason = $response['stop_reason'] ?? null;
            $usage = $response['usage'] ?? null;

            AgentMessage::create([
                'agent_conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $assistantContent,
                'usage' => $usage,
            ]);

            $messages[] = ['role' => 'assistant', 'content' => $assistantContent];

            if ($stopReason === 'tool_use') {
                $toolResults = [];

                foreach ($assistantContent as $block) {
                    if (($block['type'] ?? null) !== 'tool_use') {
                        continue;
                    }

                    $name = (string) ($block['name'] ?? '');
                    $input = is_array($block['input'] ?? null) ? $block['input'] : [];
                    $toolUseId = $block['id'] ?? null;

                    try {
                        $resultContent = $toolbox->execute($conversation, $name, $input);
                        $toolResults[] = [
                            'type' => 'tool_result',
                            'tool_use_id' => $toolUseId,
                            'content' => $resultContent,
                        ];
                    } catch (\Throwable $e) {
                        $toolResults[] = [
                            'type' => 'tool_result',
                            'tool_use_id' => $toolUseId,
                            'content' => [['type' => 'text', 'text' => $e->getMessage()]],
                            'is_error' => true,
                        ];
                    }
                }

                if ($toolResults === []) {
                    break;
                }

                AgentMessage::create([
                    'agent_conversation_id' => $conversation->id,
                    'role' => 'user',
                    'content' => $toolResults,
                ]);

                $messages[] = ['role' => 'user', 'content' => $toolResults];
                $params['messages'] = $messages;

                continue;
            }

            break;
        }
    }
}
