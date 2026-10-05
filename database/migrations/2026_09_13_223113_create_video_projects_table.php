<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('video_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('slide_project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title')->default('');
            $table->string('format')->default('stories');
            $table->json('timeline');
            $table->string('status')->default('draft');
            $table->unsignedTinyInteger('render_progress')->default(0);
            $table->string('video_path')->nullable();
            $table->text('render_error')->nullable();
            $table->timestamp('rendered_at')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_projects');
    }
};
