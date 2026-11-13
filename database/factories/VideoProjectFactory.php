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

    public function autoEditPending(): static
    {
        return $this->state(fn (): array => [
            'source_recording_path' => 'videos/recording.mp4',
            'auto_edit_status' => 'pending',
            'auto_edit_error' => null,
        ]);
    }

    public function autoEditFailed(): static
    {
        return $this->state(fn (): array => [
            'source_recording_path' => 'videos/recording.mp4',
            'auto_edit_status' => 'failed',
            'auto_edit_error' => 'Falha na transcrição.',
        ]);
    }

    public function autoEditDone(): static
    {
        return $this->state(fn (): array => [
            'source_recording_path' => 'videos/recording.mp4',
            'auto_edit_status' => 'done',
            'auto_edit_error' => null,
            'timeline' => [
                'clips' => [$this->clip('video', 'none')],
                'audio' => null,
                'captions' => [
                    'enabled' => true,
                    'style' => 'bold',
                    'position' => 'bottom',
                    'items' => [[
                        'text' => 'Olá mundo',
                        'start' => 0,
                        'end' => 1,
                        'words' => [
                            ['text' => 'Olá', 'start' => 0, 'end' => 0.4, 'highlight' => false],
                            ['text' => 'mundo', 'start' => 0.5, 'end' => 1, 'highlight' => true],
                        ],
                    ]],
                ],
            ],
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
