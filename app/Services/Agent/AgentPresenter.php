<?php

namespace App\Services\Agent;

use App\Models\AgentConversation;

class AgentPresenter
{
    /**
     * Build the State shape used by the Inertia page.
     *
     * @return array{status: string, error: ?string, title: string, messages: list<array<string, mixed>>, slides: list<array<string, mixed>>, publish_requests: list<array<string, mixed>>}
     */
    public function state(AgentConversation $conversation): array
    {
        $messages = $conversation->messages()
            ->orderBy('id')
            ->get()
            ->map(function ($message): ?array {
                $content = $message->content ?? [];

                if ($message->role === 'user' && collect($content)->every(fn ($block) => ($block['type'] ?? null) === 'tool_result')) {
                    // Tool-result-only user messages are invisible plumbing for the API.
                    return null;
                }

                $text = collect($content)
                    ->filter(fn ($block) => ($block['type'] ?? null) === 'text')
                    ->pluck('text')
                    ->implode("\n");

                $tools = [];

                if ($message->role === 'assistant') {
                    $tools = collect($content)
                        ->filter(fn ($block) => ($block['type'] ?? null) === 'tool_use')
                        ->map(fn ($block) => [
                            'name' => $block['name'] ?? '',
                            'label' => $this->toolLabel((string) ($block['name'] ?? '')),
                        ])
                        ->values()
                        ->all();
                }

                if ($text === '' && $tools === []) {
                    // Thinking-only turns have nothing to show.
                    return null;
                }

                return [
                    'id' => $message->id,
                    'role' => $message->role,
                    'text' => $text,
                    'images' => [],
                    'tools' => $tools,
                ];
            })
            ->filter()
            ->values()
            ->all();

        $project = $conversation->contentProject;

        $slides = [];

        if ($project) {
            $slides = collect($project->script_data['slides'] ?? [])
                ->map(fn (array $slide): array => [
                    'index' => (int) ($slide['index'] ?? 0),
                    'url' => (string) ($slide['url'] ?? ''),
                    'text' => (string) ($slide['text'] ?? ''),
                ])
                ->values()
                ->all();
        }

        $publishRequests = $conversation->publishRequests()
            ->with('socialAccount')
            ->get()
            ->map(fn ($request): array => [
                'id' => $request->id,
                'status' => $request->status,
                'account' => [
                    'id' => $request->socialAccount->id,
                    'provider' => $request->socialAccount->provider,
                    'name' => $request->socialAccount->handle ?? $request->socialAccount->provider,
                ],
                'publish_at' => $request->publish_at?->toIso8601String(),
                'caption' => $request->caption,
            ])
            ->all();

        return [
            'status' => $conversation->status,
            'error' => $conversation->error,
            'title' => $conversation->title,
            'messages' => $messages,
            'slides' => $slides,
            'publish_requests' => $publishRequests,
        ];
    }

    private function toolLabel(string $name): string
    {
        return match ($name) {
            'fetch_tiktok' => 'Downloaded TikTok post',
            'view_assets' => 'Viewed assets',
            'search_images' => 'Searched images',
            'generate_image' => 'Generated image',
            'build_slideshow' => 'Built slideshow',
            'list_social_accounts' => 'Listed social accounts',
            'request_publish' => 'Requested publishing',
            default => $name,
        };
    }
}
