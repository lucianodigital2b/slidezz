<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CarouselGenerationController extends Controller
{
    public function generate(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'style' => ['nullable', 'string', 'max:200'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:10'],
        ]);

        $topic = $validated['topic'];
        $style = $validated['style'] ?? 'modern and professional';
        $slideCount = $validated['slide_count'] ?? 5;

        $systemPrompt = <<<PROMPT
You are a social media carousel designer. Generate slide content for an Instagram carousel.
Respond ONLY with one JSON object per line (NDJSON). Each line must be valid JSON with exactly these keys:
- title: short headline (max 8 words)
- subtitle: supporting subheadline (max 12 words)
- description: body text (max 30 words)
- imagePrompt: detailed image generation prompt for a background image that fits the slide content

Style: {$style}
Number of slides: {$slideCount}

Output exactly {$slideCount} lines. No extra text, no markdown, no code blocks. Just raw NDJSON lines.
PROMPT;

        return Prism::text()
            ->using(Provider::OpenAI, 'gpt-4o-mini')
            ->withSystemPrompt($systemPrompt)
            ->withPrompt("Create a {$slideCount}-slide Instagram carousel about: {$topic}")
            ->asEventStreamResponse();
    }

    public function generateImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:1000'],
        ]);

        $response = Prism::image()
            ->using(Provider::OpenAI, 'gpt-image-1')
            ->withPrompt($validated['prompt'])
            ->withProviderOptions(['size' => '1024x1024', 'output_format' => 'png'])
            ->generate();

        $image = $response->firstImage();

        if (! $image || ! $image->base64) {
            return response()->json(['error' => 'Image generation failed'], 500);
        }

        return response()->json([
            'base64' => 'data:image/png;base64,'.$image->base64,
        ]);
    }
}
