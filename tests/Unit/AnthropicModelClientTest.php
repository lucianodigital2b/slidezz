<?php

namespace Tests\Unit;

use Anthropic\Messages\Message;
use App\Services\Agent\AnthropicModelClient;
use PHPUnit\Framework\TestCase;

class AnthropicModelClientTest extends TestCase
{
    public function test_sdk_message_converts_to_wire_format(): void
    {
        $message = Message::fromArray([
            'id' => 'msg_1',
            'type' => 'message',
            'role' => 'assistant',
            'model' => 'claude-opus-5-5',
            'stop_reason' => 'tool_use',
            'stop_sequence' => null,
            'content' => [
                ['type' => 'thinking', 'thinking' => '', 'signature' => 'sig'],
                ['type' => 'tool_use', 'id' => 'tu_1', 'name' => 'fetch_tiktok', 'input' => ['url' => 'https://www.tiktok.com/@a/photo/1'], 'caller' => ['type' => 'direct']],
            ],
            'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
        ]);

        $array = AnthropicModelClient::toArray($message);

        $this->assertSame('tool_use', $array['stop_reason']);
        $this->assertSame('tu_1', $array['content'][1]['id']);
        $this->assertSame('sig', $array['content'][0]['signature']);
        $this->assertSame(10, $array['usage']['input_tokens']);
    }
}
