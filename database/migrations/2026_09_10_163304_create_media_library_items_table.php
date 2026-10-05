<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_library_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();

            // Where the bytes actually live. Unlike `assets`, which only kept a
            // remote Pinterest URL, the library owns a copy that cannot rot.
            $table->string('disk');
            $table->string('path');
            $table->string('checksum', 64);
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('bytes')->default(0);
            $table->unsignedInteger('width')->default(0);
            $table->unsignedInteger('height')->default(0);
            $table->string('orientation')->default('portrait');

            $table->string('source')->default('upload'); // pinterest, upload, ai
            $table->string('source_id')->nullable();
            $table->text('source_url')->nullable();

            // Descriptive metadata: this is what the matcher scores a hook against.
            $table->text('description')->nullable();
            $table->json('keywords')->nullable();
            $table->json('colors')->nullable();
            $table->string('mood')->nullable();
            $table->timestamp('described_at')->nullable();

            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // The same photo imported twice is one library item.
            $table->unique(['workspace_id', 'checksum']);
            $table->index(['workspace_id', 'last_used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_library_items');
    }
};
