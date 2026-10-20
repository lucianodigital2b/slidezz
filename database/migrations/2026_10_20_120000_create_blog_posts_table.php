<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('locale', 10)->default('en');
            $table->string('slug', 160);
            $table->string('title', 200);
            $table->string('meta_title', 70)->nullable();
            $table->string('meta_description', 170)->nullable();
            $table->string('excerpt', 300)->nullable();
            $table->longText('body');
            $table->json('faqs')->nullable();
            $table->json('json_ld')->nullable();
            $table->string('category', 80)->nullable();
            $table->json('tags')->nullable();
            $table->string('author_name', 120)->default('Slidezz Team');
            $table->string('hero_image_url', 2048)->nullable();
            $table->string('hero_image_alt', 255)->nullable();
            $table->string('canonical_url', 2048)->nullable();
            $table->string('primary_keyword', 160)->nullable();
            $table->json('secondary_keywords')->nullable();
            $table->string('search_intent', 40)->nullable();
            $table->string('task_ref', 255)->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->boolean('noindex')->default(false);
            $table->timestamp('published_at')->nullable()->index();
            $table->foreignId('last_editor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['locale', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
