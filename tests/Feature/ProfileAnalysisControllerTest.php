<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeProfile;
use App\Models\ProfileAnalysis;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class ProfileAnalysisControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_index_renders_the_latest_analyses_and_connected_accounts(): void
    {
        [$user, $workspace] = $this->premiumUser();

        ProfileAnalysis::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'report' => ['summary' => 'Resumo.'],
            'links' => ['https://www.tiktok.com/@x/video/123'],
        ]);

        SocialAccount::create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'provider_id' => 'tiktok-id',
            'handle' => 'creator',
            'access_token' => 'token',
            'refresh_token' => 'refresh',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->get('/profile-analysis')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ProfileAnalysis')
                ->has('analyses', 1)
                ->where('analyses.0.summary', 'Resumo.')
                ->has('connectedAccounts', 1)
                ->where('connectedAccounts.0.username', 'creator')
            );
    }

    public function test_store_requires_a_link_or_a_connected_account(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/profile-analysis', ['links' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('links');
    }

    public function test_store_rejects_more_than_ten_links(): void
    {
        [$user, $workspace] = $this->premiumUser();
        SocialAccount::create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'provider_id' => 'tiktok-id',
            'handle' => 'creator',
            'access_token' => 'token',
            'refresh_token' => 'refresh',
            'expires_at' => now()->addDay(),
        ]);

        $links = array_fill(0, 11, 'https://www.tiktok.com/@x/video/123');

        $this->actingAs($user)
            ->postJson('/profile-analysis', ['links' => $links])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('links');
    }

    public function test_store_dispatches_the_analysis_job(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();

        SocialAccount::create([
            'workspace_id' => $workspace->id,
            'provider' => 'tiktok',
            'provider_id' => 'tiktok-id',
            'handle' => 'creator',
            'access_token' => 'token',
            'refresh_token' => 'refresh',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->postJson('/profile-analysis', ['links' => []])
            ->assertCreated();

        Queue::assertPushed(AnalyzeProfile::class, fn (AnalyzeProfile $job): bool => $job->analysis->workspace_id === $workspace->id);
    }

    public function test_status_endpoint_returns_the_report(): void
    {
        [$user, $workspace] = $this->premiumUser();
        $analysis = ProfileAnalysis::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'report' => ['summary' => 'Resumo.'],
        ]);

        $this->actingAs($user)
            ->getJson("/profile-analysis/{$analysis->id}")
            ->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('report.summary', 'Resumo.');
    }

    public function test_other_workspaces_cannot_touch_an_analysis(): void
    {
        [$user] = $this->premiumUser();
        $analysis = ProfileAnalysis::create([
            'workspace_id' => Workspace::factory()->create()->id,
            'user_id' => $user->id,
            'status' => 'done',
            'report' => ['summary' => 'Resumo.'],
        ]);

        $this->actingAs($user)->getJson("/profile-analysis/{$analysis->id}")->assertForbidden();
        $this->actingAs($user)->delete("/profile-analysis/{$analysis->id}")->assertForbidden();

        $this->assertModelExists($analysis);
    }

    public function test_job_collects_posts_and_stores_the_ai_report(): void
    {
        Http::fake([
            'www.tikwm.com/*' => Http::response(['data' => $this->tikwmData()], 200),
        ]);
        Prism::fake([TextResponseFake::make()->withText($this->deepseekResponse()['choices'][0]['message']['content'])]);

        [$user, $workspace] = $this->premiumUser();

        $analysis = ProfileAnalysis::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'language' => 'pt',
            'links' => ['https://www.tiktok.com/@user/video/123'],
        ]);

        AnalyzeProfile::dispatchSync($analysis);

        $analysis->refresh();

        $this->assertSame('done', $analysis->status);
        $this->assertSame('Resumo.', $analysis->report['summary']);
        $this->assertCount(1, $analysis->report['what_works']);
        $this->assertSame('carousel', $analysis->report['next_posts'][0]['format']);
        $this->assertSame('Resumo.', $workspace->fresh()->profile['analysis']['summary']);
        $this->assertSame(['Primeira frase'], $workspace->fresh()->profile['analysis']['hooks_that_work']);
    }

    /**
     * @return array{0: User, 1: Workspace}
     */
    private function premiumUser(): array
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
        ]);

        return [$user, Workspace::factory()->create(['owner_id' => $user->id])];
    }

    private function tikwmData(): array
    {
        return [
            'id' => '123',
            'title' => 'Meu TikTok',
            'cover' => 'https://example.com/cover.jpg',
            'create_time' => now()->timestamp,
            'play_count' => 100,
            'digg_count' => 20,
            'comment_count' => 5,
            'share_count' => 3,
            'collect_count' => 1,
            'author' => ['unique_id' => 'user'],
        ];
    }

    private function deepseekResponse(): array
    {
        $content = json_encode([
            'summary' => 'Resumo.',
            'what_works' => [
                ['pattern' => 'Conteúdo educativo', 'evidence' => 'Views acima da mediana.'],
            ],
            'what_is_missing' => [
                ['gap' => 'CTA', 'why' => 'Poucos comentários.'],
            ],
            'top_posts' => [
                ['url' => 'https://www.tiktok.com/@user/video/123', 'why_it_worked' => 'Bom hook.'],
            ],
            'hooks_that_work' => ['Primeira frase'],
            'next_posts' => [
                ['format' => 'carousel', 'idea' => 'Dicas', 'hook' => 'Aprenda isso em 3 passos.'],
            ],
            'posting_frequency' => '3x por semana',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return [
            'choices' => [
                [
                    'message' => [
                        'content' => $content,
                    ],
                ],
            ],
        ];
    }
}
