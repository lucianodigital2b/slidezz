<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTokensControllerTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedUser(): User
    {
        return User::factory()->create(['email_verified_at' => now()]);
    }

    public function test_edit_requires_authentication(): void
    {
        $this->get(route('api-tokens.edit'))->assertRedirect(route('login'));
    }

    public function test_edit_renders_the_tokens_page(): void
    {
        $user = $this->verifiedUser();

        $this->actingAs($user)
            ->get(route('api-tokens.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/api-tokens')
                ->has('tokens')
                ->where('mcpUrl', rtrim(config('app.url'), '/').'/mcp')
            );
    }

    public function test_store_creates_a_token_and_flashes_the_plaintext_once(): void
    {
        $user = $this->verifiedUser();

        $response = $this->actingAs($user)
            ->post(route('api-tokens.store'), ['name' => 'Claude Code']);

        $response->assertRedirect(route('api-tokens.edit'));
        $response->assertSessionHas('newToken');

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'Claude Code',
        ]);
    }

    public function test_store_validates_the_name(): void
    {
        $user = $this->verifiedUser();

        $this->actingAs($user)
            ->post(route('api-tokens.store'), ['name' => ''])
            ->assertSessionHasErrors(['name']);
    }

    public function test_destroy_revokes_the_users_own_token(): void
    {
        $user = $this->verifiedUser();
        $tokenId = $user->createToken('Claude Code')->accessToken->id;

        $this->actingAs($user)
            ->delete(route('api-tokens.destroy', ['token' => $tokenId]))
            ->assertRedirect(route('api-tokens.edit'));

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }

    public function test_destroy_cannot_revoke_another_users_token(): void
    {
        $user = $this->verifiedUser();
        $other = $this->verifiedUser();
        $otherTokenId = $other->createToken('Their token')->accessToken->id;

        $this->actingAs($user)
            ->delete(route('api-tokens.destroy', ['token' => $otherTokenId]))
            ->assertRedirect(route('api-tokens.edit'));

        // The other user's token is untouched.
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherTokenId]);
    }
}
