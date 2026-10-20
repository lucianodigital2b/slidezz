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

#[Description('List the social accounts connected to the authenticated Slidezz workspace. These account IDs are required by create_post. Read-only.')]
#[Name('list_social_accounts')]
#[IsReadOnly]
class ListSocialAccountsTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $accounts = app(PostService::class)->accounts($user);

        return Response::json([
            'accounts' => $accounts->map(fn ($account): array => [
                'id' => $account->id,
                'provider' => $account->provider,
                'handle' => $account->handle,
            ])->values(),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
