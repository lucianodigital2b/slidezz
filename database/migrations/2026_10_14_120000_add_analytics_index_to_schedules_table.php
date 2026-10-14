<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The analytics panel reads published schedules per account inside a date
     * range; this lets it seek straight to them instead of scanning each
     * account's schedules.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->index(['social_account_id', 'status', 'publish_at'], 'schedules_account_status_publish_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropIndex('schedules_account_status_publish_at_index');
        });
    }
};
