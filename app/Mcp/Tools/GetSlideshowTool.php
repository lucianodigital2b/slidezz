<?php

namespace App\Mcp\Tools;

use App\Models\ContentProject;
use App\Models\Workspace;
use App\Services\Slides\SlideshowGeneration;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('Check the status and details of a generated slideshow project. Read-only. Use after generate_slideshow to poll for completion.')]
#[Name('get_slideshow')]
#[IsReadOnly]
class GetSlideshowTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        $validated = $request->validate([
            'project_id' => ['required', 'integer'],
        ]);

        try {
            $workspaceIds = Workspace::where('owner_id', $user->id)->pluck('id');
            $project = ContentProject::whereIn('workspace_id', $workspaceIds)
                ->findOrFail($validated['project_id']);

            return Response::json(SlideshowGeneration::summarize($project));
        } catch (ModelNotFoundException $e) {
            return Response::error('Not found.');
        }
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->integer()->description('The ID of the slideshow project returned by generate_slideshow.')->min(1)->required(),
        ];
    }
}
