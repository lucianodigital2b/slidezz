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
}
