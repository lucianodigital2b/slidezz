<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('social_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('status')->default('active');
            $table->text('niche');
            $table->string('language')->default('Portuguese (Brazil)');
            $table->unsignedTinyInteger('slide_count')->default(6);
            $table->string('image_source')->default('pinterest');
            $table->json('image_keywords')->nullable();
            $table->string('text_position')->default('center');
            $table->json('post_times');
            $table->string('timezone')->default('America/Sao_Paulo');
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_run_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automations');
    }
};
