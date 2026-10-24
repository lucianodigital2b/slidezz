<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table): void {
            // Pairs a post with its translation in another locale, so hreflang can link them.
            // Null = standalone post with no alternate.
            $table->string('translation_key', 64)->nullable()->after('locale')->index();
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table): void {
            $table->dropIndex(['translation_key']);
            $table->dropColumn('translation_key');
        });
    }
};
