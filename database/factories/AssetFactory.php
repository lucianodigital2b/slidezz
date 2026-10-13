<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Asset>
 */
class AssetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'type' => $this->faker->randomElement(['image', 'video', 'audio', 'avatar']),
            'url' => $this->faker->url(),
            'metadata' => null,
        ];
    }
}
