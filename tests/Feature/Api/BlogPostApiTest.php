<?php

namespace Tests\Feature\Api;

use App\Jobs\SubmitToIndexNow;
use App\Models\BlogPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogPostApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.blog.editor_emails' => ['editor@slidezz.app'],
            'filesystems.media_disk' => 'public',
        ]);
        Storage::fake('public');
    }

    public function test_requires_a_token(): void
    {
        $this->getJson('/api/blog/posts')->assertUnauthorized();
    }

    public function test_non_editors_are_forbidden(): void
    {
        Sanctum::actingAs(User::factory()->create(['email' => 'someone@example.com']), ['*']);

        $this->getJson('/api/blog/posts')->assertForbidden();
        $this->postJson('/api/blog/posts', $this->payload())->assertForbidden();
    }

    public function test_creates_a_draft_by_default(): void
    {
        $this->actingAsEditor(['blog:write']);

        $this->postJson('/api/blog/posts', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.is_live', false)
            ->assertJsonPath('data.published_at', null)
            ->assertJsonPath('data.locale', 'en')
            ->assertJsonPath('data.url', url('/blog/instagram-carousel-ideas'))
            ->assertJsonStructure(['data' => ['preview_url', 'body_html', 'structured_data', 'word_count']]);
    }

    public function test_publishing_needs_the_publish_ability(): void
    {
        $this->actingAsEditor(['blog:write']);

        $this->postJson('/api/blog/posts', $this->payload(['status' => 'published']))
            ->assertForbidden()
            ->assertJsonPath('message', 'This token cannot publish. Save as draft or use a token with the blog:publish ability.');

        $this->assertDatabaseCount('blog_posts', 0);
    }

    public function test_a_publish_token_publishes_and_sets_the_date(): void
    {
        $this->actingAsEditor(['blog:write', 'blog:publish']);

        $this->postJson('/api/blog/posts', $this->payload(['status' => 'published']))
            ->assertCreated()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.is_live', true);

        $this->assertNotNull(BlogPost::first()->published_at);
        $this->get('/blog/instagram-carousel-ideas')->assertOk();
    }

    public function test_slug_is_unique_per_locale(): void
    {
        $this->actingAsEditor();
        BlogPost::factory()->create(['slug' => 'instagram-carousel-ideas']);

        $this->postJson('/api/blog/posts', $this->payload())->assertJsonValidationErrors('slug');
        $this->postJson('/api/blog/posts', $this->payload(['locale' => 'pt-BR']))->assertCreated();
        $this->postJson('/api/blog/posts', $this->payload(['slug' => 'Bad Slug']))->assertJsonValidationErrors('slug');
    }

    public function test_update_only_touches_sent_fields(): void
    {
        $this->actingAsEditor();
        $post = BlogPost::factory()->create(['title' => 'Original title', 'body' => 'Original body']);

        $this->patchJson("/api/blog/posts/{$post->id}", ['meta_description' => 'New description'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Original title')
            ->assertJsonPath('data.body', 'Original body')
            ->assertJsonPath('data.meta_description', 'New description');
    }

    public function test_changing_a_live_slug_needs_confirmation(): void
    {
        $this->actingAsEditor();
        $post = BlogPost::factory()->published()->create(['slug' => 'old-slug']);

        $this->patchJson("/api/blog/posts/{$post->id}", ['slug' => 'new-slug'])->assertJsonValidationErrors('slug');
        $this->assertSame('old-slug', $post->refresh()->slug);

        $this->patchJson("/api/blog/posts/{$post->id}", ['slug' => 'new-slug', 'confirm_slug_change' => true])
            ->assertOk()
            ->assertJsonPath('data.slug', 'new-slug');
    }

    public function test_draft_slug_can_change_freely(): void
    {
        $this->actingAsEditor();
        $post = BlogPost::factory()->draft()->create(['slug' => 'old-slug']);

        $this->patchJson("/api/blog/posts/{$post->id}", ['slug' => 'new-slug'])->assertOk();
    }

    public function test_readback_includes_rendered_html_and_schema(): void
    {
        $this->actingAsEditor();
        $post = BlogPost::factory()->create([
            'body' => "## Step one\n\nDo it.",
            'faqs' => [['question' => 'Is it fast?', 'answer' => 'Yes.']],
            'json_ld' => [['@type' => 'HowTo', 'name' => 'Make a carousel'], ['@type' => 'FAQPage']],
        ]);

        $response = $this->getJson("/api/blog/posts/{$post->id}")->assertOk();

        $this->assertStringContainsString('<h2>Step one</h2>', $response->json('data.body_html'));
        $this->assertSame(
            ['BlogPosting', 'BreadcrumbList', 'FAQPage', 'HowTo'],
            array_column($response->json('data.structured_data'), '@type'),
        );
    }

    public function test_index_returns_compact_rows_for_the_inventory(): void
    {
        $this->actingAsEditor();
        BlogPost::factory()->published()->create();
        BlogPost::factory()->draft()->create();

        $this->getJson('/api/blog/posts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['id', 'locale', 'slug', 'title', 'status', 'published_at', 'updated_at', 'url', 'primary_keyword', 'task_ref']]]);

        $this->getJson('/api/blog/posts?status=draft')->assertJsonCount(1, 'data');
    }

    public function test_schema_describes_the_content_model(): void
    {
        $this->actingAsEditor();

        $this->getJson('/api/blog/schema')
            ->assertOk()
            ->assertJsonPath('data.body_format', 'markdown-gfm')
            ->assertJsonPath('data.default_status', 'draft');
    }

    public function test_uploads_an_image(): void
    {
        $this->actingAsEditor();

        $response = $this->post('/api/blog/images', [
            'image' => UploadedFile::fake()->image('hero.jpg', 1200, 630),
            'alt' => 'A carousel on a phone',
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.width', 1200)
            ->assertJsonPath('data.height', 630)
            ->assertJsonPath('data.alt', 'A carousel on a phone');

        Storage::disk('public')->assertExists($response->json('data.path'));
    }

    public function test_publishing_pings_indexnow_when_a_key_is_set(): void
    {
        config(['services.indexnow.key' => 'test-indexnow-key-123456']);
        Queue::fake();
        $this->actingAsEditor(['blog:write', 'blog:publish']);

        $this->postJson('/api/blog/posts', $this->payload(['status' => 'published']))->assertCreated();

        Queue::assertPushed(
            SubmitToIndexNow::class,
            fn (SubmitToIndexNow $job): bool => in_array(url('/blog/instagram-carousel-ideas'), $job->urls, true),
        );
    }

    public function test_a_draft_does_not_ping_indexnow(): void
    {
        config(['services.indexnow.key' => 'test-indexnow-key-123456']);
        Queue::fake();
        $this->actingAsEditor(['blog:write']);

        $this->postJson('/api/blog/posts', $this->payload())->assertCreated();

        Queue::assertNothingPushed();
    }

    /**
     * @param  list<string>  $abilities
     */
    private function actingAsEditor(array $abilities = ['*']): User
    {
        $editor = User::factory()->create(['email' => 'Editor@Slidezz.app']);
        Sanctum::actingAs($editor, $abilities);

        return $editor;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'slug' => 'instagram-carousel-ideas',
            'title' => '25 Instagram carousel ideas that get saved',
            'meta_description' => 'Carousel ideas for coaches and consultants, with examples.',
            'body' => "## The short answer\n\nPick one problem per carousel.",
            ...$overrides,
        ];
    }
}
