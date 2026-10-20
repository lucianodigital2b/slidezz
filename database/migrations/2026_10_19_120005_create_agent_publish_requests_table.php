<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agent_publish_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('content_project_id')->constrained('content_projects')->cascadeOnDelete();
            $table->foreignId('social_account_id')->constrained('social_accounts')->cascadeOnDelete();
            $table->timestamp('publish_at');
            $table->text('caption');
            $table->string('status')->default('pending'); // pending|confirmed|cancelled
            $table->foreignId('schedule_id')->nullable()->constrained('schedules')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_publish_requests');
    }
};
