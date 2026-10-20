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
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Description('Delete a scheduled post. Publishing posts cannot be deleted. Destructive. Always confirm with the user before deleting.')]
#[Name('delete_post')]
#[IsDestructive]
class DeletePostTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'post_id' => ['required', 'integer'],
        ]);

        try {
            $schedule = app(PostService::class)->findForUser($user, $validated['post_id']);
            app(PostService::class)->delete($user, $schedule);

            return Response::json(['deleted' => true]);
        } catch (ModelNotFoundException $e) {
            return Response::error('Not found.');
        } catch (AuthorizationException $e) {
            return Response::error('Not allowed.');
        }
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'post_id' => $schema->integer()->description('The ID of the post to delete.')->min(1)->required(),
        ];
    }
}
