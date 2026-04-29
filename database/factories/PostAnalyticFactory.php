<?php

namespace Database\Factories;

use App\Models\PostAnalytic;
use App\Models\Schedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PostAnalytic>
 */
class PostAnalyticFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $views = $this->faker->numberBetween(100, 50000);

        return [
            'schedule_id' => Schedule::factory()->published(),
            'views' => $views,
            'likes' => $this->faker->numberBetween(10, (int) ($views * 0.1)),
            'comments' => $this->faker->numberBetween(0, (int) ($views * 0.02)),
            'shares' => $this->faker->numberBetween(0, (int) ($views * 0.05)),
            'bookmarks' => $this->faker->numberBetween(0, (int) ($views * 0.03)),
            'last_synced_at' => now(),
        ];
    }
}
