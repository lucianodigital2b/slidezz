<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarouselCreditTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_returns_402_when_user_has_no_credits(): void
    {
        $user = User::factory()->create(['credits' => 0]);

        $response = $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ]);

        $response->assertStatus(402)
            ->assertJsonFragment(['error' => 'no_credits']);

        $this->assertEquals(0, $user->fresh()->credits);
    }

    public function test_generate_deducts_one_credit_before_streaming(): void
    {
        $user = User::factory()->create(['credits' => 3]);

        // The endpoint will try to call the AI service and likely fail in tests,
        // but credit deduction happens before the service call
        $this->actingAs($user)->postJson('/carousel/generate', [
            'topic' => 'Test topic',
        ]);

        $this->assertEquals(2, $user->fresh()->credits);
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
