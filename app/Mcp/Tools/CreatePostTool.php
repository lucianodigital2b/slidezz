<?php

namespace App\Mcp\Tools;

use App\Services\Posts\PostService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Description('Schedule a post on a connected social account (TikTok or Instagram). Requires social_account_id and publish_at. Provide exactly one of image_urls (array of HTTPS URLs) or content_project_id (an existing ready slideshow). Instagram carousels need 2+ images; one image on Instagram becomes a single image post. Always confirm account, time, and caption with the user first.')]
#[Name('create_post')]
class CreatePostTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
            'publish_at' => ['required', 'date', 'after:now'],
            'caption' => ['nullable', 'string', 'max:5000'],
            'title' => ['nullable', 'string', 'max:255'],
            'image_urls' => ['required_without:content_project_id', 'array', 'min:1', 'max:35'],
            'image_urls.*' => ['required_without:content_project_id', 'string', 'url'],
            'content_project_id' => ['required_without:image_urls', 'integer'],
        ]);

        if (isset($validated['image_urls']) && isset($validated['content_project_id'])) {
            throw ValidationException::withMessages(['content_project_id' => 'Provide either image_urls or content_project_id, not both.']);
        }

        if (! isset($validated['image_urls']) && ! isset($validated['content_project_id'])) {
            throw ValidationException::withMessages(['image_urls' => 'Provide either image_urls or content_project_id.']);
        }

        try {
            if (isset($validated['image_urls'])) {
                $schedule = app(PostService::class)->createFromImageUrls(
                    $user,
                    $validated['social_account_id'],
                    $validated['publish_at'],
                    $validated['caption'] ?? null,
                    $validated['title'] ?? null,
                    $validated['image_urls'],
                );
            } else {
                $schedule = app(PostService::class)->createFromProject(
                    $user,
                    $validated['social_account_id'],
                    $validated['publish_at'],
                    $validated['caption'] ?? null,
                    $validated['content_project_id'],
                );
            }

            return Response::json(['data' => app(PostService::class)->present($schedule)]);
        } catch (ModelNotFoundException $e) {
            return Response::error('Not found.');
        } catch (AuthorizationException $e) {
            return Response::error('Not allowed.');
        }
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'social_account_id' => $schema->integer()->description('ID of the social account to post to (from list_social_accounts).')->min(1)->required(),
            'publish_at' => $schema->string()->description('ISO 8601 datetime (UTC or with offset). Include an offset like -03:00 or Z, otherwise it is read as UTC.')->required(),
            'caption' => $schema->string()->max(5000)->description('Optional caption text.')->nullable(),
            'title' => $schema->string()->max(255)->description('Optional title.')->nullable(),
            'image_urls' => $schema->array()->items($schema->string())->min(1)->max(35)->description('Array of HTTPS image URLs. Provide this OR content_project_id. Instagram carousels need 2+; one image on Instagram becomes single image post.')->nullable(),
            'content_project_id' => $schema->integer()->min(1)->description('ID of an existing ready project (e.g., from generate_slideshow/get_slideshow). Provide this OR image_urls.')->nullable(),
        ];
    }
}
