<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracked_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ugc_campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ugc_creator_id')->nullable()->constrained()->nullOnDelete();

            $table->string('platform'); // tiktok | instagram
            $table->text('url');
            $table->string('external_id')->nullable(); // platform video id when known
            $table->text('thumbnail_url')->nullable();
            $table->text('caption')->nullable();
            $table->string('author_handle')->nullable();
            $table->timestamp('posted_at')->nullable();

            // Latest known metrics (a running copy of the newest snapshot).
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('likes')->default(0);
            $table->unsignedBigInteger('comments')->default(0);
            $table->unsignedBigInteger('shares')->default(0);
            $table->unsignedBigInteger('bookmarks')->default(0);

            // ok = fetched automatically, manual = metrics typed by hand (no auto source),
            // error = last auto fetch failed.
            $table->string('fetch_status')->default('ok');
            $table->timestamp('last_synced_at')->nullable();

            // Per-video payout overrides (null falls back to the campaign rule).
            $table->unsignedInteger('payout_override_cents')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['ugc_campaign_id', 'platform']);
            $table->index('ugc_creator_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracked_videos');
    }
};
