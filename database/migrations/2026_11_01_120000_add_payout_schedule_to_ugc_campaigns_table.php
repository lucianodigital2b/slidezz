<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ugc_campaigns', function (Blueprint $table) {
            $table->date('payout_anchor_on')->nullable()->after('budget_cents'); // first payday
            $table->unsignedSmallInteger('payout_interval_days')->default(14)->after('payout_anchor_on');
        });
    }

    public function down(): void
    {
        Schema::table('ugc_campaigns', function (Blueprint $table) {
            $table->dropColumn(['payout_anchor_on', 'payout_interval_days']);
        });
    }
};
