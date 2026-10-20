<?php

namespace App\Mcp\Tools;

use App\Services\Posts\PostService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsIdempotent;

#[Description('Update a scheduled post. Only pending or failed posts can be updated. Provide at least one of publish_at, caption, title. Idempotent.')]
#[Name('update_post')]
#[IsIdempotent]
class UpdatePostTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'post_id' => ['required', 'integer'],
            'publish_at' => ['sometimes', 'date', 'after:now'],
            'caption' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'title' => ['sometimes', 'string', 'max:255'],
        ]);

        try {
            $schedule = app(PostService::class)->findForUser($user, $validated['post_id']);
            $updated = app(PostService::class)->update($user, $schedule, $validated);

            return Response::json(['data' => app(PostService::class)->present($updated)]);
        } catch (ModelNotFoundException $e) {
            return Response::error('Not found.');
        } catch (AuthorizationException $e) {
            return Response::error('Not allowed.');
        }
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'post_id' => $schema->integer()->description('The ID of the post (schedule) to update.')->min(1)->required(),
            'publish_at' => $schema->string()->description('New ISO 8601 publish time (must be in the future).')->nullable(),
            'caption' => $schema->string()->max(5000)->description('New caption.')->nullable(),
            'title' => $schema->string()->max(255)->description('New title.')->nullable(),
        ];
    }
}
