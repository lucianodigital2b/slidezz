<?php

namespace Tests\Feature;

use App\Jobs\GenerateVideoScript;
use App\Models\User;
use App\Models\VideoScript;
use App\Models\Workspace;
use App\Services\AI\ReferenceVideoReader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class VideoScriptControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        config(['services.groq.api_key' => null]);
    }

    public function test_index_lists_history_and_prefills_topic_from_query(): void
    {
        [$user, $workspace] = $this->premiumUser();

        VideoScript::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'topic' => 'Produtividade matinal',
            'language' => 'Portuguese (Brazil)',
            'target_seconds' => 45,
            'result' => ['title' => 'Rotina coreana'],
        ]);

        $this->actingAs($user)
            ->get('/video-scripts?topic=rotina')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('VideoScripts')
                ->has('videoScripts', 1)
                ->where('videoScripts.0.title', 'Rotina coreana')
                ->where('prefillTopic', 'rotina')
            );
    }

    public function test_store_validates_input_and_requires_topic_or_reference(): void
    {
        [$user] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/video-scripts', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['topic', 'reference_url']);

        $this->actingAs($user)
            ->postJson('/video-scripts', [
                'topic' => 'Produtividade',
                'target_seconds' => 10,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('target_seconds');
    }

    public function test_store_creates_a_pending_script_and_dispatches_the_job(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();

        $response = $this->actingAs($user)
            ->postJson('/video-scripts', [
                'topic' => 'Skincare coreano',
                'target_seconds' => 30,
            ])
            ->assertCreated();

        $videoScript = VideoScript::findOrFail($response->json('id'));

        $this->assertSame($workspace->id, $videoScript->workspace_id);
        $this->assertSame('pending', $videoScript->status);
        $this->assertSame('Portuguese (Brazil)', $videoScript->language);
        $this->assertSame(30, $videoScript->target_seconds);

        Queue::assertPushed(GenerateVideoScript::class, fn (GenerateVideoScript $job): bool => $job->videoScript->is($videoScript));
    }

    public function test_show_returns_the_script_status_and_result(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $videoScript = VideoScript::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'topic' => 'Skincare',
            'language' => 'Portuguese (Brazil)',
            'target_seconds' => 45,
            'result' => [
                'title' => 'Skincare essentials',
                'hooks' => [],
            ],
        ]);

        $this->actingAs($user)
            ->getJson("/video-scripts/{$videoScript->id}")
            ->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('result.title', 'Skincare essentials');
    }

    public function test_other_workspaces_cannot_touch_a_video_script(): void
    {
        [$user] = $this->premiumUser();

        $videoScript = VideoScript::create([
            'workspace_id' => Workspace::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'status' => 'done',
            'topic' => 'Skincare',
            'language' => 'Portuguese (Brazil)',
            'target_seconds' => 45,
            'result' => ['title' => 'Título'],
        ]);

        $this->actingAs($user)->getJson("/video-scripts/{$videoScript->id}")->assertForbidden();
        $this->actingAs($user)->deleteJson("/video-scripts/{$videoScript->id}")->assertForbidden();

        $this->assertModelExists($videoScript);
    }

    public function test_destroy_removes_the_video_script(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $videoScript = VideoScript::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'topic' => 'Skincare',
            'language' => 'Portuguese (Brazil)',
            'target_seconds' => 45,
            'result' => ['title' => 'Título'],
        ]);

        $this->actingAs($user)
            ->deleteJson("/video-scripts/{$videoScript->id}")
            ->assertOk();

        $this->assertModelMissing($videoScript);
    }

    public function test_reference_reader_returns_tiktok_data_without_transcript_when_groq_is_not_configured(): void
    {
        Http::fake([
            'www.tikwm.com/*' => Http::response([
                'data' => [
                    'title' => 'Vídeo viral',
                    'play' => 'https://example.com/video.mp4',
                    'play_count' => 1000,
                    'digg_count' => 50,
                    'comment_count' => 10,
                    'share_count' => 5,
                    'collect_count' => 3,
                    'duration' => 42,
                ],
            ]),
        ]);

        $data = app(ReferenceVideoReader::class)->read('https://vm.tiktok.com/abc/');

        $this->assertSame('Vídeo viral', $data['caption']);
        $this->assertSame(1000, $data['views']);
        $this->assertSame('https://example.com/video.mp4', $data['play_url']);
        $this->assertNull($data['transcript']);
    }

    public function test_reference_reader_rejects_non_tiktok_urls(): void
    {
        $this->expectException(\RuntimeException::class);

        app(ReferenceVideoReader::class)->read('https://youtube.com/watch?v=123');
    }

    public function test_generate_video_script_parses_deepseek_response_and_stores_the_result(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $videoScript = VideoScript::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'topic' => 'Produtividade matinal',
            'language' => 'Portuguese (Brazil)',
            'target_seconds' => 30,
        ]);

        Prism::fake([TextResponseFake::make()->withText($this->validScriptJson())]);

        GenerateVideoScript::dispatchSync($videoScript);

        $videoScript->refresh();

        $this->assertSame('done', $videoScript->status);
        $this->assertSame('Rotina matinal', $videoScript->result['title']);
        $this->assertCount(5, $videoScript->result['hooks']);
        $this->assertCount(6, $videoScript->result['body']);
        $this->assertSame([], $videoScript->result['sources']);
    }

    /**
     * @return array{0: User, 1: Workspace}
     */
    private function premiumUser(): array
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
            'locale' => 'pt',
        ]);

        return [$user, Workspace::factory()->create(['owner_id' => $user->id])];
    }

    private function validScriptJson(): string
    {
        $data = [
            'title' => 'Rotina matinal',
            'hooks' => [
                ['text' => 'Você comete esse erro todo dia.', 'style' => 'bold_claim'],
                ['text' => 'Por que ninguém fala disso?', 'style' => 'question'],
                ['text' => '3 passos para mudar sua manhã.', 'style' => 'number'],
                ['text' => 'Eu aprendi isso do jeito difícil.', 'style' => 'story'],
                ['text' => 'Todo mundo faz isso errado.', 'style' => 'contrarian'],
            ],
            'chosen_hook' => 0,
            'body' => [
                [
                    'beat' => 'Apresentação',
                    'line' => 'Acorda sem disposição?',
                    'on_screen_text' => 'Acorda sem disposição?',
                    'b_roll' => 'Pessoa acordando',
                ],
                [
                    'beat' => 'Dica 1',
                    'line' => 'Comece o dia com água.',
                    'on_screen_text' => 'Água ao acordar',
                    'b_roll' => 'Copo de água',
                ],
                [
                    'beat' => 'Dica 2',
                    'line' => 'Deixe o celular longe por 20 minutos.',
                    'on_screen_text' => 'Sem telas por 20 min',
                    'b_roll' => 'Celular na mesa',
                ],
                [
                    'beat' => 'Dica 3',
                    'line' => 'Faça uma tarefa pequena antes do café.',
                    'on_screen_text' => 'Tarefa pequena',
                    'b_roll' => 'Post-it',
                ],
                [
                    'beat' => 'Dica 4',
                    'line' => 'Repita por uma semana e veja a diferença.',
                    'on_screen_text' => 'Uma semana',
                    'b_roll' => 'Checklist',
                ],
                [
                    'beat' => 'Fechamento',
                    'line' => 'Comenta MANHÃ se você vai testar.',
                    'on_screen_text' => 'Comenta MANHÃ',
                    'b_roll' => 'Comentários',
                ],
            ],
            'cta' => 'Segue para mais dicas de produtividade.',
            'full_script' => '',
            'estimated_seconds' => 30,
            'caption' => 'Rotina matinal simples que funciona.',
            'hashtags' => ['produtividade', 'rotina', 'manha'],
            'sources' => [],
        ];

        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @return array<string, mixed>
     */
    private function deepseekCompletion(string $content): array
    {
        return [
            'id' => 'chatcmpl-test',
            'object' => 'chat.completion',
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'content' => $content,
                    ],
                    'index' => 0,
                    'finish_reason' => 'stop',
                ],
            ],
            'usage' => [
                'prompt_tokens' => 10,
                'completion_tokens' => 20,
                'total_tokens' => 30,
            ],
        ];
    }
}
