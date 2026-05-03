<?php

namespace App\Services\AI;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CarouselGenerationService
{
    public function generateSlides(string $topic, string $style, int $slideCount): StreamedResponse
    {
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

    public function buildStyle(string $template, string $archetype): string
    {
        $templates = [
            'noir-manifesto' => 'dark gradient overlay, ALL CAPS typography, documentary motivational style',
            'dark-cards' => 'dark background, full-bleed cover photo, rounded image cards on dark slides',
            'pop-magazine' => 'giant Anton typography, red highlight words, pop culture magazine maximum visual impact',
            'twitter-x' => 'white background, large bold text, clean minimal editorial style',
            'acid-brutalist' => 'black background, massive Montserrat 900, acid green accent color, outlined text',
            'documentary' => 'vintage investigative journalism aesthetic, Playfair Display serif, film grain texture',
        ];

        $archetypes = [
            'disruptor-social' => 'shocking social phenomenon that reveals a serious consequence hook',
            'poder-oculto' => 'hidden power exposé revealing why a group acts while the vulnerable suffers hook',
            'paradoxo-social' => 'counter-intuitive statement that flips conventional wisdom hook',
            'profecia-provocativa' => 'authoritative prophecy fulfilled hook, revelation that surprises everyone',
            'estrategia-inusitada' => 'unusual winning strategy used by an unexpected person or brand hook',
            'autoridade-cientifica' => 'scientific authority proves a surprising result with clear cause hook',
        ];

        $templateStyle = $templates[$template] ?? $template;
        $archetypeStyle = $archetypes[$archetype] ?? $archetype;

        return "{$templateStyle}. Hook archetype: {$archetypeStyle}.";
    }

    public function generateImage(string $prompt): string
    {
        $response = Prism::image()
            ->using(Provider::OpenAI, 'gpt-image-1')
            ->withPrompt($prompt)
            ->withProviderOptions(['size' => '1024x1024', 'output_format' => 'png'])
            ->withClientOptions(['timeout' => 120])
            ->generate();

        $image = $response->firstImage();

        if (! $image || ! $image->base64) {
            throw new \RuntimeException('Image generation failed');
        }

        return 'data:image/png;base64,'.$image->base64;
    }
}
