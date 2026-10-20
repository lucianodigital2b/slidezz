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

#[Description('Duplicate an existing scheduled post with a new publish time. Idempotent.')]
#[Name('duplicate_post')]
#[IsIdempotent]
class DuplicatePostTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'post_id' => ['required', 'integer'],
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        try {
            $schedule = app(PostService::class)->findForUser($user, $validated['post_id']);
            $copy = app(PostService::class)->duplicate($user, $schedule, $validated['publish_at']);

            return Response::json(['data' => app(PostService::class)->present($copy)]);
        } catch (ModelNotFoundException $e) {
            return Response::error('Not found.');
        } catch (AuthorizationException $e) {
            return Response::error('Not allowed.');
        }
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'post_id' => $schema->integer()->description('The ID of the post to duplicate.')->min(1)->required(),
            'publish_at' => $schema->string()->description('New ISO 8601 publish time (must be in the future).')->required(),
        ];
    }
}
