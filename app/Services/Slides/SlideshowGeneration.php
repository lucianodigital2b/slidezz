<?php

namespace App\Services\Slides;

use App\Enums\SlideTextPreset;
use App\Jobs\GenerateSlideshow;
use App\Models\ContentProject;
use App\Models\Workspace;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SlideshowGeneration
{
    /**
     * Shared validation rules for the slideshow generation.
     */
    public static function rules(): array
    {
        return [
            'topic' => ['required', 'string', 'max:500'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:12'],
            'image_source' => ['nullable', 'string', 'in:pinterest,ai'],
            'text_position' => ['nullable', 'string', 'in:top,center,bottom'],
            'text_preset' => ['nullable', Rule::in(SlideTextPreset::values())],
            'language' => ['nullable', 'string', 'max:50'],
            'social_account_id' => ['nullable', 'integer'],
            'publish_at' => ['nullable', 'date', 'after_or_equal:now'],
        ];
    }

    /**
     * Create the ContentProject and dispatch the generation job.
     */
    public function start(Workspace $workspace, array $validated): ContentProject
    {
        $accountId = $validated['social_account_id'] ?? null;

        $project = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => Str::limit($validated['topic'], 120, ''),
            'type' => 'slideshow',
            'status' => 'generating',
            'script_data' => [
                'topic' => $validated['topic'],
                'slide_count' => $validated['slide_count'] ?? 6,
                'image_source' => $validated['image_source'] ?? 'pinterest',
                'text_position' => $validated['text_position'] ?? 'center',
                'text_preset' => $validated['text_preset'] ?? SlideTextPreset::Classic->value,
                'language' => $validated['language'] ?? 'Portuguese (Brazil)',
                'social_account_id' => $accountId,
                'publish_at' => isset($validated['publish_at'])
                    ? Carbon::parse($validated['publish_at'])->utc()->toDateTimeString()
                    : null,
            ],
        ]);

        GenerateSlideshow::dispatch($project);

        return $project;
    }

    /**
     * Public summarizer for polling and response output.
     */
    public static function summarize(ContentProject $project): array
    {
        $data = $project->script_data ?? [];

        return [
            'id' => $project->id,
            'title' => $project->title,
            'status' => $project->status,
            'topic' => $data['topic'] ?? null,
            'caption' => $data['caption'] ?? null,
            'hashtags' => $data['hashtags'] ?? [],
            'error' => $data['error'] ?? null,
            'slides' => array_map(
                fn (array $slide): array => ['text' => $slide['text'] ?? '', 'url' => $slide['url'] ?? ''],
                $data['slides'] ?? [],
            ),
            'created_at' => $project->created_at?->toIso8601String(),
        ];
    }
}
