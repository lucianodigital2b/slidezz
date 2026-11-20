<?php

namespace Tests\Feature;

use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Social\FacebookPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FacebookPublisherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.facebook.client_id' => '123',
            'services.facebook.client_secret' => 'secret',
            'services.facebook.redirect' => '/social-accounts/facebook/callback',
            'services.facebook.config_id' => null,
        ]);

        Http::preventStrayRequests();

        // The page picker renders an Inertia page; don't depend on a local build.
        $this->withoutVite();
    }

    public function test_facebook_connect_redirects_to_facebook_oauth_with_scopes(): void
    {
        $user = User::factory()->canPost()->create();
        config(['services.facebook.feature_user_ids' => (string) $user->id]);

        $location = $this->actingAs($user)
            ->get('/social-accounts/facebook/connect')
            ->headers->get('Location');

        $this->assertNotNull($location);
        $this->assertStringStartsWith('https://www.facebook.com/v21.0/dialog/oauth', $location);

        parse_str(parse_url($location, PHP_URL_QUERY), $query);

        $this->assertSame('123', $query['client_id']);
        $this->assertSame(url('/social-accounts/facebook/callback'), $query['redirect_uri']);
        $this->assertSame('code', $query['response_type']);
        $this->assertSame('pages_show_list,pages_read_engagement,pages_manage_posts,read_insights', $query['scope']);
        $this->assertArrayHasKey('state', $query);
    }

    public function test_facebook_connect_sends_the_login_configuration_instead_of_scopes(): void
    {
        $user = User::factory()->canPost()->create();
        config([
            'services.facebook.feature_user_ids' => (string) $user->id,
            'services.facebook.config_id' => '999',
        ]);

        $location = $this->actingAs($user)
            ->get('/social-accounts/facebook/connect')
            ->headers->get('Location');

        parse_str(parse_url($location, PHP_URL_QUERY), $query);

        $this->assertSame('999', $query['config_id']);
        $this->assertArrayNotHasKey('scope', $query);
    }

    public function test_facebook_callback_with_several_pages_lets_the_user_pick(): void
    {
        Http::fake([
            'graph.facebook.com/v21.0/oauth/access_token*' => Http::sequence()
                ->push(['access_token' => 'short-lived-user-token'])
                ->push(['access_token' => 'long-lived-user-token']),
            'graph.facebook.com/v21.0/me/accounts*' => Http::response([
                'data' => [
                    [
                        'id' => 'page-1',
                        'name' => 'Page One',
                        'access_token' => 'page-token-1',
                        'picture' => ['url' => 'https://example.com/avatar1.jpg'],
                    ],
                    [
                        'id' => 'page-2',
                        'name' => 'Page Two',
                        'access_token' => 'page-token-2',
                        'picture' => null,
                    ],
                ],
            ]),
        ]);

        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $nonce = 'nonce-value';
        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspace->id.'|'.$nonce, config('app.key')),
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['facebook_oauth_state' => $state])
            ->get('/social-accounts/facebook/callback?code=auth-code')
            ->assertRedirect('/social-accounts/facebook/pages');

        // Nothing is saved before the choice.
        $this->assertSame(0, SocialAccount::where('provider', 'facebook')->count());

        $this->get('/social-accounts/facebook/pages')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/facebook-pages')
                ->has('pages', 2)
                ->missing('pages.0.access_token')
                ->where('selected', ['page-1', 'page-2']));

        $this->post('/social-accounts/facebook/pages', ['page_ids' => ['page-1', 'page-2']])
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('success');

        $accounts = SocialAccount::where('provider', 'facebook')
            ->where('workspace_id', $workspace->id)
            ->get();

        $this->assertCount(2, $accounts);

        $pageOne = $accounts->firstWhere('provider_id', 'page-1');
        $this->assertNotNull($pageOne);
        $this->assertSame('Page One', $pageOne->handle);
        $this->assertSame('page-token-1', $pageOne->access_token);
        $this->assertNull($pageOne->expires_at);
        $this->assertNull($pageOne->refresh_token);

        $pageTwo = $accounts->firstWhere('provider_id', 'page-2');
        $this->assertNotNull($pageTwo);
        $this->assertSame('Page Two', $pageTwo->handle);
        $this->assertSame('page-token-2', $pageTwo->access_token);

        // The choice is used once.
        $this->get('/social-accounts/facebook/pages')->assertRedirect('/settings/profile');
    }

    public function test_facebook_callback_with_one_page_connects_it_directly(): void
    {
        Http::fake([
            'graph.facebook.com/v21.0/oauth/access_token*' => Http::sequence()
                ->push(['access_token' => 'short-lived-user-token'])
                ->push(['access_token' => 'long-lived-user-token']),
            'graph.facebook.com/v21.0/me/accounts*' => Http::response([
                'data' => [['id' => 'page-1', 'name' => 'Page One', 'access_token' => 'page-token-1']],
            ]),
        ]);

        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => 'n',
            'hmac' => hash_hmac('sha256', $workspace->id.'|n', config('app.key')),
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['facebook_oauth_state' => $state])
            ->get('/social-accounts/facebook/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('success');

        $this->assertSame('page-token-1', SocialAccount::where('provider_id', 'page-1')->value('access_token'));
    }

    private function pendingPages(Workspace $workspace, int $expiresInMinutes = 30): array
    {
        return ['facebook_pending_pages' => [
            'workspace_id' => $workspace->id,
            'pages' => [
                ['id' => 'page-1', 'name' => 'Page One', 'avatar' => null, 'access_token' => 'new-token-1'],
                ['id' => 'page-2', 'name' => 'Page Two', 'avatar' => null, 'access_token' => 'new-token-2'],
            ],
            'expires_at' => now()->addMinutes($expiresInMinutes)->timestamp,
        ]];
    }

    public function test_reconnecting_keeps_the_current_choice_and_disconnects_unchecked_pages(): void
    {
        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        config(['services.facebook.feature_user_ids' => (string) $user->id]);

        foreach (['page-1', 'page-2'] as $id) {
            SocialAccount::factory()->create([
                'workspace_id' => $workspace->id,
                'provider' => 'facebook',
                'provider_id' => $id,
                'access_token' => 'old-token',
            ]);
        }

        $this->actingAs($user)
            ->withSession($this->pendingPages($workspace))
            ->get('/social-accounts/facebook/pages')
            ->assertInertia(fn (Assert $page) => $page->where('selected', ['page-1', 'page-2']));

        $this->post('/social-accounts/facebook/pages', ['page_ids' => ['page-1']])
            ->assertRedirect('/settings/profile');

        $this->assertSame(['page-1'], SocialAccount::where('provider', 'facebook')->pluck('provider_id')->all());
        $this->assertSame('new-token-1', SocialAccount::where('provider_id', 'page-1')->value('access_token'));
    }

    public function test_page_picker_rejects_unknown_pages_and_an_empty_choice(): void
    {
        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->withSession($this->pendingPages($workspace))
            ->post('/social-accounts/facebook/pages', ['page_ids' => ['someone-elses-page']])
            ->assertSessionHasErrors('page_ids.0');

        $this->post('/social-accounts/facebook/pages', ['page_ids' => []])
            ->assertSessionHasErrors('page_ids');

        $this->assertSame(0, SocialAccount::where('provider', 'facebook')->count());
    }

    public function test_page_picker_expires_and_belongs_to_the_workspace_owner(): void
    {
        $owner = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($owner)
            ->withSession($this->pendingPages($workspace, -1))
            ->get('/social-accounts/facebook/pages')
            ->assertRedirect('/settings/profile');

        $other = User::factory()->canPost()->create();

        $this->actingAs($other)
            ->withSession($this->pendingPages($workspace))
            ->post('/social-accounts/facebook/pages', ['page_ids' => ['page-1']])
            ->assertRedirect('/settings/profile');

        $this->assertSame(0, SocialAccount::where('provider', 'facebook')->count());
    }

    public function test_facebook_callback_with_no_pages_redirects_back_with_error(): void
    {
        Http::fake([
            'graph.facebook.com/v21.0/oauth/access_token*' => Http::sequence()
                ->push(['access_token' => 'short-lived-user-token'])
                ->push(['access_token' => 'long-lived-user-token']),
            'graph.facebook.com/v21.0/me/accounts*' => Http::response([
                'data' => [],
            ]),
        ]);

        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $nonce = 'nonce-value';
        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => $nonce,
            'hmac' => hash_hmac('sha256', $workspace->id.'|'.$nonce, config('app.key')),
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['facebook_oauth_state' => $state])
            ->get('/social-accounts/facebook/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('error');

        $this->assertDatabaseMissing('social_accounts', ['provider' => 'facebook']);
    }

    public function test_facebook_callback_rejects_tampered_state(): void
    {
        $user = User::factory()->canPost()->create();
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

        $state = rtrim(strtr(base64_encode(json_encode([
            'workspace_id' => $workspace->id,
            'nonce' => 'nonce-value',
            'hmac' => 'forged-hmac',
        ])), '+/', '-_'), '=');

        $this->actingAs($user)
            ->withSession(['facebook_oauth_state' => $state])
            ->get('/social-accounts/facebook/callback?code=auth-code')
            ->assertRedirect('/settings/profile')
            ->assertSessionHas('error');

        $this->assertDatabaseMissing('social_accounts', ['provider' => 'facebook']);
    }

    public function test_facebook_publisher_publishes_single_image(): void
    {
        Http::fake([
            'graph.facebook.com/v21.0/123456789/photos' => Http::response(['post_id' => 'fb-post-1']),
        ]);

        $workspace = Workspace::factory()->create();

        $account = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'facebook',
            'provider_id' => '123456789',
            'access_token' => 'page-token',
        ]);

        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'image',
            'script_data' => [
                'caption' => 'Hello Facebook',
                'image_url' => 'https://example.com/photo.jpg',
            ],
            'video_url' => null,
        ]);

        $schedule = Schedule::factory()->create([
            'social_account_id' => $account->id,
            'content_project_id' => $project->id,
            'status' => 'pending',
        ]);

        $postId = app(FacebookPublisher::class)->publish($project, $schedule);

        $this->assertSame('fb-post-1', $postId);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://graph.facebook.com/v21.0/123456789/photos'
                && $request->method() === 'POST'
                && $request->data()['url'] === 'https://example.com/photo.jpg'
                && $request->data()['message'] === 'Hello Facebook'
                && $request->data()['published'] === 'true'
                && $request->data()['access_token'] === 'page-token';
        });
    }

    public function test_facebook_publisher_publishes_carousel_with_attached_media(): void
    {
        Http::fake([
            'graph.facebook.com/v21.0/123456789/photos' => Http::sequence()
                ->push(['id' => 'child-1'])
                ->push(['id' => 'child-2']),
            'graph.facebook.com/v21.0/123456789/feed' => Http::response(['id' => 'fb-carousel-1']),
        ]);

        $workspace = Workspace::factory()->create();

        $account = SocialAccount::factory()->create([
            'workspace_id' => $workspace->id,
            'provider' => 'facebook',
            'provider_id' => '123456789',
            'access_token' => 'page-token',
        ]);

        $project = ContentProject::factory()->create([
            'workspace_id' => $workspace->id,
            'type' => 'carousel',
            'script_data' => [
                'caption' => 'My carousel',
                'image_urls' => [
                    'https://example.com/img1.jpg',
                    'https://example.com/img2.jpg',
                ],
            ],
            'video_url' => null,
        ]);

        $schedule = Schedule::factory()->create([
            'social_account_id' => $account->id,
            'content_project_id' => $project->id,
            'status' => 'pending',
        ]);

        $postId = app(FacebookPublisher::class)->publish($project, $schedule);

        $this->assertSame('fb-carousel-1', $postId);

        $this->assertCount(2, Http::recorded(
            fn ($request) => $request->url() === 'https://graph.facebook.com/v21.0/123456789/photos'
                && $request->data()['published'] === 'false'
        ));

        Http::assertSent(function ($request) {
            return $request->url() === 'https://graph.facebook.com/v21.0/123456789/feed'
                && $request->data()['message'] === 'My carousel'
                && $request->data()['attached_media[0]'] === json_encode(['media_fbid' => 'child-1'])
                && $request->data()['attached_media[1]'] === json_encode(['media_fbid' => 'child-2'])
                && $request->data()['access_token'] === 'page-token';
        });
    }
}
