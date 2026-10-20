<?php

use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\PostController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|
| Token API for scheduling posts from scripts or agents. Authenticate with a
| Sanctum personal access token (Settings → API tokens) sent as a Bearer token.
|
*/

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {
    Route::get('social-accounts', [PostController::class, 'accounts']);
    Route::get('posts', [PostController::class, 'index']);
    Route::post('posts', [PostController::class, 'store']);
    Route::patch('posts/{schedule}', [PostController::class, 'update']);
    Route::post('posts/{schedule}/duplicate', [PostController::class, 'duplicate']);
    Route::delete('posts/{schedule}', [PostController::class, 'destroy']);

    // Blog CMS for the SEO agent. Editors only; publishing needs the blog:publish ability.
    Route::prefix('blog')->group(function (): void {
        Route::get('schema', [BlogPostController::class, 'schema']);
        Route::get('posts', [BlogPostController::class, 'index']);
        Route::post('posts', [BlogPostController::class, 'store']);
        Route::get('posts/{blogPost}', [BlogPostController::class, 'show']);
        Route::patch('posts/{blogPost}', [BlogPostController::class, 'update']);
        Route::post('images', [BlogPostController::class, 'uploadImage']);
    });
});
