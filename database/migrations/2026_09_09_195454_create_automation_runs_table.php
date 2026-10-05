<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('automation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('content_project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('running');
            $table->text('error')->nullable();
            $table->timestamp('ran_at');
            $table->timestamps();

            $table->index(['automation_id', 'ran_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_runs');
    }
};
