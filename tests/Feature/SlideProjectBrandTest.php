<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlideProjectBrandTest extends TestCase
{
    use RefreshDatabase;

    private function onboardedUser(): User
    {
        return User::factory()->create([
            'onboarding_completed_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    public function test_editor_receives_workspace_palette_accent_as_brand_accent(): void
    {
        $user = $this->onboardedUser();
        Workspace::factory()->withProfile()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('slideshow-editor.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('SlideEditor')
                ->where('brand.color', '#F97316')
                ->where('brand.accent', '#D97706')
            );
    }

    public function test_brand_accent_falls_back_to_primary_when_palette_has_no_accent(): void
    {
        $user = $this->onboardedUser();
        Workspace::factory()->create([
            'owner_id' => $user->id,
            'profile' => [
                'palette' => ['name' => 'custom', 'primary' => '#123456'],
            ],
        ]);

        $this->actingAs($user)
            ->get(route('slideshow-editor.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('brand.color', '#123456')
                ->where('brand.accent', '#123456')
            );
    }

    public function test_brand_is_null_when_workspace_has_no_profile(): void
    {
        $user = $this->onboardedUser();
        Workspace::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('slideshow-editor.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('brand.color', null)
                ->where('brand.accent', null)
            );
    }
}
