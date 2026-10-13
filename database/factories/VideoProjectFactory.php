<?php

namespace Database\Factories;

use App\Models\VideoProject;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<VideoProject>
 */
class VideoProjectFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'slide_project_id' => null,
            'title' => $this->faker->words(3, true),
            'format' => 'stories',
            'timeline' => [
                'clips' => [
                    $this->clip('image', 'none'),
                    $this->clip('image', 'fade'),
                ],
                'audio' => null,
            ],
            'status' => 'draft',
            'render_progress' => 0,
        ];
    }

    public function empty(): static
    {
        return $this->state(fn (): array => ['timeline' => ['clips' => [], 'audio' => null]]);
    }

    public function rendering(): static
    {
        return $this->state(fn (): array => ['status' => 'rendering', 'render_progress' => 40]);
    }

    public function ready(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'ready',
            'render_progress' => 100,
            'video_path' => 'videos/render.mp4',
            'rendered_at' => now(),
        ]);
    }

    /**
     * @param  'image'|'video'  $type
     * @return array<string, mixed>
     */
    private function clip(string $type, string $transition): array
    {
        return [
            'id' => (string) Str::uuid(),
            'type' => $type,
            'src' => 'http://localhost/storage/videos/'.$this->faker->uuid().($type === 'image' ? '.jpg' : '.mp4'),
            'duration' => 3,
            'trimStart' => 0,
            'transition' => $transition,
            'text' => '',
            'textPosition' => 'center',
            'zoom' => false,
            'muted' => false,
        ];
    }
}
