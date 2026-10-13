<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media_library_items', function (Blueprint $table) {
            // Base64 of packed float32, not JSON: 512 floats are 2.7 KB here against
            // roughly 6 KB as JSON, and unpack() decodes them far faster than
            // json_decode when the matcher walks a couple of thousand candidates.
            $table->text('embedding')->nullable()->after('described_at');
            $table->string('embedding_model')->nullable()->after('embedding');
        });
    }

    public function down(): void
    {
        Schema::table('media_library_items', function (Blueprint $table) {
            $table->dropColumn(['embedding', 'embedding_model']);
        });
    }
};
