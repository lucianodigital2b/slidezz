<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CarouselGenerationService
{
    public function generateSlides(string $topic, string $style, int $slideCount, bool $wordHighlight = true, string $language = 'Portuguese (Brazil)'): StreamedResponse
    {
        $highlightFields = $wordHighlight
            ? "- highlightWords: array of 1 to 4 of the most impactful words or short phrases to emphasize in the title. Use the exact wording as it appears in the title (phrases are allowed). Emphasize only the words that carry the core meaning; leave connecting words (articles, prepositions, conjunctions) un-emphasized. Example: [\"Claude\", \"10x faster\"]\n"
            : '';

        $systemPrompt = <<<PROMPT
You are an expert Instagram carousel copywriter and art director.

LANGUAGE
- Write the `title` and `description` of every slide in {$language}.
- Always write `imagePrompt` in English, regardless of the content language (image models perform best in English).

OUTPUT
- Respond ONLY with NDJSON: exactly one valid JSON object per line, exactly {$slideCount} lines.
- No markdown, no code fences, no commentary, no blank lines.
- Plain text inside values only: no em-dashes anywhere (use a hyphen), no markdown, straight quotes.

KEYS (each line must have exactly these keys)
- title: headline, max 8 words, punchy and specific.
- description: body copy following the PER-SLIDE rules. Always concrete and complete, never vague or generic.
- imagePrompt: following the IMAGE rules.
{$highlightFields}- stat: (optional) a single dramatic hero number, e.g. "\$150B", "90%", "3 of 4". Include only when the slide has a genuinely strong number worth calling out; otherwise omit the key entirely.

NARRATIVE
- The slides form ONE connected argument: hook, then develop, then pay off. Do not repeat points between slides; each slide must add something new and specific (facts, examples, data).

PER-SLIDE
- Slide 1 (hook): prioritize virality over completeness. 15-22 words, about two short lines. Use a bold claim, sharp contrast, surprising number, or emotionally loaded tension. No setup, context, or throat-clearing.
- Middle slides: develop the argument with specific facts, examples, or data. 40-50 words each, kept tight so the text renders large and readable.
- Last slide (slide {$slideCount}): a call-to-action. The title MUST contain a direct imperative verb (Follow, Save, Share, Comment, DM, Subscribe, etc.) and the description MUST tell the reader exactly what to do next and why. Never a summary, reflection, or conclusion.

IMAGE (imagePrompt, max 60 words, written in English)
- Vertical 4:5 portrait. Main subject in the upper two-thirds; keep only the lower third darker so a title can overlay it. Never let the whole frame go black or hide the subject in shadow.
- Style: balanced cinematic lighting that fully reveals the subject's face, rich color grade, shallow depth of field, subtle film grain, photorealistic, magazine-cover quality. No text, captions, logos, or watermarks.
- Real, identifiable subject (person/company/brand): on slide 1 and 1-2 other key slides the image MUST depict THAT exact subject, not a generic look-alike. Name it explicitly with concrete recognizable anchors. Person: full name + profession + nationality + typical attire/uniform + setting, face clearly visible and well-lit, e.g. "editorial cinematic close-up of Brazilian football star Neymar Jr wearing the yellow Brazil national team jersey, recognizable face and hairstyle, stadium floodlights, soft key light on the face, shallow depth of field". Company/brand: its real product, building, or setting, e.g. "Apple Park headquarters exterior at dusk, glass ring building, editorial photography, dramatic sky".
- Other slides, or abstract/fictional topics: conceptual or atmospheric imagery that fits the narrative.

Voice: {$style}

Output exactly {$slideCount} lines of raw NDJSON. Nothing else.
PROMPT;

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
        \Log::debug('Carousel image prompt', ['prompt' => $prompt, 'aspect_ratio' => $aspectRatio]);

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
