<?php

namespace Database\Factories;

use App\Models\ContentProject;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentProject>
 */
class ContentProjectFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'title' => $this->faker->sentence(4),
            'type' => $this->faker->randomElement(['video', 'reel', 'story']),
            'status' => $this->faker->randomElement(['draft', 'ready', 'published']),
            'script_data' => null,
            'video_url' => null,
        ];
    }
}
