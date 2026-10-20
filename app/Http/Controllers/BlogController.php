<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

/**
 * Public blog, rendered as plain Blade so crawlers get the full HTML (no Inertia SSR in production).
 */
class BlogController extends Controller
{
    public function index(): View
    {
        $posts = BlogPost::published()
            ->where('locale', 'en')
            ->latest('published_at')
            ->simplePaginate(12);

        return view('blog.index', ['posts' => $posts]);
    }

    public function show(string $slug): View
    {
        $post = BlogPost::published()
            ->where('locale', 'en')
            ->where('slug', $slug)
            ->firstOrFail();

        return view('blog.show', ['post' => $post, 'isPreview' => false]);
    }

    /** Any status, behind a signed URL the API hands to the agent for review. */
    public function preview(BlogPost $blogPost): Response
    {
        return response()
            ->view('blog.show', ['post' => $blogPost, 'isPreview' => true])
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    public function sitemap(): Response
    {
        $xml = Cache::remember(BlogPost::SITEMAP_CACHE_KEY, 600, function (): string {
            $urls = [
                ['loc' => url('/'), 'lastmod' => null],
                ['loc' => route('blog.index'), 'lastmod' => null],
                ['loc' => route('privacy-policy'), 'lastmod' => null],
                ['loc' => route('terms'), 'lastmod' => null],
            ];

            BlogPost::published()
                ->where('noindex', false)
                ->whereNull('canonical_url')
                ->latest('published_at')
                ->get(['id', 'slug', 'updated_at'])
                ->each(function (BlogPost $post) use (&$urls): void {
                    $urls[] = ['loc' => $post->url(), 'lastmod' => $post->updated_at->toAtomString()];
                });

            // The XML declaration stays out of Blade: with short_open_tag on (production), "<?xml" is parsed as PHP.
            return '<?xml version="1.0" encoding="UTF-8"?>'.PHP_EOL.view('blog.sitemap', ['urls' => $urls])->render();
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
