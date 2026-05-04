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
- description: substantive body text that deepens understanding. Slide 1 is the hook (40-50 words). Middle slides develop the argument with specific facts, examples, or data (55-70 words each). The last slide is a strong call-to-action or conclusion (40-50 words). Every description must feel complete and informative — never vague or generic.
- imagePrompt: image generation prompt for a background image that fits the slide content (max 60 words)
- highlightWords: array of 1-3 short words or phrases from the title that should be visually highlighted (bold accent color). Pick the most impactful words. Example: ["Claude", "melhor"]
- highlightColor: hex color for the highlighted words that contrasts well with the slide style. Example: "#E8440A" for dark slides, "#FFD600" for image-heavy slides, "#FF3B30" for light slides.

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

        $base64 = $image->base64;

        if (str_starts_with($base64, 'data:image')) {
            return $base64;
        }

        return 'data:image/png;base64,'.$base64;
    }
}
