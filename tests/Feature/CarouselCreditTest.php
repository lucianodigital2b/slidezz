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

    /** Active subscription helper (mirrors ByokTest) so BYOK resolves on Pro/Agency. */
    private function subscribe(User $user, string $plan): void
    {
        $user->subscriptions()->create([
            'type' => $plan,
            'stripe_id' => 'sub_'.$plan.'_'.$user->id,
            'stripe_status' => 'active',
            'stripe_price' => 'price_'.$plan,
            'quantity' => 1,
        ]);
    }

    // ─── Carousel text is free (credits meter images, not carousels) ─────────

    public function test_generate_is_free_and_does_not_consume_credits(): void
    {
        Prism::fake([TextResponseFake::make()->withText('{"title":"A","image":{"main_description":"x"}}')]);

        $user = User::factory()->create(['credits' => 0]);

        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ])->assertOk()->assertJsonStructure(['ndjson']);

        $this->assertEquals(0, $user->fresh()->credits);
    }

    public function test_generate_failure_returns_503_and_leaves_credits_untouched(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateSlides')->andThrow(new \RuntimeException('all providers down'));
        });

        $user = User::factory()->create(['credits' => 3]);

        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ])->assertStatus(503)->assertJsonFragment(['error' => 'generation_failed']);

        $this->assertEquals(3, $user->fresh()->credits);
    }

    // ─── Images are the metered COGS ─────────────────────────────────────────

    public function test_managed_image_deducts_one_credit(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->once()->andReturn('data:image/png;base64,abc');
        });

        $user = User::factory()->create(['credits' => 3]); // no subscription -> managed

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertOk()->assertJsonStructure(['base64']);

        $this->assertEquals(2, $user->fresh()->credits);
    }

    public function test_managed_image_returns_402_without_credits(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldNotReceive('generateImage');
        });

        $user = User::factory()->create(['credits' => 0]);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertStatus(402)->assertJsonFragment(['error' => 'no_credits']);

        $this->assertEquals(0, $user->fresh()->credits);
    }

    public function test_byok_image_does_not_consume_a_credit(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->once()->andReturn('data:image/png;base64,abc');
        });

        $user = User::factory()->create(['credits' => 3, 'gemini_api_key' => 'AIza-key']);
        $this->subscribe($user, 'pro');

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertOk();

        // BYOK bills the user's own Gemini key, so no platform credit is spent.
        $this->assertEquals(3, $user->fresh()->credits);
    }

    public function test_managed_image_refunds_the_credit_on_failure(): void
    {
        $this->mock(CarouselGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateImage')->andThrow(new \RuntimeException('image down'));
        });

        $user = User::factory()->create(['credits' => 3]);

        $this->actingAs($user)->postJson('/carousel/generate-image', [
            'prompt' => 'a cat',
        ])->assertStatus(500);

        $this->assertEquals(3, $user->fresh()->credits);
    }

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
