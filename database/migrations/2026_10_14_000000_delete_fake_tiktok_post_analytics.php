<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * TikTokPublisher::getAnalytics used to return random numbers, so every
     * TikTok row in post_analytics is made up.
     */
    public function up(): void
    {
        DB::table('post_analytics')
            ->whereIn('schedule_id', DB::table('schedules')
                ->join('social_accounts', 'social_accounts.id', '=', 'schedules.social_account_id')
                ->where('social_accounts.provider', 'tiktok')
                ->select('schedules.id'))
            ->delete();
    }

    public function down(): void
    {
        //
    }
};
