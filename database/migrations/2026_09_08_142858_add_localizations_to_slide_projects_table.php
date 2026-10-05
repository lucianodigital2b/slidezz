<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('slide_projects', function (Blueprint $table) {
            // Per-locale text overrides for app store screenshot projects:
            // { "pt-BR": { "<elementId>": { "text": "...", "richText": [...] } } }
            $table->json('localizations')->nullable()->after('slides');
        });
    }

    public function down(): void
    {
        Schema::table('slide_projects', function (Blueprint $table) {
            $table->dropColumn('localizations');
        });
    }
};
