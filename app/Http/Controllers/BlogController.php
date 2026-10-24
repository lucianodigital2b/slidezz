<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

/**
 * Public blog, rendered as plain Blade so crawlers get the full HTML (no Inertia SSR in production).
 */
class BlogController extends Controller
{
    public function index(Request $request): View
    {
        $segment = $request->route('locale');
        $stored = $this->storedLocale($segment);
        app()->setLocale($segment ?? 'en');

        $posts = BlogPost::published()
            ->where('locale', $stored)
            ->latest('published_at')
            ->simplePaginate(12);

        $canonical = $posts->currentPage() > 1
            ? $posts->url($posts->currentPage())
            : BlogPost::blogIndexUrl($stored);

        return view('blog.index', [
            'posts' => $posts,
            'canonical' => $canonical,
            'alternates' => $this->indexAlternates(),
        ]);
    }

    public function show(Request $request): View
    {
        // Route params are read by name: positional binding would swap {locale} and {slug} on the localized route.
        $segment = $request->route('locale');
        $slug = $request->route('slug');
        $stored = $this->storedLocale($segment);
        app()->setLocale($segment ?? 'en');

        $post = BlogPost::published()
            ->where('locale', $stored)
            ->where('slug', $slug)
            ->firstOrFail();

        return view('blog.show', ['post' => $post, 'isPreview' => false]);
    }

    /** Markdown version of a published post, for AI crawlers (discoverable via a <link rel="alternate">). */
    public function markdown(Request $request): Response
    {
        $segment = $request->route('locale');
        $slug = $request->route('slug');
        $stored = $this->storedLocale($segment);
        app()->setLocale($segment ?? 'en');

        $post = BlogPost::published()
            ->where('locale', $stored)
            ->where('slug', $slug)
            ->firstOrFail();

        return response($post->toMarkdown(), 200, [
            'Content-Type' => 'text/markdown; charset=UTF-8',
            // The HTML page is the indexable canonical; the .md is a machine-readable mirror.
            'X-Robots-Tag' => 'noindex',
        ]);
    }

    /** Serves the IndexNow verification file at /{key}.txt, only when a key is configured. */
    public function indexNowKey(Request $request): Response
    {
        $key = (string) config('services.indexnow.key');
        abort_if($key === '' || $request->route('key') !== $key, 404);

        return response($key, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /** Any status, behind a signed URL the API hands to the agent for review. */
    public function preview(BlogPost $blogPost): Response
    {
        app()->setLocale($blogPost->locale === 'pt-BR' ? 'pt' : 'en');

        return response()
            ->view('blog.show', ['post' => $blogPost, 'isPreview' => true])
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    /** URL segment ('pt') to stored locale ('pt-BR'); null segment is the default locale. 404 on anything else. */
    private function storedLocale(?string $segment): string
    {
        if ($segment === null) {
            return BlogPost::DEFAULT_LOCALE;
        }

        $stored = array_search($segment, BlogPost::URL_SEGMENTS, true);
        abort_if($stored === false, 404);

        return $stored;
    }

    /**
     * hreflang set for the blog index, included only once a locale actually has published posts.
     *
     * @return array<string, string>
     */
    private function indexAlternates(): array
    {
        $alternates = ['en' => BlogPost::blogIndexUrl('en')];

        if (BlogPost::published()->where('locale', 'pt-BR')->exists()) {
            $alternates['pt-BR'] = BlogPost::blogIndexUrl('pt-BR');
        }

        return count($alternates) > 1 ? $alternates : [];
    }

    public function sitemap(): Response
    {
        $xml = Cache::remember(BlogPost::SITEMAP_CACHE_KEY, 600, function (): string {
            $indexAlternates = $this->indexAlternates();

            $urls = [
                ['loc' => url('/'), 'lastmod' => null, 'alternates' => []],
                ['loc' => route('privacy-policy'), 'lastmod' => null, 'alternates' => []],
                ['loc' => route('terms'), 'lastmod' => null, 'alternates' => []],
            ];

            // One <url> per blog index locale; each lists the whole hreflang set.
            foreach (array_keys($indexAlternates) ?: ['en'] as $locale) {
                $urls[] = ['loc' => BlogPost::blogIndexUrl($locale), 'lastmod' => null, 'alternates' => $indexAlternates];
            }

            BlogPost::published()
                ->where('noindex', false)
                ->whereNull('canonical_url')
                ->latest('published_at')
                ->get(['id', 'locale', 'translation_key', 'slug', 'updated_at'])
                ->each(function (BlogPost $post) use (&$urls): void {
                    $urls[] = [
                        'loc' => $post->url(),
                        'lastmod' => $post->updated_at->toAtomString(),
                        'alternates' => $post->alternates(),
                    ];
                });

            // The XML declaration stays out of Blade: with short_open_tag on (production), "<?xml" is parsed as PHP.
            return '<?xml version="1.0" encoding="UTF-8"?>'.PHP_EOL.view('blog.sitemap', ['urls' => $urls])->render();
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
