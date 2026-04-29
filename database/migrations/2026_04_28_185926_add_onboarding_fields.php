<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('onboarding_completed_at')->nullable()->after('trial_ends_at');
        });

        Schema::table('workspaces', function (Blueprint $table): void {
            $table->string('industry')->nullable()->after('name');
            $table->string('vibe')->nullable()->after('industry');
            $table->string('brand_color', 7)->nullable()->after('vibe');
            $table->string('logo_path')->nullable()->after('brand_color');
            $table->string('goal')->nullable()->after('logo_path');
            $table->string('target_audience')->nullable()->after('goal');
            $table->string('tone_of_voice')->nullable()->after('target_audience');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('onboarding_completed_at');
        });

        Schema::table('workspaces', function (Blueprint $table): void {
            $table->dropColumn(['industry', 'vibe', 'brand_color', 'logo_path', 'goal', 'target_audience', 'tone_of_voice']);
        });
    }
};
