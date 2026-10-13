<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class CarouselIdeasTest extends TestCase
{
    use RefreshDatabase;

    public function test_ideas_returns_generated_ideas_for_a_workspace_with_a_profile(): void
    {
        Prism::fake([
            TextResponseFake::make()->withText('[{"title":"A","angle":"x"},{"title":"B","angle":"y"},{"title":"C","angle":"z"}]'),
        ]);

        $user = User::factory()->create();
        Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Acme',
            'profile' => [
                'brand_name' => 'Acme',
                'brand_description' => 'We sell widgets',
                'target_audience' => 'Small business owners',
                'goal' => 'sell_products',
                'tone_of_voice' => ['casual'],
            ],
        ]);

        $this->actingAs($user)
            ->getJson('/carousel/ideas')
            ->assertOk()
            ->assertJsonCount(3, 'ideas')
            ->assertJsonPath('ideas.0.title', 'A')
            ->assertJsonPath('ideas.0.angle', 'x');
    }

    public function test_ideas_returns_empty_when_there_is_no_brand_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/carousel/ideas')
            ->assertOk()
            ->assertExactJson(['ideas' => []]);
    }

    public function test_ideas_returns_empty_with_error_flag_when_generation_fails(): void
    {
        Prism::fake([TextResponseFake::make()->withText('not json')]);

        $user = User::factory()->create();
        Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Acme',
            'profile' => ['brand_name' => 'Acme'],
        ]);

        $this->actingAs($user)
            ->getJson('/carousel/ideas')
            ->assertOk()
            ->assertJson(['ideas' => [], 'error' => true]);
    }
}
