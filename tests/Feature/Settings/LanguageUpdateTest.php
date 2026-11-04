<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LanguageUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_language_is_saved_on_the_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('appearance.edit'))
            ->patch(route('language.update'), ['locale' => 'en'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('appearance.edit'));

        $this->assertSame('en', $user->refresh()->locale);
    }

    public function test_unsupported_language_is_rejected(): void
    {
        $user = User::factory()->create(['locale' => 'pt']);

        $this->actingAs($user)
            ->patch(route('language.update'), ['locale' => 'es'])
            ->assertSessionHasErrors('locale');

        $this->assertSame('pt', $user->refresh()->locale);
    }

    public function test_guest_cannot_save_a_language(): void
    {
        $this->patch(route('language.update'), ['locale' => 'en'])
            ->assertRedirect(route('login'));
    }

    public function test_account_language_is_shared_and_sets_the_app_locale(): void
    {
        $user = User::factory()->create(['locale' => 'en']);

        $this->actingAs($user)
            ->get(route('appearance.edit'))
            ->assertOk()
            ->assertSee('<html lang="en"', false)
            ->assertInertia(fn (Assert $page) => $page->where('auth.user.locale', 'en'));
    }
}
