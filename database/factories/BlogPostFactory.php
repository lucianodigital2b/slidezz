<?php

namespace Database\Factories;

use App\Enums\BlogPostStatus;
use App\Models\BlogPost;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BlogPost>
 */
class BlogPostFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'locale' => 'en',
            'slug' => fake()->unique()->slug(4),
            'title' => fake()->sentence(5),
            'meta_description' => fake()->sentence(10),
            'excerpt' => fake()->sentence(15),
            'body' => '## '.fake()->sentence(4)."\n\n".implode("\n\n", fake()->paragraphs(3)),
            'faqs' => null,
            'author_name' => 'Slidezz Team',
            'primary_keyword' => fake()->words(2, true),
            'status' => BlogPostStatus::Draft,
            'noindex' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => [
            'status' => BlogPostStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (): array => [
            'status' => BlogPostStatus::Draft,
            'published_at' => null,
        ]);
    }
}
