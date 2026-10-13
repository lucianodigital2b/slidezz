<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AI\CarouselGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class CarouselCreditTest extends TestCase
{
    use RefreshDatabase;

    // ─── Carousel text is free ───────────────────────────────────────────────

    public function test_generate_is_free_and_does_not_consume_credits(): void
    {
        // Two usable lines for the two requested slides so the under-delivery
        // retry (which would need a second queued fake) never fires.
        Prism::fake([TextResponseFake::make()->withText(
            '{"title":"A","image":{"main_description":"x"}}'."\n".'{"title":"B","image":{"main_description":"y"}}'
        )]);

        $user = User::factory()->create(['credits' => 0, 'lifetime_access_at' => now()]);

        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
            'slide_count' => 2,
        ])->assertOk()->assertJsonStructure(['ndjson']);

        $this->assertEquals(0, $user->fresh()->credits);
    }

    public function test_generate_failure_returns_503_and_leaves_credits_untouched(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateSlides')->andThrow(new \RuntimeException('all providers down'));
        });

        $user = User::factory()->create(['credits' => 3, 'lifetime_access_at' => now()]);

        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ])->assertStatus(503)->assertJsonFragment(['error' => 'generation_failed']);

        $this->assertEquals(3, $user->fresh()->credits);
    }

    // ─── Images are BYOK-only (launch offer: no managed generation) ──────────

    public function test_image_generation_requires_a_connected_gemini_key(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldNotReceive('generateImage');
        });

        $user = User::factory()->create(['credits' => 3, 'lifetime_access_at' => now()]);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertStatus(402)->assertJsonFragment(['error' => 'missing_byok_key']);

        $this->assertEquals(3, $user->fresh()->credits);
    }

    public function test_image_generation_uses_the_users_key_and_spends_no_credits(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')
                ->once()
                ->withArgs(fn (string $prompt, string $ratio, ?string $key): bool => $key === 'AIza-key')
                ->andReturn('data:image/png;base64,abc');
        });

        // No subscription needed — BYOK is open to everyone during the launch offer.
        $user = User::factory()->create(['credits' => 3, 'gemini_api_key' => 'AIza-key', 'lifetime_access_at' => now()]);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertOk()->assertJsonStructure(['base64']);

        $this->assertEquals(3, $user->fresh()->credits);
    }

    public function test_image_failure_returns_500_and_leaves_credits_untouched(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->andThrow(new \RuntimeException('image down'));
        });

        $user = User::factory()->create(['credits' => 3, 'gemini_api_key' => 'AIza-key', 'lifetime_access_at' => now()]);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertStatus(500);

        $this->assertEquals(3, $user->fresh()->credits);
    }

    // ─── Dormant credit infrastructure keeps working for the future revert ───

    public function test_deduct_credit_is_atomic_and_cannot_go_below_zero(): void
    {
        $user = User::factory()->create(['credits' => 1]);

        $result1 = $user->deductCredit();
        $result2 = $user->deductCredit();

        $this->assertTrue($result1);
        $this->assertFalse($result2);
        $this->assertEquals(0, $user->fresh()->credits);
    }

    public function test_add_credits_increments_balance(): void
    {
        $user = User::factory()->create(['credits' => 5]);

        $user->addCredits(10);

        $this->assertEquals(15, $user->fresh()->credits);
    }

    public function test_has_credits_returns_correct_boolean(): void
    {
        $userWithCredits = User::factory()->create(['credits' => 1]);
        $userWithout = User::factory()->create(['credits' => 0]);

        $this->assertTrue($userWithCredits->hasCredits());
        $this->assertFalse($userWithout->hasCredits());
    }
}
