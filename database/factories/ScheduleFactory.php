<?php

namespace Database\Factories;

use App\Enums\ScheduleStatus;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Schedule>
 */
class ScheduleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'content_project_id' => ContentProject::factory(),
            'social_account_id' => SocialAccount::factory(),
            'publish_at' => $this->faker->dateTimeBetween('now', '+1 month'),
            'status' => ScheduleStatus::Pending,
            'platform_post_id' => null,
            'error_log' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => ScheduleStatus::Published,
            'platform_post_id' => $this->faker->uuid(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => ScheduleStatus::Failed,
            'error_log' => $this->faker->sentence(),
        ]);
    }
}
