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

    public function test_facebook_callback_creates_one_account_per_page(): void
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
