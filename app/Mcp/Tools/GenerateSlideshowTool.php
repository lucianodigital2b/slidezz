<?php

namespace App\Mcp\Tools;

use App\Enums\SlideTextPreset;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Slides\SlideshowGeneration;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Description('Generate a TikTok carousel slideshow in the background. Takes about 1-2 minutes. If publish_at and social_account_id are provided, it is scheduled automatically when ready. Needs a paid Slidezz plan. Uses the first workspace owned by the user. Generated slideshows can only be posted to TikTok.')]
#[Name('generate_slideshow')]
class GenerateSlideshowTool extends Tool
{
    public function handle(Request $request): Response
    {
        $user = $request->user();

        if (! $user) {
            return Response::error('Unauthenticated. Provide a valid Slidezz personal access token as a Bearer token.');
        }

        if (! $user->hasPremiumAccess()) {
            return Response::error('Generating slideshows needs a paid Slidezz plan. Upgrade at '.route('billing.edit'));
        }

        $validated = $request->validate(SlideshowGeneration::rules());

        $workspace = Workspace::where('owner_id', $user->id)->first();

        if (! $workspace) {
            return Response::error('No workspace found for this account.');
        }

        $accountId = $validated['social_account_id'] ?? null;

        if ($accountId) {
            $account = SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'tiktok')
                ->find($accountId);

            if (! $account) {
                return Response::error('Not found.');
            }
        }

        $project = app(SlideshowGeneration::class)->start($workspace, $validated);
        $summary = SlideshowGeneration::summarize($project);

        return Response::json(array_merge($summary, [
            'next_step' => 'Call get_slideshow with this id every ~10 seconds until status is ready or failed.',
        ]));
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'topic' => $schema->string()->description('The topic or theme for the carousel.')->min(1)->max(500)->required(),
            'slide_count' => $schema->integer()->description('Number of slides (2-12). Defaults to 6.')->min(2)->max(12)->nullable(),
            'image_source' => $schema->string()->enum(['pinterest', 'ai'])->description('Image source: Pinterest scraping or AI generation. Defaults to pinterest.'),
            'text_position' => $schema->string()->enum(['top', 'center', 'bottom'])->description('Where to position text on slides. Defaults to center.'),
            'text_preset' => $schema->string()->enum(SlideTextPreset::values())->description('Text style preset. Defaults to classic.'),
            'language' => $schema->string()->description('Language for the carousel text. Defaults to Portuguese (Brazil).')->max(50)->nullable(),
            'social_account_id' => $schema->integer()->description('Optional TikTok account ID from list_social_accounts. If provided with publish_at, the finished carousel will be scheduled automatically.')->min(1)->nullable(),
            'publish_at' => $schema->string()->description('ISO 8601 datetime. Include an offset like -03:00 or Z, otherwise it is read as UTC. If provided with social_account_id, the post is scheduled when ready.')->nullable(),
        ];
    }
}
