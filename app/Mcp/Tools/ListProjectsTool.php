<?php

namespace App\Mcp\Tools;

use App\Models\SlideProject;
use App\Models\Workspace;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List the carousel projects belonging to the authenticated Slidezz account. Read-only; does not generate anything or consume credits.')]
class ListProjectsTool extends Tool
{
    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $workspace = Workspace::where('owner_id', $user->id)->first();

        if (! $workspace) {
            return Response::json(['count' => 0, 'projects' => [], 'message' => 'No workspace found for this account.']);
        }

        $limit = max(1, min(50, (int) ($request->get('limit') ?? 20)));

        $projects = SlideProject::query()
            ->where('workspace_id', $workspace->id)
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (SlideProject $project): array => [
                'id' => $project->id,
                'title' => $project->title,
                'format' => $project->format,
                'template' => $project->template,
                'slide_count' => count($project->slides ?? []),
                'created_at' => $project->created_at?->toIso8601String(),
            ]);

        return Response::json([
            'count' => $projects->count(),
            'projects' => $projects,
        ]);
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, JsonSchema>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'limit' => $schema->integer()
                ->description('Maximum number of projects to return (1-50). Defaults to 20.')
                ->min(1)
                ->max(50),
        ];
    }
}
