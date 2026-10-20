<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\CreatePostTool;
use App\Mcp\Tools\DeletePostTool;
use App\Mcp\Tools\DuplicatePostTool;
use App\Mcp\Tools\GenerateSlideshowTool;
use App\Mcp\Tools\GetSlideshowTool;
use App\Mcp\Tools\ListPostsTool;
use App\Mcp\Tools\ListProjectsTool;
use App\Mcp\Tools\ListSocialAccountsTool;
use App\Mcp\Tools\UpdatePostTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Slidezz')]
#[Version('1.0.0')]
#[Instructions('Slidezz is a TikTok and Instagram carousel creator and scheduler. Typical flow: list_social_accounts to get account IDs, then generate_slideshow to create a carousel, poll get_slideshow until status is ready, and finally create_post with the content_project_id. Alternatively, create_post can accept image_urls directly. Always confirm account, publish time, and caption with the user before scheduling or deleting. All times are UTC unless an explicit offset like -03:00 or Z is provided.')]
class SlidezzServer extends Server
{
    /**
     * The tools exposed by this server.
     *
     * @var array<int, class-string>
     */
    protected array $tools = [
        ListProjectsTool::class,
        ListSocialAccountsTool::class,
        ListPostsTool::class,
        GenerateSlideshowTool::class,
        GetSlideshowTool::class,
        CreatePostTool::class,
        UpdatePostTool::class,
        DuplicatePostTool::class,
        DeletePostTool::class,
    ];

    /**
     * The resources exposed by this server.
     *
     * @var array<int, class-string>
     */
    protected array $resources = [
        //
    ];

    /**
     * The prompts exposed by this server.
     *
     * @var array<int, class-string>
     */
    protected array $prompts = [
        //
    ];
}
