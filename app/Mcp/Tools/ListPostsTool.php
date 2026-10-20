<?php

namespace App\Mcp\Tools;

use App\Services\Posts\PostService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('List scheduled posts for the authenticated user. Optionally filter by date range (from, to) and status (pending, publishing, published, failed). Read-only.')]
#[Name('list_posts')]
#[IsReadOnly]
class ListPostsTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:pending,publishing,published,failed'],
        ]);

        $posts = app(PostService::class)->list(
            $user,
            $validated['from'] ?? null,
            $validated['to'] ?? null,
            $validated['status'] ?? null,
        );

        $presented = $posts->map(fn ($schedule) => app(PostService::class)->present($schedule));

        return Response::json([
            'count' => $presented->count(),
            'posts' => $presented->toArray(),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->description('Return posts scheduled at or after this ISO 8601 date.')->nullable(),
            'to' => $schema->string()->description('Return posts scheduled at or before this ISO 8601 date.')->nullable(),
            'status' => $schema->string()->enum(['pending', 'publishing', 'published', 'failed'])->description('Filter by schedule status.'),
        ];
    }
}
