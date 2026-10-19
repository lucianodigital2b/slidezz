<?php

namespace App\Console\Commands;

use App\Models\SocialAccount;
use App\Services\Social\AvatarStore;
use App\Services\Social\TikTokPublisher;
use Illuminate\Console\Command;

class StoreSocialAvatars extends Command
{
    protected $signature = 'social:store-avatars';

    protected $description = 'Re-host TikTok profile pictures that still point at an expiring CDN URL';

    public function handle(AvatarStore $store, TikTokPublisher $tiktok): int
    {
        $accounts = SocialAccount::where('provider', 'tiktok')->get()
            ->reject(fn (SocialAccount $account) => $store->isStored($account->avatar));

        foreach ($accounts as $account) {
            try {
                $tiktok->refreshAvatar($account);
                $this->info("#{$account->id} @{$account->handle}: stored.");
            } catch (\Throwable $e) {
                $this->warn("#{$account->id} @{$account->handle}: {$e->getMessage()}");
            }
        }

        $this->info("Done ({$accounts->count()} account(s) checked).");

        return self::SUCCESS;
    }
}
