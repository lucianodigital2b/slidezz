<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * One post scheduled to several accounts is one schedule row per account,
     * all sharing the same group_id. Existing rows each become their own group.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->uuid('group_id')->nullable()->after('id');
        });

        DB::table('schedules')->whereNull('group_id')->orderBy('id')->eachById(function (object $schedule) {
            DB::table('schedules')->where('id', $schedule->id)->update(['group_id' => (string) Str::uuid()]);
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->uuid('group_id')->nullable(false)->change();
            $table->index('group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropIndex(['group_id']);
            $table->dropColumn('group_id');
        });
    }
};
