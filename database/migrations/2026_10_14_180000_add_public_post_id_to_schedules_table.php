<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A TikTok draft is sent with a publish_id (platform_post_id), but the
     * video the creator posts from it gets an id of its own. That id is what
     * the stats are read from, so it is kept next to the publish_id.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->string('public_post_id')->nullable()->after('platform_post_id');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('public_post_id');
        });
    }
};
