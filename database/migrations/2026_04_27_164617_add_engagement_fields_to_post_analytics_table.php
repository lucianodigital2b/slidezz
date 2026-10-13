<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('post_analytics', function (Blueprint $table) {
            $table->unsignedBigInteger('comments')->default(0)->after('likes');
            $table->unsignedBigInteger('shares')->default(0)->after('comments');
            $table->unsignedBigInteger('bookmarks')->default(0)->after('shares');
        });
    }

    public function down(): void
    {
        Schema::table('post_analytics', function (Blueprint $table) {
            $table->dropColumn(['comments', 'shares', 'bookmarks']);
        });
    }
};
