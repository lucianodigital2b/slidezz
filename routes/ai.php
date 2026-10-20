<?php

use App\Mcp\Servers\SlidezzServer;
use Laravel\Mcp\Facades\Mcp;

/*
|--------------------------------------------------------------------------
| MCP Servers
|--------------------------------------------------------------------------
|
| The Slidezz MCP server lets users drive their account from an MCP client
| (e.g. Claude Code, Cursor). It is authenticated with a Sanctum personal
| access token created in the app and sent as a Bearer token:
|
|   claude mcp add --transport http slidezz https://slidezz.app/mcp \
|       --header "Authorization: Bearer <token>"
|
*/

Mcp::web('/mcp', SlidezzServer::class)
    ->middleware(['auth:sanctum', 'throttle:120,1']);
