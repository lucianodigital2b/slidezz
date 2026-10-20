<?php

namespace Tests\Feature;

use App\Jobs\RunAgentTurn;
use App\Models\AgentAsset;
use App\Models\AgentConversation;
use App\Models\AgentMessage;
use App\Models\AgentPublishRequest;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Agent\AgentToolbox;
use App\Services\Agent\ModelClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

class AgentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Workspace $workspace;

    private $fakeModelClient;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');

        $this->user = User::factory()->create(['credits' => 10]);
        $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);

        $this->fakeModelClient = new class implements ModelClient
        {
            public array $responses = [];

            public function send(array $params, string $apiKey): array
            {
                return array_shift($this->responses);
            }
        };

        $this->app->instance(ModelClient::class, $this->fakeModelClient);
    }

    public function test_store_creates_conversation_and_dispatches_job(): void
    {
        Queue::fake();

        $this->actingAs($this->user);

        $response = $this->post(route('agent.store'), ['message' => 'Crie um carrossel sobre café.']);

        $response->assertRedirect();

        $conversation = AgentConversation::first();

        $this->assertNotNull($conversation);
        $this->assertSame($this->user->id, $conversation->user_id);
        $this->assertSame($this->workspace->id, $conversation->workspace_id);
        $this->assertSame('running', $conversation->status);

        $this->assertDatabaseHas('agent_messages', [
            'agent_conversation_id' => $conversation->id,
            'role' => 'user',
        ]);

        Queue::assertPushed(RunAgentTurn::class, fn (RunAgentTurn $job) => $job->conversation->id === $conversation->id);
    }

    public function test_store_reports_no_credits_without_credits_and_without_byok_key(): void
    {
        $this->user->forceFill(['credits' => 0])->save();

        Queue::fake();

        $this->actingAs($this->user);

        $response = $this->post(route('agent.store'), ['message' => 'hello']);

        $response->assertSessionHasErrors(['message' => 'no_credits']);
        $this->assertSame(0, AgentConversation::count());
        Queue::assertNotPushed(RunAgentTurn::class);
    }

    public function test_byok_anthropic_key_skips_credits(): void
    {
        $this->user->forceFill(['credits' => 0, 'anthropic_api_key' => 'sk-ant-test'])->save();

        Queue::fake();

        $this->actingAs($this->user);

        $response = $this->post(route('agent.store'), ['message' => 'hello']);

        $response->assertRedirect();
        $this->assertSame(1, AgentConversation::count());
        Queue::assertPushed(RunAgentTurn::class);
    }

    public function test_send_message_returns_409_while_running(): void
    {
        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Test',
            'status' => 'running',
        ]);

        $this->actingAs($this->user);

        $this->post(route('agent.messages.store', $conversation), ['message' => 'oi'])
            ->assertStatus(409)
            ->assertJson(['error' => 'running']);
    }

    public function test_runner_executes_tool_use_and_stores_tool_result_and_final_assistant_text(): void
    {
        // Fake the toolbox to return a deterministic tool_result.
        $this->mock(AgentToolbox::class, function ($mock) {
            $mock->shouldReceive('execute')
                ->once()
                ->andReturn([['type' => 'text', 'text' => 'tool result content']]);
        });

        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'New conversation',
            'status' => 'idle',
        ]);

        AgentMessage::create([
            'agent_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => [['type' => 'text', 'text' => 'Run a test tool.']],
        ]);

        // First response: tool_use with one tool; second response: final text.
        $this->fakeModelClient->responses = [
            [
                'id' => 'msg-1',
                'content' => [
                    ['type' => 'tool_use', 'id' => 'tool-1', 'name' => 'search_images', 'input' => ['query' => 'test']],
                ],
                'stop_reason' => 'tool_use',
                'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
            ],
            [
                'id' => 'msg-2',
                'content' => [
                    ['type' => 'text', 'text' => 'Done!'],
                ],
                'stop_reason' => 'end_turn',
                'usage' => ['input_tokens' => 20, 'output_tokens' => 8],
            ],
        ];

        config(['services.anthropic.key' => 'sk-ant-test']);

        RunAgentTurn::dispatchSync($conversation, false);

        $messages = AgentMessage::where('agent_conversation_id', $conversation->id)
            ->orderBy('id')
            ->get();

        $this->assertCount(4, $messages); // initial user, assistant tool_use, user tool_result, final assistant

        $toolResult = $messages->first(fn ($m) => $m->role === 'user' && collect($m->content)->some(fn ($block) => ($block['type'] ?? null) === 'tool_result'));
        $this->assertNotNull($toolResult);
        $this->assertSame('tool-1', $toolResult->content[0]['tool_use_id']);
        $this->assertSame('tool result content', $toolResult->content[0]['content'][0]['text']);

        $finalAssistant = $messages->last();
        $this->assertSame('assistant', $finalAssistant->role);
        $this->assertSame('Done!', $finalAssistant->content[0]['text']);
        $this->assertSame('idle', $conversation->fresh()->status);
    }

    public function test_build_slideshow_refuses_source_assets(): void
    {
        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'New conversation',
            'status' => 'idle',
        ]);

        $sourceAsset = AgentAsset::create([
            'agent_conversation_id' => $conversation->id,
            'kind' => 'source',
            'url' => 'https://example.com/source.jpg',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Source assets cannot be used in a rebuilt slideshow.');

        app(AgentToolbox::class)->execute($conversation, 'build_slideshow', [
            'title' => 'Test',
            'preset' => 'classic',
            'text_position' => 'center',
            'slides' => [
                ['text' => 'Slide 1', 'asset_id' => $sourceAsset->id],
                ['text' => 'Slide 2', 'asset_id' => $sourceAsset->id],
            ],
        ]);
    }

    public function test_request_publish_confirmation_creates_schedule(): void
    {
        $account = SocialAccount::factory()->create([
            'workspace_id' => $this->workspace->id,
            'provider' => 'tiktok',
            'handle' => 'user.tiktok',
        ]);

        $project = ContentProject::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Slideshow',
            'type' => 'slideshow',
            'status' => 'ready',
            'script_data' => ['slides' => []],
        ]);

        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'New conversation',
            'status' => 'idle',
            'content_project_id' => $project->id,
        ]);

        $publishAt = now()->addDay()->toIso8601String();

        $publishRequest = AgentPublishRequest::create([
            'agent_conversation_id' => $conversation->id,
            'content_project_id' => $project->id,
            'social_account_id' => $account->id,
            'publish_at' => $publishAt,
            'caption' => 'Legenda',
            'status' => 'pending',
        ]);

        $this->actingAs($this->user);

        $this->post(route('agent.publish.confirm', $publishRequest))
            ->assertOk()
            ->assertJsonPath('publish_requests.0.status', 'confirmed');

        $schedule = Schedule::first();
        $this->assertNotNull($schedule);
        $this->assertSame($project->id, $schedule->content_project_id);
        $this->assertSame($account->id, $schedule->social_account_id);
        $this->assertSame('confirmed', $publishRequest->fresh()->status);
        $this->assertSame($schedule->id, $publishRequest->fresh()->schedule_id);
    }

    public function test_other_users_conversation_returns_403(): void
    {
        $otherUser = User::factory()->create();
        $otherWorkspace = Workspace::factory()->create(['owner_id' => $otherUser->id]);

        $conversation = AgentConversation::create([
            'user_id' => $otherUser->id,
            'workspace_id' => $otherWorkspace->id,
            'title' => 'Other',
            'status' => 'idle',
        ]);

        $this->actingAs($this->user);

        $this->get(route('agent.state', $conversation))->assertStatus(403);
    }

    public function test_state_hides_tool_result_only_user_messages(): void
    {
        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'New conversation',
            'status' => 'idle',
        ]);

        AgentMessage::create([
            'agent_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => [['type' => 'text', 'text' => 'Hello agent']],
        ]);

        AgentMessage::create([
            'agent_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => [['type' => 'text', 'text' => 'I will help']],
        ]);

        AgentMessage::create([
            'agent_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => [
                ['type' => 'tool_result', 'tool_use_id' => 'tool-1', 'content' => [['type' => 'text', 'text' => 'invisible']]],
            ],
        ]);

        $this->actingAs($this->user);

        $response = $this->get(route('agent.state', $conversation));

        $response->assertOk();
        $response->assertJsonCount(2, 'messages'); // user text + assistant text, tool_result hidden
        $this->assertSame('Hello agent', $response->json('messages.0.text'));
        $this->assertSame('I will help', $response->json('messages.1.text'));
    }

    public function test_fetch_tiktok_uses_tikwm_api_and_stores_photo_assets(): void
    {
        Http::fake([
            'www.tikwm.com/api/*' => Http::response([
                'data' => [
                    'images' => ['https://example.com/photo-1.jpg'],
                    'title' => 'Viagem',
                    'author' => ['nickname' => 'creator'],
                    'music' => ['title' => 'song'],
                    'play_count' => 100,
                    'digg_count' => 10,
                ],
            ]),
            'example.com/photo-1.jpg' => Http::response($this->photoBinary(), 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $conversation = AgentConversation::create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'New conversation',
            'status' => 'idle',
        ]);

        $content = app(AgentToolbox::class)->execute($conversation, 'fetch_tiktok', [
            'url' => 'https://www.tiktok.com/@creator/video/123',
        ]);

        $payload = json_decode($content[0]['text'], true);
        $this->assertSame('photo', $payload['type']);
        $this->assertCount(1, $payload['asset_ids']);

        $asset = AgentAsset::find($payload['asset_ids'][0]);
        $this->assertNotNull($asset);
        $this->assertSame('source', $asset->kind);
        $this->assertNotEmpty($asset->path);
        Storage::disk('public')->assertExists($asset->path);
    }

    private function photoBinary(): string
    {
        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, 90, 90, 90));

        ob_start();
        imagejpeg($image, null, 80);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
