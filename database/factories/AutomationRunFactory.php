<?php

namespace Database\Factories;

use App\Models\Automation;
use App\Models\AutomationRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AutomationRun>
 */
class AutomationRunFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'automation_id' => Automation::factory(),
            'content_project_id' => null,
            'status' => 'succeeded',
            'error' => null,
            'ran_at' => now(),
        ];
    }
}
