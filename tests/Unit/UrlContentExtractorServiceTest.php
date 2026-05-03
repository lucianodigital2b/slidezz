<?php

namespace Tests\Unit;

use App\Services\AI\UrlContentExtractorService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\TextResponseFake;
use Tests\TestCase;

class UrlContentExtractorServiceTest extends TestCase
{
    private UrlContentExtractorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new UrlContentExtractorService;
    }

    // ─── youtube ─────────────────────────────────────────────────────────────

    public function test_extract_youtube_returns_title_topic_and_channel_description(): void
    {
        Http::fake([
            'www.youtube.com/oembed*' => Http::response([
                'title' => 'How to Code in PHP',
                'author_name' => 'Dev Channel',
            ]),
        ]);

        $result = $this->service->extract('https://youtube.com/watch?v=abc', 'youtube');

        $this->assertEquals('How to Code in PHP', $result['title']);
        $this->assertEquals('How to Code in PHP', $result['topic']);
        $this->assertEquals('Canal: Dev Channel', $result['description']);
    }

    public function test_extract_youtube_returns_empty_description_when_no_author(): void
    {
        Http::fake([
            'www.youtube.com/oembed*' => Http::response(['title' => 'My Video']),
        ]);

        $result = $this->service->extract('https://youtube.com/watch?v=abc', 'youtube');

        $this->assertEquals('', $result['description']);
    }

    public function test_extract_youtube_throws_when_request_fails(): void
    {
        Http::fake([
            'www.youtube.com/oembed*' => function () {
                throw new ConnectionException('Connection refused');
            },
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Não foi possível acessar o vídeo do YouTube.');

        $this->service->extract('https://youtube.com/watch?v=abc', 'youtube');
    }

    // ─── instagram ───────────────────────────────────────────────────────────

    public function test_extract_instagram_throws_runtime_exception_with_guidance_message(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Instagram não suporta extração automática. Copie o texto do post e cole no campo descrição.');

        $this->service->extract('https://instagram.com/p/abc123/', 'instagram');
    }

    // ─── blog ────────────────────────────────────────────────────────────────

    public function test_extract_blog_returns_ai_parsed_data(): void
    {
        Http::fake([
            'example.com*' => Http::response(
                '<html><head><title>Raw Title</title><meta name="description" content="raw meta"></head><body>article text</body></html>'
            ),
        ]);

        Prism::fake([
            TextResponseFake::make()->withText('{"title":"AI Title","description":"AI Description","topic":"AI Topic"}'),
        ]);

        $result = $this->service->extract('https://example.com/article', 'blog');

        $this->assertEquals('AI Title', $result['title']);
        $this->assertEquals('AI Description', $result['description']);
        $this->assertEquals('AI Topic', $result['topic']);
    }

    public function test_extract_blog_falls_back_to_html_metadata_when_ai_returns_invalid_json(): void
    {
        Http::fake([
            'example.com*' => Http::response(
                '<html><head><title>My Blog Post</title><meta name="description" content="Meta description here"></head><body>content</body></html>'
            ),
        ]);

        Prism::fake([
            TextResponseFake::make()->withText('not valid json at all'),
        ]);

        $result = $this->service->extract('https://example.com/post', 'blog');

        $this->assertEquals('My Blog Post', $result['title']);
        $this->assertEquals('Meta description here', $result['description']);
        $this->assertStringContainsString('My Blog Post', $result['topic']);
    }

    public function test_extract_blog_falls_back_to_html_metadata_when_ai_returns_empty_string(): void
    {
        Http::fake([
            'example.com*' => Http::response(
                '<html><head><title>Fallback Title</title><meta name="description" content="Fallback Desc"></head><body>content</body></html>'
            ),
        ]);

        Prism::fake([TextResponseFake::make()->withText('')]);

        $result = $this->service->extract('https://example.com/post', 'blog');

        $this->assertEquals('Fallback Title', $result['title']);
    }

    public function test_extract_blog_throws_when_page_cannot_be_fetched(): void
    {
        Http::fake([
            'example.com*' => function () {
                throw new ConnectionException('Timeout');
            },
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Não foi possível acessar a URL informada.');

        $this->service->extract('https://example.com/article', 'blog');
    }

    // ─── unknown type ────────────────────────────────────────────────────────

    public function test_extract_with_unknown_type_throws_invalid_argument_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->service->extract('https://example.com', 'tiktok');
    }
}
