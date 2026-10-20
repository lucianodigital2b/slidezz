<?php

namespace App\Jobs;

use App\Models\AgentConversation;
use App\Models\AgentMessage;
use App\Services\Agent\AgentRunner;
use App\Services\Agent\ModelClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class RunAgentTurn implements ShouldQueue
{
    use Queueable;

    /** The model returns thinking blocks and can use several tools per turn. */
    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(
        public AgentConversation $conversation,
        public bool $usesPlatformKey = false,
    ) {}

    public function handle(): void
    {
        $conversation = $this->conversation->fresh();

        if (! $conversation) {
            return;
        }

        $user = $conversation->user;
        $apiKey = $user->byokAnthropicKey() ?? config('services.anthropic.key');

        if (! $apiKey) {
            $this->giveUp($conversation, 'Add your Anthropic API key in Settings → Integrations to use the agent.');

            return;
        }

        $conversation->update(['status' => 'running', 'error' => null]);

        try {
            $runner = new AgentRunner(app(ModelClient::class));
            $runner->runTurn($conversation, $apiKey);

            $conversation->update(['status' => 'idle', 'error' => null]);
            $this->maybeSetTitle($conversation);
        } catch (\Throwable $e) {
            Log::error('[Agent] Turn failed', [
                'conversation_id' => $conversation->id,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);

            $this->closeDanglingToolUses($conversation);

            $conversation->update([
                'status' => 'error',
                'error' => 'The agent could not complete the turn. Please try again.',
            ]);

            if ($this->usesPlatformKey) {
                $user->addCredits(1);
            }
        }
    }

    /**
     * Runs when the worker kills the job (timeout, crash), so the
     * conversation doesn't stay "running" forever.
     */
    public function failed(?\Throwable $e): void
    {
        $conversation = $this->conversation->fresh();

        if ($conversation && $conversation->status === 'running') {
            $this->closeDanglingToolUses($conversation);
            $this->giveUp($conversation, 'The agent could not complete the turn. Please try again.');
        }
    }

    private function giveUp(AgentConversation $conversation, string $error): void
    {
        $conversation->update(['status' => 'error', 'error' => $error]);

        if ($this->usesPlatformKey) {
            $conversation->user->addCredits(1);
        }
    }

    /**
     * If the turn died between a tool_use and its tool_result, append error
     * results so the history stays valid for the next turn.
     */
    private function closeDanglingToolUses(AgentConversation $conversation): void
    {
        $last = AgentMessage::where('agent_conversation_id', $conversation->id)
            ->orderByDesc('id')
            ->first();

        if (! $last || $last->role !== 'assistant') {
            return;
        }

        $results = collect($last->content)
            ->where('type', 'tool_use')
            ->map(fn (array $block): array => [
                'type' => 'tool_result',
                'tool_use_id' => $block['id'],
                'content' => [['type' => 'text', 'text' => 'Interrupted before this tool finished.']],
                'is_error' => true,
            ])
            ->values()
            ->all();

        if ($results !== []) {
            AgentMessage::create([
                'agent_conversation_id' => $conversation->id,
                'role' => 'user',
                'content' => $results,
            ]);
        }
    }

    private function maybeSetTitle(AgentConversation $conversation): void
    {
        if ($conversation->title !== 'New conversation') {
            return;
        }

        $first = AgentMessage::where('agent_conversation_id', $conversation->id)
            ->where('role', 'user')
            ->orderBy('id')
            ->first();

        if (! $first) {
            return;
        }

        $text = collect($first->content)
            ->where('type', 'text')
            ->pluck('text')
            ->implode(' ');

        if ($text !== '') {
            $conversation->update(['title' => mb_substr($text, 0, 60)]);
        }
    }
}
