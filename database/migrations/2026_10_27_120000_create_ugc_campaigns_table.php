<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ugc_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('active'); // active | paused | ended
            $table->string('objective')->nullable();
            $table->string('currency', 3)->default('USD');

            // Payout rules. Money is stored in integer cents of `currency`.
            $table->string('payout_model')->default('cpm'); // cpm | flat | cpm_plus_flat
            $table->unsignedInteger('cpm_rate_cents')->default(0); // paid per 1000 views
            $table->unsignedInteger('flat_fee_cents')->default(0); // base per video
            $table->unsignedInteger('payout_cap_cents')->nullable(); // max per video
            $table->unsignedBigInteger('budget_cents')->nullable(); // whole-campaign ceiling

            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->string('color', 9)->default('#4F46E5');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ugc_campaigns');
    }
};
