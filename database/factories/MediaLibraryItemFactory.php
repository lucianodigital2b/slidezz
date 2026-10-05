<?php

namespace Database\Factories;

use App\Models\MediaLibraryItem;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MediaLibraryItem>
 */
class MediaLibraryItemFactory extends Factory
{
    protected $model = MediaLibraryItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $checksum = hash('sha256', $this->faker->unique()->uuid());

        return [
            'workspace_id' => Workspace::factory(),
            'disk' => 'public',
            'path' => "library/1/{$checksum}.jpg",
            'checksum' => $checksum,
            'mime' => 'image/jpeg',
            'bytes' => $this->faker->numberBetween(50_000, 900_000),
            'width' => 1080,
            'height' => 1920,
            'orientation' => 'portrait',
            'source' => 'pinterest',
            'source_id' => (string) $this->faker->randomNumber(8),
            'source_url' => $this->faker->url(),
            'description' => $this->faker->sentence(),
            'keywords' => $this->faker->words(5),
            'colors' => ['#d8c3a5', '#8e8d8a'],
            'mood' => 'calm',
            'described_at' => now(),
            'used_count' => 0,
        ];
    }

    /**
     * An item with metadata the matcher can actually score against.
     *
     * @param  list<string>  $keywords
     */
    public function describedAs(string $description, array $keywords, ?string $mood = null): static
    {
        return $this->state(fn (): array => [
            'description' => $description,
            'keywords' => $keywords,
            'mood' => $mood,
            'described_at' => now(),
        ]);
    }

    public function undescribed(): static
    {
        return $this->state(fn (): array => [
            'description' => null,
            'keywords' => [],
            'mood' => null,
            'described_at' => null,
        ]);
    }
}
