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

        $images = [];
        $this->collectImages($params['messages'], $images);

        if ($images === []) {
            return $params;
        }

        $descriptions = ($this->describer ?? app(AgentImageDescriber::class))->describeMany($images);

        $params['messages'] = array_map(function (array $message) use ($descriptions): array {
            if (is_array($message['content'] ?? null)) {
                $message['content'] = $this->replaceImages($message['content'], $descriptions);
            }

            return $message;
        }, $params['messages']);

        return $params;
    }

    /**
     * @param  array<int, mixed>  $blocks
     * @param  array<string, array{data: string, media_type: string}>  $images
     */
    private function collectImages(array $blocks, array &$images): void
    {
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }

            if (($block['type'] ?? null) === 'image' && isset($block['source']['data'])) {
                $images[md5($block['source']['data'])] = [
                    'data' => $block['source']['data'],
                    'media_type' => $block['source']['media_type'] ?? 'image/jpeg',
                ];
            } elseif (is_array($block['content'] ?? null)) {
                $this->collectImages($block['content'], $images);
            }
        }
    }

    /**
     * @param  array<int, mixed>  $blocks
     * @param  array<string, string>  $descriptions
     * @return array<int, mixed>
     */
    private function replaceImages(array $blocks, array $descriptions): array
    {
        return array_map(function ($block) use ($descriptions) {
            if (! is_array($block)) {
                return $block;
            }

            if (($block['type'] ?? null) === 'image' && isset($block['source']['data'])) {
                return ['type' => 'text', 'text' => '[Imagem] '.($descriptions[md5($block['source']['data'])] ?? 'sem descrição')];
            }

            if (($block['type'] ?? null) === 'tool_result' && is_array($block['content'] ?? null)) {
                $block['content'] = $this->replaceImages($block['content'], $descriptions);
            }

            return $block;
        }, $blocks);
    }
}
