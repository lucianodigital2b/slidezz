<?php

namespace Tests\Feature;

use App\Enums\ScheduleStatus;
use App\Jobs\GenerateSlideshow;
use App\Mcp\Servers\SlidezzServer;
use App\Mcp\Tools\CreatePostTool;
use App\Mcp\Tools\DeletePostTool;
use App\Mcp\Tools\DuplicatePostTool;
use App\Mcp\Tools\GenerateSlideshowTool;
use App\Mcp\Tools\ListProjectsTool;
use App\Mcp\Tools\ListSocialAccountsTool;
use App\Mcp\Tools\UpdatePostTool;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SlideProject;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Posts\PostService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SlidezzMcpServerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.media_disk' => 'public']);
        Storage::fake('public');
    }

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

    private function accountFor(string $provider = 'tiktok'): array
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => $provider]);

        return [$user, $workspace, $account];
    }

    // Existing tests ----------------------------------------------------------------

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

    // New tests ---------------------------------------------------------------------

    public function test_list_social_accounts_only_returns_own_accounts(): void
    {
        [$user, , $account] = $this->accountFor('tiktok');
        SocialAccount::factory()->create(); // other user's account

        SlidezzServer::actingAs($user)
            ->tool(ListSocialAccountsTool::class)
            ->assertOk()
            ->assertHasNoErrors()
            ->assertSee((string) $account->id)
            ->assertDontSee('workspace_id');
    }

    public function test_create_post_with_content_project_id_creates_pending_schedule_in_utc(): void
    {
        [$user, $workspace, $account] = $this->accountFor('tiktok');
        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'status' => 'ready',
            'script_data' => ['caption' => 'Existing'],
        ]);

        $publishLocal = now()->addDay()->startOfHour()->setTimezone('America/Sao_Paulo');

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => $publishLocal->format('Y-m-d\TH:i:sP'),
                'content_project_id' => $project->id,
            ])
            ->assertOk()
            ->assertSee('"status":"pending"');

        $schedule = Schedule::firstOrFail();
        $this->assertSame(
            $publishLocal->copy()->utc()->format('Y-m-d H:i:s'),
            $schedule->getRawOriginal('publish_at')
        );
    }

    public function test_create_post_with_both_image_urls_and_content_project_id_fails_validation(): void
    {
        [$user, $workspace, $account] = $this->accountFor('tiktok');
        $project = ContentProject::factory()->create(['workspace_id' => $workspace->id, 'status' => 'ready']);

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => now()->addDay()->toIso8601String(),
                'content_project_id' => $project->id,
                'image_urls' => ['https://example.com/a.png'],
            ])
            ->assertHasErrors();
    }

    public function test_create_post_with_image_urls_downloads_and_schedules(): void
    {
        [$user, , $account] = $this->accountFor('tiktok');

        // Override the DNS check to avoid real DNS in tests
        $postService = new class extends PostService
        {
            protected function publicIpFor(string $host): ?string
            {
                return '93.184.216.34';
            }
        };
        $this->app->instance(PostService::class, $postService);

        $png = imagecreatetruecolor(1, 1);
        ob_start();
        imagepng($png);
        $binary = ob_get_clean();

        Http::fake([
            'https://example.com/image.png' => Http::response($binary, 200, ['Content-Type' => 'image/png']),
        ]);

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => now()->addDay()->toIso8601String(),
                'image_urls' => ['https://example.com/image.png'],
            ])
            ->assertOk()
            ->assertSee('"status":"pending"');

        $this->assertSame(1, Schedule::count());
        $project = ContentProject::firstOrFail();
        $this->assertCount(1, $project->script_data['slides']);
        Storage::disk('public')->assertExists($project->script_data['slides'][0]['path']);
    }

    public function test_create_post_rejects_http_image_urls(): void
    {
        [$user, , $account] = $this->accountFor('tiktok');

        $postService = new class extends PostService
        {
            protected function publicIpFor(string $host): ?string
            {
                return '93.184.216.34';
            }
        };
        $this->app->instance(PostService::class, $postService);

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => now()->addDay()->toIso8601String(),
                'image_urls' => ['http://example.com/image.png'],
            ])
            ->assertHasErrors();

        $this->assertSame(0, Schedule::count());
    }

    public function test_update_duplicate_delete_own_post(): void
    {
        [$user, $workspace, $account] = $this->accountFor('tiktok');
        $project = ContentProject::factory()->create(['workspace_id' => $workspace->id]);
        $schedule = Schedule::factory()->create([
            'social_account_id' => $account->id,
            'content_project_id' => $project->id,
            'publish_at' => now()->addDay(),
            'status' => ScheduleStatus::Pending,
        ]);

        SlidezzServer::actingAs($user)
            ->tool(UpdatePostTool::class, [
                'post_id' => $schedule->id,
                'caption' => 'Updated caption',
            ])
            ->assertOk();

        $this->assertSame('Updated caption', $schedule->fresh()->contentProject->script_data['caption']);

        SlidezzServer::actingAs($user)
            ->tool(DuplicatePostTool::class, [
                'post_id' => $schedule->id,
                'publish_at' => now()->addDays(2)->toIso8601String(),
            ])
            ->assertOk();

        $this->assertSame(2, Schedule::count());

        SlidezzServer::actingAs($user)
            ->tool(DeletePostTool::class, [
                'post_id' => $schedule->id,
            ])
            ->assertOk();

        $this->assertModelMissing($schedule);
    }

    public function test_cannot_delete_another_users_post(): void
    {
        [$user] = $this->accountFor('tiktok');
        [, , $otherAccount] = $this->accountFor('tiktok');
        $otherProject = ContentProject::factory()->create(['workspace_id' => $otherAccount->workspace_id]);
        $schedule = Schedule::factory()->create([
            'social_account_id' => $otherAccount->id,
            'content_project_id' => $otherProject->id,
            'publish_at' => now()->addDay(),
            'status' => ScheduleStatus::Pending,
        ]);

        SlidezzServer::actingAs($user)
            ->tool(DeletePostTool::class, [
                'post_id' => $schedule->id,
            ])
            ->assertSee('Not found.')
            ->assertHasErrors();

        $this->assertModelExists($schedule);
    }

    public function test_generate_slideshow_without_premium_returns_error_and_creates_nothing(): void
    {
        [$user, $workspace] = $this->accountFor('tiktok');

        SlidezzServer::actingAs($user)
            ->tool(GenerateSlideshowTool::class, [
                'topic' => 'Test topic',
            ])
            ->assertSee('Generating slideshows needs a paid Slidezz plan')
            ->assertHasErrors();

        $this->assertSame(0, ContentProject::count());
    }

    public function test_generate_slideshow_with_premium_dispatches_job(): void
    {
        Queue::fake();

        [$user, $workspace] = $this->accountFor('tiktok');
        $user->forceFill(['lifetime_access_at' => now()])->save();

        SlidezzServer::actingAs($user)
            ->tool(GenerateSlideshowTool::class, [
                'topic' => 'Premium topic',
                'slide_count' => 4,
            ])
            ->assertOk()
            ->assertSee('"status":"generating"');

        Queue::assertPushed(GenerateSlideshow::class);

        $this->assertSame(1, ContentProject::count());
        $this->assertSame('generating', ContentProject::first()->status);
    }

    public function test_create_post_rejects_private_ip_image_urls(): void
    {
        [$user, , $account] = $this->accountFor('tiktok');
        Http::fake();

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => now()->addDay()->toIso8601String(),
                'image_urls' => ['https://127.0.0.1/image.png'],
            ])
            ->assertHasErrors();

        Http::assertNothingSent();
        $this->assertSame(0, Schedule::count());
    }

    public function test_generated_slideshow_cannot_be_posted_to_instagram(): void
    {
        [$user, $workspace, $account] = $this->accountFor('instagram');
        $project = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => 'Slideshow',
            'type' => 'slideshow',
            'status' => 'ready',
            'script_data' => ['slides' => []],
        ]);

        SlidezzServer::actingAs($user)
            ->tool(CreatePostTool::class, [
                'social_account_id' => $account->id,
                'publish_at' => now()->addDay()->toIso8601String(),
                'content_project_id' => $project->id,
            ])
            ->assertHasErrors();

        $this->assertSame(0, Schedule::count());
    }

    public function test_mcp_endpoint_lists_every_tool_for_a_token_user(): void
    {
        [$user] = $this->accountFor('tiktok');
        $token = $user->createToken('mcp')->plainTextToken;

        $response = $this->withToken($token)->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/list',
        ])->assertOk();

        $names = collect($response->json('result.tools'))->pluck('name')->sort()->values()->all();

        $this->assertSame([
            'create_post', 'delete_post', 'duplicate_post', 'generate_slideshow', 'get_slideshow',
            'list_posts', 'list_projects', 'list_social_accounts', 'update_post',
        ], $names);
    }
}
