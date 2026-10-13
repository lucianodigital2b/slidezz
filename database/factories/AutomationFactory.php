<?php

namespace Database\Factories;

use App\Enums\SlideTextPreset;
use App\Models\Automation;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Automation>
 */
class AutomationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'social_account_id' => null,
            'name' => $this->faker->words(2, true),
            'status' => 'active',
            'niche' => $this->faker->sentence(),
            'language' => 'Portuguese (Brazil)',
            'slide_count' => 6,
            'image_source' => 'pinterest',
            'image_keywords' => ['aesthetic desk', 'morning light'],
            'text_position' => 'center',
            'text_preset' => SlideTextPreset::Classic,
            'post_times' => ['09:00', '19:00'],
            'timezone' => 'America/Sao_Paulo',
        ];
    }

    public function paused(): static
    {
        return $this->state(fn (): array => ['status' => 'paused']);
    }

    public function due(): static
    {
        return $this->state(fn (): array => ['next_run_at' => now()->subMinute()]);
    }
}
