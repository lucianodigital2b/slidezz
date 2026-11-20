<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->unsignedBigInteger('followers')->nullable();
            $table->unsignedBigInteger('following')->nullable();
            $table->unsignedBigInteger('posts_count')->nullable();
            $table->unsignedBigInteger('total_likes')->nullable();
            $table->timestamps();

            $table->unique(['social_account_id', 'snapshot_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_snapshots');
    }
};
