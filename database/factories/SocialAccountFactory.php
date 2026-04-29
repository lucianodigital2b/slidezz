<?php

namespace Database\Factories;

use App\Models\SocialAccount;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SocialAccount>
 */
class SocialAccountFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'provider' => $this->faker->randomElement(['tiktok', 'instagram', 'youtube']),
            'provider_id' => $this->faker->uuid(),
            'handle' => $this->faker->userName(),
            'avatar' => null,
            'access_token' => $this->faker->sha256(),
            'refresh_token' => $this->faker->sha256(),
            'expires_at' => now()->addDays(30),
        ];
    }
}
