<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per sync: the history that powers the "views over time" chart.
        Schema::create('tracked_video_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tracked_video_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('likes')->default(0);
            $table->unsignedBigInteger('comments')->default(0);
            $table->unsignedBigInteger('shares')->default(0);
            $table->unsignedBigInteger('bookmarks')->default(0);
            $table->timestamp('captured_at');

            $table->index(['tracked_video_id', 'captured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracked_video_snapshots');
    }
};
