<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('pass_expires_at')->nullable()->after('lifetime_access_at');
            $table->timestamp('credits_refreshed_at')->nullable()->after('pass_expires_at');
            $table->string('weekly_pass_session_id')->nullable()->after('credits_refreshed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['pass_expires_at', 'credits_refreshed_at', 'weekly_pass_session_id']);
        });
    }
};
