<?php

use App\Mcp\Servers\SlidezzServer;
use Laravel\Mcp\Facades\Mcp;

/*
|--------------------------------------------------------------------------
| MCP Servers
|--------------------------------------------------------------------------
|
| The Slidezz MCP server lets users drive their account from an MCP client
| (e.g. Claude Code). It is authenticated with a Sanctum personal access
| token created in the app and sent as a Bearer token:
|
|   claude mcp add --transport http slidezz https://slidezz.app/mcp \
|       --header "Authorization: Bearer <token>"
|
*/

// Dev-only: the package (laravel/mcp) lives in require-dev, so this file isn't even
// loaded in production. This env guard is a belt-and-suspenders in case dev deps are
// present in a staging environment.
if (app()->environment('local', 'testing')) {
    Mcp::web('/mcp', SlidezzServer::class)
        ->middleware('auth:sanctum');
}
