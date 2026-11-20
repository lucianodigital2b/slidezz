<?php

namespace Tests\Feature;

use App\Jobs\GenerateViralBreakdown;
use App\Models\User;
use App\Models\ViralBreakdown;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ViralBreakdownControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        config(['services.groq.api_key' => null]);
    }

    public function test_store_rejects_non_tiktok_url(): void
    {
        Queue::fake();
        [$user] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/breakdowns', [
                'url' => 'https://youtube.com/watch?v=123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('url');

        Queue::assertNothingPushed(GenerateViralBreakdown::class);
    }

    public function test_store_creates_pending_breakdown_and_dispatches_job(): void
    {
        Queue::fake();
        [$user, $workspace] = $this->premiumUser();

        $response = $this->actingAs($user)
            ->postJson('/breakdowns', [
                'url' => 'https://www.tiktok.com/@creator/video/123',
            ])
            ->assertCreated();

        $breakdown = ViralBreakdown::findOrFail($response->json('id'));

        $this->assertSame($workspace->id, $breakdown->workspace_id);
        $this->assertSame('pending', $breakdown->status);
        $this->assertSame('Portuguese (Brazil)', $breakdown->language);

        Queue::assertPushed(GenerateViralBreakdown::class, fn (GenerateViralBreakdown $job): bool => $job->viralBreakdown->is($breakdown));
    }

    public function test_other_workspaces_cannot_touch_a_breakdown(): void
    {
        [$user] = $this->premiumUser();

        $breakdown = ViralBreakdown::create([
            'workspace_id' => Workspace::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'status' => 'done',
            'source_url' => 'https://www.tiktok.com/@creator/video/123',
            'language' => 'English',
            'source' => [
                'views' => 1200000,
                'author' => ['handle' => 'creator'],
            ],
            'result' => ['niche' => 'Test', 'stages' => []],
            'slides' => [],
        ]);

        $this->actingAs($user)->getJson("/breakdowns/{$breakdown->id}")->assertForbidden();
        $this->actingAs($user)->deleteJson("/breakdowns/{$breakdown->id}")->assertForbidden();

        $this->assertModelExists($breakdown);
    }

    public function test_show_returns_slides_and_stages_for_done_breakdown(): void
    {
        [$user, $workspace] = $this->premiumUser();

        $breakdown = ViralBreakdown::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'source_url' => 'https://www.tiktok.com/@creator/video/123',
            'language' => 'English',
            'source' => [
                'views' => 1000,
                'author' => ['handle' => 'creator', 'name' => 'Creator', 'followers' => 5000, 'avatar_url' => 'https://example.com/avatar.jpg'],
            ],
            'result' => [
                'niche' => 'Science-Based Bodybuilding',
                'caption' => 'Breakdown caption',
                'stages' => [
                    [
                        'key' => 'hook',
                        'title' => 'The Hook',
                        'label' => 'HOOK',
                        'start' => 0.0,
                        'end' => 2.5,
                        'video_note' => 'Green glow',
                    ],
                ],
            ],
            'slides' => [
                [
                    'index' => 0,
                    'kind' => 'cover',
                    'key' => 'cover',
                    'title' => 'Cover',
                    'duration' => 4,
                    'url' => 'https://example.com/slide-0.mp4',
                ],
            ],
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson("/breakdowns/{$breakdown->id}")
            ->assertOk()
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('slides.0.kind', 'cover')
            ->assertJsonPath('stages.0.key', 'hook');
    }

    public function test_index_renders_breakdown_summary_title(): void
    {
        [$user, $workspace] = $this->premiumUser();

        ViralBreakdown::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'status' => 'done',
            'source_url' => 'https://www.tiktok.com/@creator/video/123',
            'language' => 'English',
            'source' => [
                'views' => 1200000,
                'author' => ['handle' => 'creator'],
            ],
            'result' => ['niche' => 'Test'],
            'slides' => [
                [
                    'index' => 0,
                    'kind' => 'cover',
                    'key' => 'cover',
                    'title' => 'Cover',
                    'duration' => 4,
                    'url' => 'https://example.com/slide-0.mp4',
                ],
            ],
        ]);

        $this->actingAs($user)
            ->get('/breakdowns')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ViralBreakdowns')
                ->has('breakdowns', 1)
                ->where('breakdowns.0.title', '@creator · 1.2M views')
            );
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
}
