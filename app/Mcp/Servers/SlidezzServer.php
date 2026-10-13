<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\ListProjectsTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Slidezz')]
#[Version('0.1.0')]
#[Instructions('Access a Slidezz account to inspect its carousel projects. Authenticate with a personal access token created in the Slidezz settings and sent as a Bearer token.')]
class SlidezzServer extends Server
{
    /**
     * The tools exposed by this server.
     *
     * @var array<int, class-string>
     */
    protected array $tools = [
        ListProjectsTool::class,
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
