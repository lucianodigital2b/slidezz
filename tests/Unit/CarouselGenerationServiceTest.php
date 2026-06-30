<?php

namespace Tests\Unit;

use App\Services\AI\CarouselGenerationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\ImageResponseFake;
use Prism\Prism\Testing\TextResponseFake;
use Prism\Prism\ValueObjects\GeneratedImage;
use Tests\TestCase;

class CarouselGenerationServiceTest extends TestCase
{
    private CarouselGenerationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CarouselGenerationService;
        config(['services.unsplash.access_key' => 'test-access-key']);
        config(['services.carousel_image.driver' => 'unsplash']);
    }

    // ─── buildStyle ──────────────────────────────────────────────────────────

    public function test_build_style_combines_known_template_and_archetype(): void
    {
        $style = $this->service->buildStyle('noir-manifesto', 'disruptor-social');

        $this->assertStringContainsString('cinematic', $style);
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

        $this->assertStringContainsString('investigative', $style);
        $this->assertStringContainsString('unknown-archetype', $style);
    }

    public function test_build_style_formats_as_template_then_hook_archetype(): void
    {
        $style = $this->service->buildStyle('twitter-x', 'paradoxo-social');

        $this->assertMatchesRegularExpression('/^.+\. Hook archetype: .+\.$/', $style);
    }

    // ─── generateSlides ──────────────────────────────────────────────────────

    public function test_generate_slides_returns_ndjson_text_from_the_primary_provider(): void
    {
        Prism::fake([TextResponseFake::make()->withText('{"title":"Test","imagePrompt":"x"}')]);

        $result = $this->service->generateSlides('marketing tips', 'modern and professional', 3);

        $this->assertIsString($result);
        $this->assertStringContainsString('"title":"Test"', $result);
    }

    public function test_generate_slides_composes_structured_image_into_a_flat_image_prompt(): void
    {
        $line = json_encode([
            'title' => 'T',
            'description' => 'D',
            'image' => [
                'main_description' => 'A scientist at a lab bench',
                'subjects' => [[
                    'identity' => 'Marie Curie',
                    'appearance' => 'focused expression',
                    'attire' => 'white lab coat',
                    'pose' => 'holding a glass vial',
                    'placement' => 'center frame, medium shot',
                ]],
                'environment' => [
                    'scene' => 'laboratory',
                    'elements' => ['microscope: brass', 'shelves: glass bottles'],
                ],
            ],
        ]);

        Prism::fake([TextResponseFake::make()->withText($line)]);

        $result = $this->service->generateSlides('Marie Curie', 'serious', 1, true, 'English', 'documentary');

        // Structured object is flattened away into a single string prompt.
        $this->assertStringNotContainsString('"image":', $result);
        $this->assertStringContainsString('"imagePrompt":', $result);

        $decoded = json_decode($result, true);
        $prompt = $decoded['imagePrompt'];

        // Variable scene content survives...
        $this->assertStringContainsString('Marie Curie', $prompt);
        $this->assertStringContainsString('Setting: laboratory', $prompt);
        $this->assertStringContainsString('glass bottles', $prompt);
        // ...and the template's fixed aesthetics + shared constraints are pinned on.
        $this->assertStringContainsString('documentary photography on film', $prompt);
        $this->assertStringContainsString('no text, captions, logos, or watermarks', $prompt);
    }

    public function test_image_style_overrides_the_template_aesthetics(): void
    {
        $line = json_encode([
            'title' => 'T',
            'description' => 'D',
            'image' => [
                'main_description' => 'A scientist at a lab bench',
                'subjects' => [['identity' => 'Marie Curie', 'placement' => 'center frame']],
                'environment' => ['scene' => 'laboratory', 'elements' => []],
            ],
        ]);

        Prism::fake([TextResponseFake::make()->withText($line)]);

        $result = $this->service->generateSlides('Marie Curie', 'serious', 1, true, 'English', 'pop-magazine', 'black and white watercolor illustration');

        $prompt = json_decode($result, true)['imagePrompt'];

        // The user's look wins...
        $this->assertStringContainsString('black and white watercolor illustration', $prompt);
        // ...replacing the template's art direction...
        $this->assertStringNotContainsString('high-saturation', $prompt);
        $this->assertStringNotContainsString('Bright punchy pop', $prompt);
        // ...while scene content and the universal constraints remain.
        $this->assertStringContainsString('Marie Curie', $prompt);
        $this->assertStringContainsString('no text, captions, logos, or watermarks', $prompt);
    }

    public function test_generate_slides_pins_aesthetics_onto_a_plain_image_prompt_fallback(): void
    {
        Prism::fake([TextResponseFake::make()->withText('{"title":"T","imagePrompt":"a red bicycle"}')]);

        $result = $this->service->generateSlides('bikes', 'fun', 1, true, 'English', 'pop-magazine');

        $decoded = json_decode($result, true);

        $this->assertStringContainsString('a red bicycle', $decoded['imagePrompt']);
        $this->assertStringContainsString('high-saturation', $decoded['imagePrompt']);
        $this->assertStringContainsString('no text, captions, logos, or watermarks', $decoded['imagePrompt']);
    }

    // ─── generateIdeas ────────────────────────────────────────────────────────

    public function test_generate_ideas_parses_a_json_array(): void
    {
        Prism::fake([
            TextResponseFake::make()->withText('[{"title":"Ideia A","angle":"mito_verdade"},{"title":"Ideia B","angle":"pergunta_frequente"},{"title":"Ideia C","angle":"comparacao_metodos"}]'),
        ]);

        $ideas = $this->service->generateIdeas(['brand_name' => 'Acme']);

        $this->assertCount(3, $ideas);
        $this->assertSame('Ideia A', $ideas[0]['title']);
        $this->assertSame('mito_verdade', $ideas[0]['angle']);
    }

    public function test_generate_ideas_tolerates_code_fences_and_prose(): void
    {
        Prism::fake([
            TextResponseFake::make()->withText("Sure!\n```json\n[{\"title\":\"X\",\"angle\":\"erro_comum\"}]\n```"),
        ]);

        $ideas = $this->service->generateIdeas(['brand_name' => 'Acme']);

        $this->assertCount(1, $ideas);
        $this->assertSame('X', $ideas[0]['title']);
    }

    public function test_generate_ideas_caps_to_three_skips_empty_and_defaults_angle(): void
    {
        Prism::fake([
            TextResponseFake::make()->withText('[{"title":"1"},{"title":""},{"title":"2"},{"title":"3"},{"title":"4"}]'),
        ]);

        $ideas = $this->service->generateIdeas(['brand_name' => 'Acme']);

        $this->assertCount(3, $ideas);
        $this->assertSame(['1', '2', '3'], array_column($ideas, 'title'));
        $this->assertSame('ideia', $ideas[0]['angle']);
    }

    public function test_generate_ideas_throws_without_a_json_array(): void
    {
        Prism::fake([TextResponseFake::make()->withText('no json here')]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Idea generation failed');

        $this->service->generateIdeas(['brand_name' => 'Acme']);
    }

    // ─── generateImage (Unsplash) ─────────────────────────────────────────────

    public function test_generate_image_returns_base64_data_uri(): void
    {
        Http::fake([
            'api.unsplash.com/*' => Http::response([
                'results' => [
                    ['urls' => ['regular' => 'https://images.unsplash.com/photo-1.jpg']],
                ],
            ]),
            'images.unsplash.com/*' => Http::response('binary-image-bytes', 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $result = $this->service->generateImage('a scenic mountain landscape');

        $this->assertEquals(
            'data:image/jpeg;base64,'.base64_encode('binary-image-bytes'),
            $result,
        );
    }

    public function test_generate_image_throws_when_no_results_found(): void
    {
        Http::fake([
            'api.unsplash.com/*' => Http::response(['results' => []]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Image generation failed');

        $this->service->generateImage('a scenic mountain landscape');
    }

    public function test_generate_image_throws_when_access_key_is_missing(): void
    {
        config(['services.unsplash.access_key' => null]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Image generation failed');

        $this->service->generateImage('a scenic mountain landscape');
    }

    public function test_generate_image_sends_prompt_as_unsplash_query(): void
    {
        Http::fake([
            'api.unsplash.com/*' => Http::response([
                'results' => [
                    ['urls' => ['regular' => 'https://images.unsplash.com/photo-1.jpg']],
                ],
            ]),
            'images.unsplash.com/*' => Http::response('img', 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $this->service->generateImage('bright neon city at night');

        Http::assertSent(function (Request $request) {
            return str_starts_with($request->url(), 'https://api.unsplash.com/search/photos')
                && ($request->data()['query'] ?? null) === 'bright neon city at night';
        });
    }

    // ─── generateImage (OpenAI driver via config switch) ──────────────────────

    public function test_generate_image_uses_openai_when_driver_is_openai(): void
    {
        config(['services.carousel_image.driver' => 'openai']);

        $fake = Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(base64: 'abc123def456'),
            ]),
        ]);

        $result = $this->service->generateImage('a scenic mountain landscape');

        $this->assertEquals('data:image/png;base64,abc123def456', $result);
        $fake->assertPrompt('a scenic mountain landscape');
    }

    public function test_generate_image_with_openai_throws_when_no_image_data(): void
    {
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage,
            ]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Image generation failed');

        $this->service->generateImageWithOpenAi('a scenic mountain landscape');
    }

    // ─── generateImage (Gemini driver) ────────────────────────────────────────

    public function test_generate_image_uses_gemini_when_driver_is_gemini(): void
    {
        config(['services.carousel_image.driver' => 'gemini']);

        $fake = Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(base64: 'geminibytes', mimeType: 'image/png'),
            ]),
        ]);

        $result = $this->service->generateImage('cinematic portrait of an athlete');

        $this->assertEquals('data:image/png;base64,geminibytes', $result);
        $fake->assertPrompt('cinematic portrait of an athlete');
    }

    public function test_generate_image_with_gemini_uses_returned_mime_type(): void
    {
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage(base64: 'jpegbytes', mimeType: 'image/jpeg'),
            ]),
        ]);

        $result = $this->service->generateImageWithGemini('a neon city skyline', '9:16');

        $this->assertEquals('data:image/jpeg;base64,jpegbytes', $result);
    }

    public function test_generate_image_with_gemini_throws_when_no_image_data(): void
    {
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage,
            ]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Image generation failed');

        $this->service->generateImageWithGemini('a scenic mountain landscape');
    }

    // ─── generateImage (Unsplash failsafe) ────────────────────────────────────

    public function test_generate_image_falls_back_to_unsplash_when_gemini_fails(): void
    {
        config(['services.carousel_image.driver' => 'gemini']);

        // Gemini returns no usable image, so generateImageWithGemini throws.
        Prism::fake([
            ImageResponseFake::make()->withImages([
                new GeneratedImage,
            ]),
        ]);

        // The failsafe pulls a stock photo from Unsplash instead.
        Http::fake([
            'api.unsplash.com/*' => Http::response([
                'results' => [
                    ['urls' => ['regular' => 'https://images.unsplash.com/photo-1.jpg']],
                ],
            ]),
            'images.unsplash.com/*' => Http::response('fallback-bytes', 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $result = $this->service->generateImage('cinematic portrait of an athlete');

        $this->assertEquals(
            'data:image/jpeg;base64,'.base64_encode('fallback-bytes'),
            $result,
        );
    }
}
