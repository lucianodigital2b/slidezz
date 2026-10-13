<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Workspace>
 */
class WorkspaceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'owner_id' => User::factory(),
        ];
    }

    public function withProfile(): static
    {
        return $this->state(fn () => [
            'profile' => [
                'goal' => 'sell_products',
                'brand_name' => $this->faker->company(),
                'brand_description' => $this->faker->sentence(),
                'target_audience' => $this->faker->sentence(),
                'tone_of_voice' => ['professional'],
                'palette' => [
                    'name' => 'sunset',
                    'primary' => '#F97316',
                    'secondary' => '#FDE68A',
                    'accent' => '#D97706',
                ],
                'visual_style' => null,
            ],
        ]);
    }
}
