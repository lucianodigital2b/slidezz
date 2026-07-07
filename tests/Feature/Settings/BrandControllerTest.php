<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BrandControllerTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedUser(): User
    {
        return User::factory()->create(['email_verified_at' => now()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'goal' => 'build_authority',
            'brand_name' => 'Acme',
            'brand_description' => 'We make widgets.',
            'target_audience' => 'Founders and marketers.',
            'tone_of_voice' => ['professional', 'direct'],
            'palette' => [
                'name' => 'mint',
                'primary' => '#0F766E',
                'secondary' => '#CCFBF1',
                'accent' => '#14B8A6',
            ],
            'visual_style' => 'minimal, editorial',
        ], $overrides);
    }

    public function test_edit_requires_authentication(): void
    {
        $this->get(route('brand.edit'))->assertRedirect(route('login'));
    }

    public function test_edit_renders_the_brand_page_with_the_saved_profile(): void
    {
        $user = $this->verifiedUser();
        Workspace::factory()->create([
            'owner_id' => $user->id,
            'name' => 'Acme',
            'profile' => ['brand_name' => 'Acme', 'goal' => 'sell_products', 'tone_of_voice' => ['fun']],
        ]);

        $this->actingAs($user)
            ->get(route('brand.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/brand')
                ->where('profile.brand_name', 'Acme')
                ->where('profile.goal', 'sell_products')
            );
    }

    public function test_update_saves_the_brand_profile_to_the_workspace(): void
    {
        $user = $this->verifiedUser();
        Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('brand.update'), $this->validPayload())
            ->assertRedirect(route('brand.edit'))
            ->assertSessionHasNoErrors();

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertEquals('Acme', $workspace->name);
        $this->assertEquals('build_authority', data_get($workspace->profile, 'goal'));
        $this->assertEquals(['professional', 'direct'], data_get($workspace->profile, 'tone_of_voice'));
        $this->assertEquals('#14B8A6', data_get($workspace->profile, 'palette.accent'));
    }

    public function test_update_validates_required_fields(): void
    {
        $user = $this->verifiedUser();

        $this->actingAs($user)
            ->post(route('brand.update'), $this->validPayload(['brand_name' => '', 'tone_of_voice' => []]))
            ->assertSessionHasErrors(['brand_name', 'tone_of_voice']);
    }

    public function test_update_stores_an_uploaded_logo(): void
    {
        Storage::fake('public');
        $user = $this->verifiedUser();
        Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('brand.update'), $this->validPayload([
                'logo' => UploadedFile::fake()->image('logo.png'),
            ]))
            ->assertSessionHasNoErrors();

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $logoPath = data_get($workspace->profile, 'logo_path');
        $this->assertNotNull($logoPath);
        Storage::disk('public')->assertExists($logoPath);
        $this->assertEquals($logoPath, $workspace->logo_path);
    }
}
