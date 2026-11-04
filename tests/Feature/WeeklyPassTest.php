<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class WeeklyPassTest extends TestCase
{
    use RefreshDatabase;

    private function paidPass(User $user, string $sessionId = 'cs_test_1'): void
    {
        event(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => $sessionId,
                'payment_status' => 'paid',
                'metadata' => ['type' => 'weekly_pass', 'user_id' => (string) $user->id, 'plan' => 'weekly'],
            ]],
        ]));
    }

    public function test_paid_pass_grants_seven_days_and_credits(): void
    {
        $this->freezeSecond();
        $user = User::factory()->create(['credits' => 0]);

        $this->paidPass($user);

        $fresh = $user->fresh();
        $this->assertTrue($fresh->pass_expires_at->equalTo(now()->addDays(7)));
        $this->assertSame(20, $fresh->credits);
        $this->assertTrue($fresh->hasPremiumAccess());
    }

    public function test_the_same_checkout_session_is_only_fulfilled_once(): void
    {
        $this->freezeSecond();
        $user = User::factory()->create(['credits' => 0]);

        $this->paidPass($user);
        $this->paidPass($user);

        $fresh = $user->fresh();
        $this->assertTrue($fresh->pass_expires_at->equalTo(now()->addDays(7)));
        $this->assertSame(20, $fresh->credits);
    }

    public function test_buying_again_extends_from_the_current_expiry(): void
    {
        $this->freezeSecond();
        $user = User::factory()->create(['credits' => 0, 'pass_expires_at' => now()->addDays(3)]);

        $this->paidPass($user, 'cs_test_2');

        $this->assertTrue($user->fresh()->pass_expires_at->equalTo(now()->addDays(10)));
    }

    public function test_unpaid_session_grants_nothing(): void
    {
        $user = User::factory()->create(['credits' => 0]);

        event(new WebhookReceived([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_unpaid',
                'payment_status' => 'unpaid',
                'metadata' => ['type' => 'weekly_pass', 'user_id' => (string) $user->id],
            ]],
        ]));

        $this->assertNull($user->fresh()->pass_expires_at);
        $this->assertSame(0, $user->fresh()->credits);
    }

    public function test_expired_pass_does_not_grant_access(): void
    {
        $user = User::factory()->create(['pass_expires_at' => now()->subMinute()]);

        $this->assertFalse($user->hasActivePass());
        $this->assertFalse($user->hasPremiumAccess());
    }

    public function test_annual_subscribers_get_monthly_credits(): void
    {
        $due = User::factory()->create(['credits' => 3, 'credits_refreshed_at' => now()->subMonths(2)]);
        $recent = User::factory()->create(['credits' => 7, 'credits_refreshed_at' => now()->subDays(5)]);
        $monthly = User::factory()->create(['credits' => 1, 'credits_refreshed_at' => null]);

        foreach ([[$due, 'annual'], [$recent, 'annual'], [$monthly, 'monthly']] as [$user, $plan]) {
            $user->subscriptions()->create([
                'type' => $plan,
                'stripe_id' => 'sub_'.$user->id,
                'stripe_status' => 'active',
                'stripe_price' => 'price_'.$plan,
                'quantity' => 1,
            ]);
        }

        $this->artisan('credits:refresh-annual')->assertSuccessful();

        $this->assertSame(150, $due->fresh()->credits);
        $this->assertSame(7, $recent->fresh()->credits);
        $this->assertSame(1, $monthly->fresh()->credits);
    }
}
