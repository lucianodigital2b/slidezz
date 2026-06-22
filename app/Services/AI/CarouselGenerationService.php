<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
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
- highlightGradient: array of exactly 2 vivid hex colors forming a gradient applied to the highlighted word, e.g. ["#FF5A36", "#FFD84D"] or ["#FF2D95", "#FF8A00"]. Both stops must stay bright and readable on dark backgrounds. Pick an energetic, harmonious pair (warm-to-warm or neon-to-neon). The first stop should roughly match highlightColor.
FIELDS : '';

        $systemPrompt = <<<PROMPT
You are a social media carousel designer. Generate slide content for an Instagram carousel. Zero em-dashes anywhere. Hyphen only.
Respond ONLY with one JSON object per line (NDJSON). Each line must be valid JSON with exactly these keys:
- title: short headline (max 8 words)
- description: substantive body text that deepens understanding. Slide 1 must be a viral hook with fewer words, high tension, and immediate curiosity (15-22 words max, about two short lines). It should feel punchy, memorable, and emotionally charged, not explanatory. Middle slides develop the argument with specific facts, examples, or data (55-70 words each). The last slide MUST be a short soft CTA: direct the reader to take a specific action (follow, save, share, comment, DM, etc.) Every description must feel complete and informative — never vague or generic.
- imagePrompt: cinematic background image prompt that fits the slide content (max 60 words). ALWAYS describe a vertical 4:5 portrait composition with the main subject in the upper two-thirds and the lower third left dark, empty, and unobstructed so a title can overlay it. Demand: dramatic single-source lighting, high contrast, shallow depth of field, rich color grade, subtle film grain, photorealistic, magazine-cover quality. Never put text, captions, logos, or watermarks in the image. If the topic is about a real person, company, brand, or organization: on slide 1 and 1–2 other key slides, write the prompt as a realistic close-up photographic shot of that specific subject — e.g. "cinematic close-up portrait of Elon Musk speaking on stage, dramatic rim light, shallow depth of field, dark moody lower third" or "Apple headquarters exterior at dusk, glass building, editorial photography, dramatic sky". For remaining slides use conceptual or atmospheric imagery that fits the narrative. If the topic is abstract or fictional, always use conceptual imagery.
{$highlightFields}- stat: (optional) a single hero number or statistic to display prominently on that slide, e.g. "$150B", "90%", "3 out of 4". Only include when the slide contains a genuinely dramatic number worth calling out. Omit entirely if there is no strong stat.

Style: {$style}
Number of slides: {$slideCount}

Additional rule for slide 1: prioritize virality over completeness. Use a bold claim, sharp contrast, surprising number, or emotionally loaded tension. Avoid setup, context, throat-clearing, or too much explanation on the first slide. Always include a ctaPill on slide 1 (e.g. "SWIPE →" or "HERE'S WHY →").

MANDATORY rule for the LAST slide (slide {$slideCount}): This slide MUST be a CTA (call-to-action). The title must contain a direct imperative verb ("Follow", "Save", "Share", "Comment", "DM", "Click", "Subscribe", etc.). The description must tell the reader exactly what to do next and why — a clear, urgent, emotionally compelling action step. Never end with a summary, reflection, or conclusion — always end with a CTA that drives engagement.

