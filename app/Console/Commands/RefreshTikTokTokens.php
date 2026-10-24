<?php

namespace App\Console\Commands;

use App\Models\SocialAccount;
use App\Services\Social\TikTokPublisher;
use Illuminate\Console\Command;

class RefreshTikTokTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tiktok:refresh-tokens {--window=6 : Hours before expiry to refresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Refresh TikTok access tokens before they expire, so a scheduled post never lands on a token that lapsed between runs';

    /**
     * Refresh every TikTok token that is within the window of expiry, ahead of
     * the publish that needs it. An account whose refresh fails is left flagged
     * (needs_reconnect) by the publisher and skipped until a human reconnects it,
     * so one dead grant never stalls the run for the others.
     */
    public function handle(TikTokPublisher $publisher): int
    {
        $threshold = now()->addHours((int) $this->option('window'));

        $accounts = SocialAccount::query()
            ->where('provider', 'tiktok')
            ->where('needs_reconnect', false)
            ->whereNotNull('refresh_token')
            ->where(function ($query) use ($threshold) {
                $query->whereNull('expires_at')->orWhere('expires_at', '<=', $threshold);
            })
            ->get();

        $refreshed = 0;

        foreach ($accounts as $account) {
            try {
                $publisher->keepAlive($account);
                $refreshed++;
                $this->line("Refreshed {$account->handle} (#{$account->id})");
            } catch (\Throwable $e) {
                $this->warn("Needs reconnect: {$account->handle} (#{$account->id}) - {$e->getMessage()}");
            }
        }

        $this->info("Checked {$accounts->count()} TikTok account(s), refreshed {$refreshed}.");

        return self::SUCCESS;
    }
}
