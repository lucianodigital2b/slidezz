<?php

namespace Tests\Unit;

use App\Services\AI\CarouselGenerationService;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\ImageResponseFake;
use Prism\Prism\Testing\TextResponseFake;
use Prism\Prism\ValueObjects\GeneratedImage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tests\TestCase;

class CarouselGenerationServiceTest extends TestCase
{
    private CarouselGenerationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CarouselGenerationService;
    }

    // ─── buildStyle ──────────────────────────────────────────────────────────

    public function test_build_style_combines_known_template_and_archetype(): void
    {
        $style = $this->service->buildStyle('noir-manifesto', 'disruptor-social');

        $this->assertStringContainsString('dark gradient overlay', $style);
        $this->assertStringContainsString('shocking social phenomenon', $style);
    }

    public function test_build_style_falls_back_to_raw_strings_for_unknown_keys(): void
    {
        $style = $this->service->buildStyle('my-custom-template', 'my-custom-archetype');

        $this->assertStringContainsString('my-custom-template', $style);
        $this->assertStringContainsString('my-custom-archetype', $style);
    }

    public function test_build_style_resolves_template_but_falls_back_for_unknown_archetype(): void
    {
        $style = $this->service->buildStyle('documentary', 'unknown-archetype');

        $this->assertStringContainsString('Playfair Display serif', $style);
        $this->assertStringContainsString('unknown-archetype', $style);
    }

    public function test_build_style_formats_as_template_then_hook_archetype(): void
    {
        $style = $this->service->buildStyle('twitter-x', 'paradoxo-social');

        $this->assertMatchesRegularExpression('/^.+\. Hook archetype: .+\.$/', $style);
    }

    // ─── generateSlides ──────────────────────────────────────────────────────

    public function test_generate_slides_returns_a_streamed_response(): void
    {
        Prism::fake([TextResponseFake::make()->withText('{"title":"Test"}')]);

        $response = $this->service->generateSlides('marketing tips', 'modern and professional', 3);

        $this->assertInstanceOf(StreamedResponse::class, $response);
    }

    // ─── generateImage ───────────────────────────────────────────────────────

    public function test_generate_image_returns_base64_data_uri(): void
    {
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(base64: 'abc123def456'),
            ]),
        ]);

        $result = $this->service->generateImage('a scenic mountain landscape');

        $this->assertEquals('data:image/png;base64,abc123def456', $result);
    }

    public function test_generate_image_throws_when_base64_is_missing(): void
    {
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(url: 'https://example.com/image.png'),
            ]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Image generation failed');

        $this->service->generateImage('a scenic mountain landscape');
    }

    public function test_generate_image_passes_prompt_to_prism(): void
    {
        $fake = Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(base64: 'xyz'),
            ]),
        ]);

        $this->service->generateImage('bright neon city at night');

        $fake->assertPrompt('bright neon city at night');
    }
}
