<?php

namespace App\Models;

use App\Enums\BlogPostStatus;
use Database\Factories\BlogPostFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * A blog article served as plain Blade HTML at /blog/{slug}, written by the SEO agent through the API.
 */
class BlogPost extends Model
{
    /** @use HasFactory<BlogPostFactory> */
    use HasFactory;

    public const SITEMAP_CACHE_KEY = 'sitemap.xml';

    /** Schema types generated from the post itself; agent-supplied copies are dropped so they can't contradict the page. */
    private const GENERATED_SCHEMA_TYPES = ['BlogPosting', 'Article', 'BreadcrumbList', 'FAQPage'];

    protected $fillable = [
        'locale',
        'slug',
        'title',
        'meta_title',
        'meta_description',
        'excerpt',
        'body',
        'faqs',
        'json_ld',
        'category',
        'tags',
        'author_name',
        'hero_image_url',
        'hero_image_alt',
        'canonical_url',
        'primary_keyword',
        'secondary_keywords',
        'search_intent',
        'task_ref',
        'status',
        'noindex',
        'published_at',
        'last_editor_id',
    ];

    protected function casts(): array
    {
        return [
            'faqs' => 'array',
            'json_ld' => 'array',
            'tags' => 'array',
            'secondary_keywords' => 'array',
            'noindex' => 'boolean',
            'published_at' => 'datetime',
            'status' => BlogPostStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::SITEMAP_CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::SITEMAP_CACHE_KEY));
    }

    /**
     * @param  Builder<BlogPost>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', BlogPostStatus::Published)->where('published_at', '<=', now());
    }

    public function isLive(): bool
    {
        return $this->status === BlogPostStatus::Published
            && $this->published_at !== null
            && $this->published_at->lte(now());
    }

    public function url(): string
    {
        return route('blog.show', $this->slug);
    }

    public function canonical(): string
    {
        return $this->canonical_url ?? $this->url();
    }

    public function description(): string
    {
        return $this->meta_description
            ?? $this->excerpt
            ?? Str::limit(trim(strip_tags($this->bodyHtml())), 160);
    }

    /** Markdown (GitHub-flavored) to HTML with raw HTML and unsafe links stripped. */
    public static function renderMarkdown(string $markdown): string
    {
        return Str::markdown($markdown, ['html_input' => 'strip', 'allow_unsafe_links' => false]);
    }

    public function bodyHtml(): string
    {
        return self::renderMarkdown($this->body);
    }

    public function wordCount(): int
    {
        return str_word_count(strip_tags($this->bodyHtml()));
    }

    public function readingMinutes(): int
    {
        return max(1, (int) ceil($this->wordCount() / 220));
    }

    /**
     * JSON-LD for the page: BlogPosting, BreadcrumbList, FAQPage (from the visible FAQ) and any extra agent types.
     *
     * @return list<array<string, mixed>>
     */
    public function structuredData(): array
    {
        $posting = [
            '@context' => 'https://schema.org',
            '@type' => 'BlogPosting',
            'headline' => $this->title,
            'description' => $this->description(),
            'datePublished' => ($this->published_at ?? $this->created_at)?->toIso8601String(),
            'dateModified' => $this->updated_at?->toIso8601String(),
            'author' => ['@type' => 'Organization', 'name' => $this->author_name],
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'Slidezz',
                'logo' => ['@type' => 'ImageObject', 'url' => url('/apple-touch-icon.png')],
            ],
            'mainEntityOfPage' => $this->canonical(),
            'inLanguage' => $this->locale,
        ];

        if ($this->hero_image_url) {
            $posting['image'] = $this->hero_image_url;
        }

        $data = [$posting, [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => url('/')],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Blog', 'item' => route('blog.index')],
                ['@type' => 'ListItem', 'position' => 3, 'name' => $this->title, 'item' => $this->canonical()],
            ],
        ]];

        if (! empty($this->faqs)) {
            $data[] = [
                '@context' => 'https://schema.org',
                '@type' => 'FAQPage',
                'mainEntity' => array_map(fn (array $faq): array => [
                    '@type' => 'Question',
                    'name' => $faq['question'],
                    'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq['answer']],
                ], $this->faqs),
            ];
        }

        foreach ($this->json_ld ?? [] as $extra) {
            if (is_array($extra) && isset($extra['@type']) && ! in_array($extra['@type'], self::GENERATED_SCHEMA_TYPES, true)) {
                $data[] = ['@context' => 'https://schema.org', ...$extra];
            }
        }

        return $data;
    }

    public function previewUrl(): string
    {
        return URL::temporarySignedRoute('blog.preview', now()->addDays(7), ['blogPost' => $this->id]);
    }
}
