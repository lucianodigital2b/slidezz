<?php

namespace App\Services\Agent;

use App\Models\AgentConversation;
use App\Models\AgentMessage;

class AgentRunner
{
    public function __construct(
        private readonly ModelClient $client,
        private readonly ?AgentImageDescriber $describer = null,
    ) {}

    /**
     * Run a single agent turn: append-only conversation, manual tool loop.
     */
    public function runTurn(AgentConversation $conversation, AgentConnection $connection): void
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
            'model' => $connection->model,
            'maxTokens' => 16000,
            'system' => AgentPrompt::system(),
            'tools' => AgentToolbox::definitions(),
            'messages' => $messages,
            'outputConfig' => ['effort' => 'medium'],
        ];

        $toolbox = app(AgentToolbox::class);

        for ($i = 0; $i < 25; $i++) {
            $response = $this->client->send($this->forConnection($params, $connection), $connection->apiKey, $connection->baseUrl);

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

    /**
     * Models without image input get each image block replaced by a text
     * description. The stored history keeps the real images.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function forConnection(array $params, AgentConnection $connection): array
    {
        if ($connection->supportsImages) {
            return $params;
        }

        $params['messages'] = array_map(function (array $message): array {
            if (is_array($message['content'] ?? null)) {
                $message['content'] = $this->describeImages($message['content']);
            }

            return $message;
        }, $params['messages']);

        return $params;
    }

    /**
     * @param  array<int, mixed>  $blocks
     * @return array<int, mixed>
     */
    private function describeImages(array $blocks): array
    {
        return array_map(function ($block) {
            if (! is_array($block)) {
                return $block;
            }

            if (($block['type'] ?? null) === 'image' && isset($block['source']['data'])) {
                $describer = $this->describer ?? app(AgentImageDescriber::class);

                return [
                    'type' => 'text',
                    'text' => '[Imagem] '.$describer->describe($block['source']['data'], $block['source']['media_type'] ?? 'image/jpeg'),
                ];
            }

            if (($block['type'] ?? null) === 'tool_result' && is_array($block['content'] ?? null)) {
                $block['content'] = $this->describeImages($block['content']);
            }

            return $block;
        }, $blocks);
    }
}
