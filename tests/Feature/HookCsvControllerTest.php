<?php

namespace Tests\Feature;

use App\Jobs\BuildSlideshowFromHook;
use App\Models\ContentProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class HookCsvControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_queues_one_carousel_per_hook(): void
    {
        Bus::fake();
        [$user] = $this->premiumUser();

        $response = $this->actingAs($user)->postJson('/hooks/csv', [
            'hooks' => "hook\nEstudei 4 anos na Coreia\nTestei 30 protetores solares\n",
        ]);

        $response->assertStatus(202)->assertJsonPath('queued', 2);

        $this->assertSame(2, ContentProject::count());
        Bus::assertDispatchedTimes(BuildSlideshowFromHook::class, 2);
    }

    public function test_it_accepts_an_uploaded_file(): void
    {
        Bus::fake();
        [$user] = $this->premiumUser();

        $file = UploadedFile::fake()->createWithContent(
            'hooks.csv',
            "hook,categoria\nEstudei 4 anos na Coreia,skincare\n",
        );

        $this->actingAs($user)
            ->post('/hooks/csv', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(202)
            ->assertJsonPath('queued', 1);

        $this->assertSame('Estudei 4 anos na Coreia', ContentProject::first()->script_data['hook']);
    }

    public function test_the_project_carries_the_hook_and_the_render_options(): void
    {
        Bus::fake();
        [$user, $workspace] = $this->premiumUser();

        $this->actingAs($user)->postJson('/hooks/csv', [
            'hooks' => "hook\nEstudei 4 anos na Coreia\n",
            'slide_count' => 8,
            'text_position' => 'bottom',
            'language' => 'Spanish',
        ])->assertStatus(202);

        $project = ContentProject::first();

        $this->assertSame($workspace->id, $project->workspace_id);
        $this->assertSame('slideshow', $project->type);
        $this->assertSame('generating', $project->status);
        $this->assertSame('Estudei 4 anos na Coreia', $project->script_data['hook']);
        $this->assertSame('hook_csv', $project->script_data['source']);
        $this->assertSame(8, $project->script_data['slide_count']);
        $this->assertSame('bottom', $project->script_data['text_position']);
        $this->assertSame('Spanish', $project->script_data['language']);
    }

    public function test_it_rejects_a_file_with_no_hooks(): void
    {
        Bus::fake();
        [$user] = $this->premiumUser();

        $this->actingAs($user)
            ->postJson('/hooks/csv', ['hooks' => "hook\n\n  \n"])
            ->assertStatus(422)
            ->assertJsonPath('error', 'no_hooks');

        Bus::assertNothingDispatched();
    }

    public function test_it_caps_how_many_hooks_one_import_queues(): void
    {
        Bus::fake();
        [$user] = $this->premiumUser();

        $rows = implode("\n", array_map(fn (int $i): string => "Hook número {$i}", range(1, 30)));

        $this->actingAs($user)
            ->postJson('/hooks/csv', ['hooks' => "hook\n{$rows}", 'limit' => 5])
            ->assertStatus(202)
            ->assertJsonPath('queued', 5);

        Bus::assertDispatchedTimes(BuildSlideshowFromHook::class, 5);
    }

    public function test_it_is_behind_the_paywall(): void
    {
        Bus::fake();

        $user = User::factory()->create(['onboarding_completed_at' => now()]);
        Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->postJson('/hooks/csv', ['hooks' => "hook\nEstudei 4 anos na Coreia\n"])
            ->assertStatus(402);

        Bus::assertNothingDispatched();
    }

    public function test_it_needs_authentication(): void
    {
        $this->postJson('/hooks/csv', ['hooks' => "hook\nQualquer coisa\n"])->assertStatus(401);
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
}
