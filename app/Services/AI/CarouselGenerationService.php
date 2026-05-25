<?php

namespace App\Services\AI;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CarouselGenerationService
{
    public function generateSlides(string $topic, string $style, int $slideCount, bool $wordHighlight = true): StreamedResponse
    {
        $highlightFields = $wordHighlight ? <<<'FIELDS'
- highlightWords: array containing exactly 1 single impactful word from the title to highlight. Never return more than one item. Do not return phrases. Example: ["Claude"]
- highlightColor: vivid hex color for the highlighted word that stays readable on dark backgrounds. Never use near-black, deep navy, charcoal, or other dark muted colors. Prefer bright accent colors like "#FFD84D", "#E8440A", "#FF5A36", or "#39FF14".
FIELDS : '';

        $systemPrompt = <<<PROMPT
You are a social media carousel designer. Generate slide content for an Instagram carousel.
Respond ONLY with one JSON object per line (NDJSON). Each line must be valid JSON with exactly these keys:
- title: short headline (max 8 words)
- subtitle: supporting subheadline (max 12 words)
- description: substantive body text that deepens understanding. Slide 1 must be a viral hook with fewer words, high tension, and immediate curiosity (18-28 words max). It should feel punchy, memorable, and emotionally charged, not explanatory. Middle slides develop the argument with specific facts, examples, or data (55-70 words each). The last slide MUST be a short soft CTA: direct the reader to take a specific action (follow, save, share, comment, DM, etc.) Every description must feel complete and informative — never vague or generic.
- imagePrompt: image generation prompt for a background image that fits the slide content (max 60 words)
{$highlightFields}- stat: (optional) a single hero number or statistic to display prominently on that slide, e.g. "$150B", "90%", "3 out of 4". Only include when the slide contains a genuinely dramatic number worth calling out. Omit entirely if there is no strong stat.
- ctaPill: (optional) short pill button text for a visual CTA badge (2–5 words, uppercase, with arrow). Use on slide 1 and sparingly on 1–2 middle slides. Examples: "HERE'S WHY →", "SWIPE →", "THE THING IS →". Omit on most slides.

Style: {$style}
Number of slides: {$slideCount}

Additional rule for slide 1: prioritize virality over completeness. Use a bold claim, sharp contrast, surprising number, or emotionally loaded tension. Avoid setup, context, throat-clearing, or too much explanation on the first slide. Always include a ctaPill on slide 1 (e.g. "SWIPE →" or "HERE'S WHY →").

MANDATORY rule for the LAST slide (slide {$slideCount}): This slide MUST be a CTA (call-to-action). The title must contain a direct imperative verb ("Follow", "Save", "Share", "Comment", "DM", "Click", "Subscribe", etc.). The description must tell the reader exactly what to do next and why — a clear, urgent, emotionally compelling action step. Never end with a summary, reflection, or conclusion — always end with a CTA that drives engagement.

Output exactly {$slideCount} lines. No extra text, no markdown, no code blocks. Just raw NDJSON lines.
PROMPT;

        // \Log::error(print_r($systemPrompt, true));
        return Prism::text()
            ->using(Provider::DeepSeek, 'deepseek-chat')
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
            ->withProviderOptions(['size' => '1024x1024', 'quality' => 'medium'])
            ->withClientOptions(['timeout' => 120])
            ->generate();

        $image = $response->firstImage();

        if (! $image) {
            throw new \RuntimeException('Image generation failed: no image in response');
        }

        if ($image->base64) {
            $base64 = $image->base64;

            if (str_starts_with($base64, 'data:image')) {
                return $base64;
            }

            return 'data:image/png;base64,'.$base64;
        }

        if ($image->url) {
            $imageData = file_get_contents($image->url);

            if ($imageData === false) {
                throw new \RuntimeException('Image generation failed: could not fetch image URL');
            }

            return 'data:image/png;base64,'.base64_encode($imageData);
        }

        throw new \RuntimeException('Image generation failed: no base64 or URL in response');
    }
}
