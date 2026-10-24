<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Flags an account whose token the platform rejected and that only a human
     * can revive by going through the consent screen again. A failed refresh
     * sets it; a fresh OAuth connect clears it.
     */
    public function up(): void
    {
        Schema::table('social_accounts', function (Blueprint $table) {
            $table->boolean('needs_reconnect')->default(false)->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('social_accounts', function (Blueprint $table) {
            $table->dropColumn('needs_reconnect');
        });
    }
};
