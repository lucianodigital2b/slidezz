<?php

namespace Tests\Feature;

use App\Enums\BlogPostStatus;
use App\Models\BlogPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_live_posts(): void
    {
        BlogPost::factory()->published()->create(['title' => 'Live carousel guide']);
        BlogPost::factory()->draft()->create(['title' => 'Unfinished draft']);
        BlogPost::factory()->published()->create(['title' => 'Scheduled for tomorrow', 'published_at' => now()->addDay()]);

        $this->get('/blog')
            ->assertOk()
            ->assertSee('Live carousel guide')
            ->assertDontSee('Unfinished draft')
            ->assertDontSee('Scheduled for tomorrow');
    }

    public function test_show_renders_seo_tags_and_schema(): void
    {
        $post = BlogPost::factory()->published()->create([
            'title' => 'How to make an Instagram carousel',
            'meta_title' => 'Instagram carousel: the 5 minute method',
            'meta_description' => 'A step by step method for carousels that get saved.',
            'faqs' => [['question' => 'How many slides should a carousel have?', 'answer' => 'Between **7 and 10**.']],
        ]);

        $this->get("/blog/{$post->slug}")
            ->assertOk()
            ->assertSee('<title>Instagram carousel: the 5 minute method</title>', false)
            ->assertSee('<meta name="description" content="A step by step method for carousels that get saved.">', false)
            ->assertSee('<link rel="canonical" href="'.$post->url().'">', false)
            ->assertSee('<h1>How to make an Instagram carousel</h1>', false)
            ->assertSee('"@type":"BlogPosting"', false)
            ->assertSee('"@type":"FAQPage"', false)
            ->assertSee('<strong>7 and 10</strong>', false)
            ->assertDontSee('noindex', false);
    }

    public function test_draft_and_unknown_slugs_return_404(): void
    {
        $draft = BlogPost::factory()->draft()->create();

        $this->get("/blog/{$draft->slug}")->assertNotFound();
        $this->get('/blog/does-not-exist')->assertNotFound();
    }

    public function test_raw_html_in_body_is_stripped_and_tables_render(): void
    {
        $post = BlogPost::factory()->published()->create([
            'body' => "<script>alert('x')</script>\n\n| Tool | Price |\n|---|---|\n| Slidezz | $19 |",
        ]);

        $this->get("/blog/{$post->slug}")
            ->assertOk()
            ->assertDontSee("alert('x')", false)
            ->assertSee('<table>', false);
    }

    public function test_preview_needs_a_signature_and_is_noindex(): void
    {
        $draft = BlogPost::factory()->draft()->create(['title' => 'Draft under review']);

        $this->get("/blog/preview/{$draft->id}")->assertForbidden();

        $this->get($draft->previewUrl())
            ->assertOk()
            ->assertSee('Draft under review')
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_sitemap_lists_only_indexable_live_posts(): void
    {
        $live = BlogPost::factory()->published()->create();
        $draft = BlogPost::factory()->draft()->create();
        $hidden = BlogPost::factory()->published()->create(['noindex' => true]);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<?xml version="1.0" encoding="UTF-8"?>', false)
            ->assertSee('<loc>'.$live->url().'</loc>', false)
            ->assertSee('<loc>'.route('blog.index').'</loc>', false)
            ->assertDontSee($draft->url(), false)
            ->assertDontSee($hidden->url(), false);
    }

    public function test_sitemap_cache_refreshes_when_a_post_goes_live(): void
    {
        $post = BlogPost::factory()->draft()->create();

        $this->get('/sitemap.xml')->assertDontSee($post->url(), false);

        $post->update(['status' => BlogPostStatus::Published, 'published_at' => now()->subMinute()]);

        $this->get('/sitemap.xml')->assertSee($post->url(), false);
    }

    public function test_pt_post_is_served_under_pt_prefix_and_localized(): void
    {
        $post = BlogPost::factory()->published()->create([
            'locale' => 'pt-BR',
            'slug' => 'gerador-de-carrossel-com-ia',
            'title' => 'Gerador de carrossel com IA',
        ]);

        $this->get('/pt/blog/'.$post->slug)
            ->assertOk()
            ->assertSee('<html lang="pt-BR">', false)
            ->assertSee('Gerador de carrossel com IA')
            ->assertSee('Começar') // localized CTA/nav button
            ->assertSee('"inLanguage":"pt-BR"', false);

        // The same slug under the en route must not resolve to the pt post.
        $this->get('/blog/'.$post->slug)->assertNotFound();
    }

    public function test_hreflang_links_paired_translations(): void
    {
        $en = BlogPost::factory()->published()->create([
            'locale' => 'en', 'translation_key' => 'carousel-ai', 'slug' => 'ai-carousel-generator',
        ]);
        $pt = BlogPost::factory()->published()->create([
            'locale' => 'pt-BR', 'translation_key' => 'carousel-ai', 'slug' => 'gerador-de-carrossel-com-ia',
        ]);

        $this->get($en->url())
            ->assertOk()
            ->assertSee('<link rel="alternate" hreflang="en" href="'.$en->url().'">', false)
            ->assertSee('<link rel="alternate" hreflang="pt-BR" href="'.$pt->url().'">', false)
            ->assertSee('<link rel="alternate" hreflang="x-default" href="'.$en->url().'">', false);
    }

    public function test_pt_index_lists_only_pt_posts(): void
    {
        BlogPost::factory()->published()->create(['locale' => 'pt-BR', 'title' => 'Post em portugues']);
        BlogPost::factory()->published()->create(['locale' => 'en', 'title' => 'English only post']);

        $this->get('/pt/blog')
            ->assertOk()
            ->assertSee('<html lang="pt-BR">', false)
            ->assertSee('Post em portugues')
            ->assertDontSee('English only post');
    }

    public function test_sitemap_lists_pt_urls_with_alternates(): void
    {
        $en = BlogPost::factory()->published()->create([
            'locale' => 'en', 'translation_key' => 'ideas', 'slug' => 'carousel-ideas',
        ]);
        $pt = BlogPost::factory()->published()->create([
            'locale' => 'pt-BR', 'translation_key' => 'ideas', 'slug' => 'ideias-de-carrossel',
        ]);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee('<loc>'.$pt->url().'</loc>', false)
            ->assertSee('<loc>'.BlogPost::blogIndexUrl('pt-BR').'</loc>', false)
            ->assertSee('<xhtml:link rel="alternate" hreflang="pt-BR" href="'.$pt->url().'"/>', false);
    }

    public function test_markdown_version_is_served_for_both_locales(): void
    {
        BlogPost::factory()->published()->create([
            'locale' => 'en', 'slug' => 'ai-carousel-generator',
            'title' => 'AI carousel generator', 'body' => "## How it works\n\nType a topic.",
        ]);
        BlogPost::factory()->published()->create([
            'locale' => 'pt-BR', 'slug' => 'gerador-de-carrossel-com-ia',
            'title' => 'Gerador de carrossel com IA', 'body' => "## Como funciona\n\nDigite um tema.",
        ]);

        $this->get('/blog/ai-carousel-generator.md')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=UTF-8')
            ->assertSee('# AI carousel generator', false)
            ->assertSee('## How it works', false);

        $this->get('/pt/blog/gerador-de-carrossel-com-ia.md')
            ->assertOk()
            ->assertSee('# Gerador de carrossel com IA', false);
    }

    public function test_markdown_version_returns_404_for_a_draft(): void
    {
        $draft = BlogPost::factory()->draft()->create(['slug' => 'secret-draft']);

        $this->get('/blog/secret-draft.md')->assertNotFound();
    }

    public function test_show_links_to_the_markdown_version(): void
    {
        $post = BlogPost::factory()->published()->create(['slug' => 'carousel-guide']);

        $this->get($post->url())
            ->assertSee('<link rel="alternate" type="text/markdown" href="'.$post->markdownUrl().'">', false);
    }

    public function test_indexnow_key_file_is_served_only_when_configured(): void
    {
        $this->get('/abcdef12345678.txt')->assertNotFound();

        config(['services.indexnow.key' => 'abcdef12345678']);

        $this->get('/abcdef12345678.txt')->assertOk()->assertSee('abcdef12345678');
        $this->get('/wrongkey9999999.txt')->assertNotFound();
    }
}