Output exactly {$slideCount} lines. No extra text, no markdown, no code blocks. Just raw NDJSON lines.
PROMPT;

        \Log::error(print_r($systemPrompt, true));

        return Prism::text()
            ->using(Provider::DeepSeek, 'deepseek-chat')
            ->withSystemPrompt($systemPrompt)
            ->withPrompt("Create a {$slideCount}-slide Instagram carousel about: {$topic}")
            ->asEventStreamResponse();
    }

    /**
     * Build the creative brief handed to the text model.
     *
     * This is a CONTENT brief, not a visual one: fonts, colors, and layout are
     * defined entirely by the selected template + layout code on the client, so
     * the prompt only carries the editorial voice (per template) and the hook
     * archetype. Visual-design language ("Anton typography", "red highlight",
     * etc.) is deliberately excluded — a text model cannot act on it and it only
     * pollutes the generated image prompts.
     */
    public function buildStyle(string $template, ?string $archetype): string
    {
        $tones = [
            'noir-manifesto' => 'bold, cinematic, motivational documentary voice',
            'dark-cards' => 'modern, confident, punchy voice',
            'pop-magazine' => 'high-energy, pop-culture, attention-grabbing voice',
            'twitter-x' => 'crisp, conversational, editorial voice',
            'acid-brutalist' => 'edgy, provocative, in-your-face voice',
            'documentary' => 'serious, investigative, journalistic voice',
        ];

        $archetypes = [
            'disruptor-social' => 'shocking social phenomenon that reveals a serious consequence hook',
            'poder-oculto' => 'hidden power exposé revealing why a group acts while the vulnerable suffers hook',
            'paradoxo-social' => 'counter-intuitive statement that flips conventional wisdom hook',
            'profecia-provocativa' => 'authoritative prophecy fulfilled hook, revelation that surprises everyone',
            'estrategia-inusitada' => 'unusual winning strategy used by an unexpected person or brand hook',
            'autoridade-cientifica' => 'scientific authority proves a surprising result with clear cause hook',
        ];

        $tone = $tones[$template] ?? $template;

        if (empty($archetype)) {
            return $tone;
        }

        $archetypeStyle = $archetypes[$archetype] ?? $archetype;

        return "{$tone}. Hook archetype: {$archetypeStyle}.";
    }

    /**
     * Generate a background image as a base64 data URI, dispatching to the
     * driver configured via `services.carousel_image.driver`
     * (gemini / openai / unsplash). Defaults to Gemini image generation.
     *
     * @param  string  $aspectRatio  Portrait ratio for generative drivers, e.g. "4:5" (post) or "9:16" (stories).
     */
    public function generateImage(string $prompt, string $aspectRatio = '4:5'): string
    {
        $driver = config('services.carousel_image.driver', 'gemini');

        return match ($driver) {
            'gemini', 'google' => $this->generateImageWithGemini($prompt, $aspectRatio),
            'openai', 'gpt' => $this->generateImageWithOpenAi($prompt),
            default => $this->generateImageWithUnsplash($prompt),
        };
    }

    /**
     * Generate a cinematic background image with Gemini ("nano banana") and
     * return it as a base64 data URI. Produces portrait images suited to
     * Instagram carousels, with subject-accurate results for real people/brands
     * that keyword-based stock search cannot match.
     */
    public function generateImageWithGemini(string $prompt, string $aspectRatio = '4:5'): string
    {
        $response = Prism::image()
            ->using(Provider::Gemini, 'gemini-2.5-flash-image')
            ->withPrompt($prompt)
            ->withProviderOptions(['aspect_ratio' => $aspectRatio])
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

            $mimeType = $image->mimeType ?: 'image/png';

            return 'data:'.$mimeType.';base64,'.$base64;
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

    /**
     * Fetch a background image from the Unsplash Search API and return it as a
     * base64 data URI. Cheaper alternative to paid GPT image generation.
     */
    public function generateImageWithUnsplash(string $prompt): string
    {
        $accessKey = config('services.unsplash.access_key');

        if (empty($accessKey)) {
            throw new \RuntimeException('Image generation failed: Unsplash access key not configured');
        }

        $response = Http::timeout(30)
            ->withHeaders(['Authorization' => "Client-ID {$accessKey}"])
            ->get('https://api.unsplash.com/search/photos', [
                'query' => $prompt,
                'per_page' => 1,
                'orientation' => 'squarish',
                'content_filter' => 'high',
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Image generation failed: Unsplash request failed');
        }

        $imageUrl = $response->json('results.0.urls.regular');

        if (! $imageUrl) {
            throw new \RuntimeException('Image generation failed: no image found for prompt');
        }

        $imageResponse = Http::timeout(30)->get($imageUrl);

        if ($imageResponse->failed()) {
            throw new \RuntimeException('Image generation failed: could not fetch image');
        }

        $contentType = $imageResponse->header('Content-Type') ?: 'image/jpeg';

        return 'data:'.$contentType.';base64,'.base64_encode($imageResponse->body());
    }

    /**
     * Generate a background image with OpenAI's gpt-image-1 and return it as a
     * base64 data URI.
     */
    public function generateImageWithOpenAi(string $prompt): string
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
