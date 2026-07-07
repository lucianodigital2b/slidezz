<?php

namespace Tests\Feature;

use App\Mcp\Servers\SlidezzServer;
use App\Mcp\Tools\ListProjectsTool;
use App\Models\SlideProject;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlidezzMcpServerTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(Workspace $workspace, string $title, string $template = 'twitter-x'): SlideProject
    {
        return SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $title,
            'format' => 'post',
            'template' => $template,
            'slides' => [['background' => '#000'], ['background' => '#111']],
        ]);
    }

    public function test_list_projects_tool_returns_the_authenticated_users_projects(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $this->makeProject($workspace, 'My First Carousel');

        SlidezzServer::actingAs($user)
            ->tool(ListProjectsTool::class)
            ->assertOk()
            ->assertHasNoErrors()
            ->assertSee('My First Carousel')
            ->assertSee('twitter-x');
    }

    public function test_list_projects_only_returns_projects_from_the_users_own_workspace(): void
    {
        $user = User::factory()->create();
        Workspace::factory()->create(['owner_id' => $user->id]);

        $other = User::factory()->create();
        $otherWorkspace = Workspace::factory()->create(['owner_id' => $other->id]);
        $this->makeProject($otherWorkspace, 'Someone Elses Deck', 'noir-manifesto');

        SlidezzServer::actingAs($user)
            ->tool(ListProjectsTool::class)
            ->assertOk()
            ->assertDontSee('Someone Elses Deck');
    }

    public function test_list_projects_respects_the_limit_argument(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $this->makeProject($workspace, 'Keep Me');
        $this->makeProject($workspace, 'Drop Me');

        SlidezzServer::actingAs($user)
            ->tool(ListProjectsTool::class, ['limit' => 1])
            ->assertOk()
            ->assertSee('"count":1');
    }

    public function test_mcp_endpoint_rejects_unauthenticated_requests(): void
    {
        $this->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/list',
        ])->assertUnauthorized();
    }
}
