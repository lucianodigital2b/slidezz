<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('video_projects', function (Blueprint $table) {
            $table->string('source_recording_path')->nullable();
            $table->string('auto_edit_status')->nullable();
            $table->text('auto_edit_error')->nullable();
            $table->json('transcript')->nullable();
            $table->json('auto_edit_plan')->nullable();
            $table->string('auto_edit_language', 8)->nullable();
            $table->string('auto_edit_caption_style', 16)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('video_projects', function (Blueprint $table) {
            $table->dropColumn([
                'source_recording_path',
                'auto_edit_status',
                'auto_edit_error',
                'transcript',
                'auto_edit_plan',
                'auto_edit_language',
                'auto_edit_caption_style',
            ]);
        });
    }
};
