<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ugc_creators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('handle')->nullable();
            $table->string('avatar')->nullable();
            $table->string('platform')->nullable(); // preferred platform, informational
            $table->string('contact')->nullable(); // email or WhatsApp
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ugc_creators');
    }
};
