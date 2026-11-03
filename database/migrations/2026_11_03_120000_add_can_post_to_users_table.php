<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Posting to social networks (connect accounts, TikTok drafts, Instagram,
     * schedule, automations, analytics, API/MCP posts) is off by default while
     * the TikTok and Meta app reviews are pending. Allowlisted users get it on.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('can_post')->default(false)->after('lifetime_access_at');
        });

        DB::table('users')->where('email', 'testtt@hotmail.com')->update(['can_post' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('can_post');
        });
    }
};
