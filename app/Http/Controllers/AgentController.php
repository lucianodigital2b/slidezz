<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\RunAgentTurn;
use App\Models\AgentConversation;
use App\Models\AgentMessage;
use App\Models\AgentPublishRequest;
use App\Models\Schedule;
use App\Models\Workspace;
use App\Services\Agent\AgentPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentController extends Controller
{
    public function __construct(private readonly AgentPresenter $presenter) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Agent', [
            'conversations' => $this->conversationList($user->id),
            'conversation' => null,
            'hasAnthropicKey' => filled($user->byokAnthropicKey()),
            'credits' => $user->credits,
        ]);
    }

    public function show(Request $request, AgentConversation $agentConversation): Response
    {
        $this->authorizeConversation($request, $agentConversation);
        $user = $request->user();

        return Inertia::render('Agent', [
            'conversations' => $this->conversationList($user->id),
            'conversation' => [
                'id' => $agentConversation->id,
                ...$this->presenter->state($agentConversation),
            ],
            'hasAnthropicKey' => filled($user->byokAnthropicKey()),
            'credits' => $user->credits,
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:4000'],
        ]);

        if (! $this->ensureTurnCredits($request)) {
            // Inertia form post: report it as a validation error, not JSON.
            return back()->withErrors(['message' => 'no_credits']);
        }

        $workspace = $this->workspace($request);
        $user = $request->user();

        $conversation = AgentConversation::create([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'title' => 'New conversation',
            'status' => 'running',
        ]);

        AgentMessage::create([
            'agent_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => [['type' => 'text', 'text' => $validated['message']]],
        ]);

        RunAgentTurn::dispatch($conversation, $user->byokAnthropicKey() === null);

        return redirect()->route('agent.show', $conversation);
    }

    public function sendMessage(Request $request, AgentConversation $agentConversation): JsonResponse
    {
        $this->authorizeConversation($request, $agentConversation);

        if ($agentConversation->status === 'running') {
            return response()->json(['error' => 'running'], 409);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:4000'],
        ]);

        if (! $this->ensureTurnCredits($request)) {
            return response()->json(['error' => 'no_credits'], 402);
        }

        $agentConversation->update(['status' => 'running', 'error' => null]);

        AgentMessage::create([
            'agent_conversation_id' => $agentConversation->id,
            'role' => 'user',
            'content' => [['type' => 'text', 'text' => $validated['message']]],
        ]);

        RunAgentTurn::dispatch($agentConversation, $request->user()->byokAnthropicKey() === null);

        return response()->json(['ok' => true], 202);
    }

    public function state(Request $request, AgentConversation $agentConversation): JsonResponse
    {
        $this->authorizeConversation($request, $agentConversation);

        return response()->json($this->presenter->state($agentConversation));
    }

    public function confirmPublish(Request $request, AgentPublishRequest $agentPublishRequest): JsonResponse
    {
        $this->authorizeConversation($request, $agentPublishRequest->conversation);

        if ($agentPublishRequest->status !== 'pending') {
            return response()->json(['error' => 'request_not_pending'], 409);
        }

        // The caption the user approved is the one that goes out.
        $project = $agentPublishRequest->contentProject;
        $project->update([
            'script_data' => [...($project->script_data ?? []), 'caption' => $agentPublishRequest->caption],
        ]);

        $schedule = Schedule::create([
            'content_project_id' => $agentPublishRequest->content_project_id,
            'social_account_id' => $agentPublishRequest->social_account_id,
            'publish_at' => $agentPublishRequest->publish_at,
        ]);

        $agentPublishRequest->update([
            'status' => 'confirmed',
            'schedule_id' => $schedule->id,
        ]);

        return response()->json($this->presenter->state($agentPublishRequest->conversation));
    }

    public function cancelPublish(Request $request, AgentPublishRequest $agentPublishRequest): JsonResponse
    {
        $this->authorizeConversation($request, $agentPublishRequest->conversation);

        if ($agentPublishRequest->status === 'confirmed') {
            $schedule = $agentPublishRequest->schedule;

            // Once it went out (or is going out) it can't be taken back here.
            if ($schedule && $schedule->status !== ScheduleStatus::Pending) {
                return response()->json(['error' => 'already_published'], 409);
            }

            $schedule?->delete();
        }

        if (in_array($agentPublishRequest->status, ['pending', 'confirmed'], true)) {
            $agentPublishRequest->update(['status' => 'cancelled']);
        }

        return response()->json($this->presenter->state($agentPublishRequest->conversation));
    }

    private function ensureTurnCredits(Request $request): bool
    {
        $user = $request->user();

        if ($user->byokAnthropicKey() !== null) {
            return true;
        }

        if (! $user->hasCredits()) {
            return false;
        }

        return $user->deductCredit();
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }

    private function authorizeConversation(Request $request, AgentConversation $conversation): void
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);
    }

    /**
     * @return list<array{id: int, title: string, updated_at: string}>
     */
    private function conversationList(int $userId): array
    {
        return AgentConversation::where('user_id', $userId)
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (AgentConversation $conversation): array => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'updated_at' => $conversation->updated_at->toIso8601String(),
            ])
            ->all();
    }
}
