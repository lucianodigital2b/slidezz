<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * The annual plan grants its credits every month, but Stripe only invoices it
 * once a year. Daily, reset the credits of active annual subscribers whose last
 * refresh is missing or older than a month.
 */
class RefreshAnnualCredits extends Command
{
    protected $signature = 'credits:refresh-annual';

    protected $description = 'Reset the monthly credits of active annual subscribers';

    public function handle(): int
    {
        $credits = (int) config('plans.annual.credits_per_cycle', 150);

        User::query()
            ->whereHas('subscriptions', fn ($query) => $query->where('type', 'annual')->active())
            ->where(fn ($query) => $query
                ->whereNull('credits_refreshed_at')
                ->orWhere('credits_refreshed_at', '<', now()->subMonth()))
            ->each(function (User $user) use ($credits): void {
                $user->credits = $credits;
                $user->credits_refreshed_at = now();
                $user->save();
            });

        return self::SUCCESS;
    }
}
