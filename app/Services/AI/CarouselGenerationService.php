<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

class CarouselGenerationService
{
    /**
     * Generate the carousel slides as raw NDJSON (one JSON object per line).
     *
     * Runs buffered (not streamed) so a provider timeout can be caught and
     * retried against the fallback provider in the same request.
     */
    public function generateSlides(string $topic, string $style, int $slideCount, bool $wordHighlight = true, string $language = 'Portuguese (Brazil)', string $template = '', string $imageStyle = ''): string
    {
        $highlightFields = $wordHighlight
            ? "- highlightWords: array of 1 to 4 of the most impactful words or short phrases to emphasize in the title. Use the exact wording as it appears in the title (phrases are allowed). Emphasize only the words that carry the core meaning; leave connecting words (articles, prepositions, conjunctions) un-emphasized. Example: [\"Claude\", \"10x faster\"]\n"
            : '';

        $systemPrompt = <<<PROMPT
You are an expert Instagram carousel copywriter and art director.

LANGUAGE
- Write the `title` and `description` of every slide in {$language}.
- Always write every value inside the `image` object in English (image models perform best in English).

OUTPUT
- Respond ONLY with NDJSON: exactly one valid JSON object per line, exactly {$slideCount} lines.
- No markdown, no code fences, no commentary, no blank lines.
- Plain text inside values only: no em-dashes anywhere (use a hyphen), no markdown, straight quotes.

KEYS (each line must have exactly these keys)
- title: headline, max 8 words, punchy and specific.
- description: body copy following the PER-SLIDE rules. Always concrete and complete, never vague or generic.
- image: an object describing ONLY the scene content (see IMAGE). Never describe lighting, camera, lens, color, or art style anywhere - those are fixed per template and added automatically so every slide shares one consistent look.
{$highlightFields}- stat: (optional) a single dramatic hero number, e.g. "\$150B", "90%", "3 of 4". Include only when the slide has a genuinely strong number worth calling out; otherwise omit the key entirely.

NARRATIVE
- The slides form ONE connected argument: hook, then develop, then pay off. Do not repeat points between slides; each slide must add something new and specific (facts, examples, data).

PER-SLIDE
- Slide 1 (hook): prioritize virality over completeness. 15-22 words, about two short lines. Use a bold claim, sharp contrast, surprising number, or emotionally loaded tension. No setup, context, or throat-clearing.
- Middle slides: develop the argument with specific facts, examples, or data. 40-50 words each, kept tight so the text renders large and readable.
- Last slide (slide {$slideCount}): a call-to-action. The title MUST contain a direct imperative verb (Follow, Save, Share, Comment, DM, Subscribe, etc.) and the description MUST tell the reader exactly what to do next and why. Never a summary, reflection, or conclusion.

IMAGE (the `image` object - describe scene CONTENT only, written in English)
- main_description: one vivid sentence describing the whole scene.
- subjects: array (usually exactly 1) of the people or objects in focus. Each object has:
  - identity: who or what it is. For a real, identifiable person or brand, use the full name + role + nationality (e.g. "Brazilian football star Neymar Jr"). On slide 1 and 1-2 other key slides the subject MUST be that exact real entity, with concrete recognizable anchors, not a generic look-alike.
  - appearance: recognizable physical features and the facial expression.
  - attire: clothing or uniform (empty string for non-people).
  - pose: body posture, action, or gesture.
  - placement: framing inside the portrait, e.g. "center frame, medium shot, upper body".
- environment: an object with:
  - scene: the location, e.g. "home office studio".
  - elements: array of 2 to 5 short "object: description" phrases for key background details.
- Do NOT add lighting, camera, lens, color grade, art style, aspect ratio, or text-overlay notes anywhere - those are fixed and applied automatically.
- For abstract or conceptual topics, use a single symbolic subject and a fitting environment.

Voice: {$style}

Output exactly {$slideCount} lines of raw NDJSON. Nothing else.
PROMPT;

        $ndjson = $this->runTextWithFallback(
            $systemPrompt,
            "Create a {$slideCount}-slide Instagram carousel about: {$topic}",
        );

        return $this->composeImagePrompts($ndjson, $template, $imageStyle);
    }

    /**
     * Composition rules shared by every template: framing and overlay-safety the
     * image model must always honor, regardless of the chosen aesthetic.
     */
    private const IMAGE_CONSTRAINTS = 'Vertical 4:5 portrait, the main subject framed in the upper two-thirds with the lower third kept darker and unobstructed for a text overlay, face clearly visible and well-lit, never hidden in shadow, no text, captions, logos, or watermarks';

    /**
     * The FIXED visual DNA for a template: art style, lighting, camera and grade.
     * Held in code (not asked of the text model) so every slide in a deck renders
     * with one consistent look while only the subject + environment vary.
     *
     * @return array<string, string>
     */
    private function aestheticsFor(string $template): array
    {
        $base = [
            'art_style' => 'Photorealistic cinematic editorial photography, magazine-cover quality',
            'key_light' => 'soft directional key light that fully reveals the subject face',
            'fill_light' => 'gentle fill that keeps shadows readable',
            'shadows' => 'soft shadows with depth and contrast',
            'camera_angle' => 'eye-level',
            'lens' => '50mm, shallow depth of field',
            'color_grade' => 'rich, balanced color grade',
            'grain' => 'subtle film grain',
        ];

        $byTemplate = [
            'noir-manifesto' => [
                'art_style' => 'High-contrast cinematic noir photography, dramatic chiaroscuro',
                'key_light' => 'hard directional key light carving the subject out of darkness',
                'color_grade' => 'desaturated, near-monochrome with deep blacks',
            ],
            'dark-cards' => [
                'art_style' => 'Moody cinematic editorial photography',
                'color_grade' => 'cool, dark teal-and-slate color grade',
            ],
            'pop-magazine' => [
                'art_style' => 'Bright punchy pop editorial photography',
                'key_light' => 'crisp high-key light',
                'shadows' => 'minimal, clean shadows',
                'color_grade' => 'vivid high-saturation color grade',
                'grain' => 'clean, almost no grain',
            ],
            'acid-brutalist' => [
                'art_style' => 'Bold high-contrast brutalist editorial photography',
                'key_light' => 'harsh direct light with hard edges',
                'color_grade' => 'punchy contrast with an acid-green accent',
            ],
            'documentary' => [
                'art_style' => 'Vintage investigative documentary photography on film',
                'key_light' => 'natural available light',
                'color_grade' => 'muted, warm sepia-leaning grade',
                'grain' => 'visible analog film grain',
            ],
            'ticket' => [
                'art_style' => 'Clean editorial photography with a refined, considered mood',
                'key_light' => 'soft, even daylight',
                'color_grade' => 'natural, slightly warm grade',
            ],
            'twitter-x' => [
                'art_style' => 'Clean, neutral editorial photography',
                'key_light' => 'soft even light',
                'color_grade' => 'natural, true-to-life color',
            ],
        ];

        return array_merge($base, $byTemplate[$template] ?? []);
    }

    /**
     * Rewrite each NDJSON line, turning the model's structured `image` object into
     * a final flat `imagePrompt` string by merging the variable scene content with
     * the template's fixed aesthetics. Tolerant: lines that already carry a plain
     * `imagePrompt`, or that fail to parse, are kept (the former still gets the
     * fixed look pinned to it) so the client's parser always sees usable NDJSON.
     */
    private function composeImagePrompts(string $ndjson, string $template, string $imageStyle = ''): string
    {
        $aesthetics = $this->aestheticsFor($template);
        $imageStyle = trim($imageStyle);
        $lines = preg_split('/\r\n|\r|\n/', $ndjson) ?: [];
        $out = [];

        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $decoded = json_decode(trim($line), true);

            if (! is_array($decoded)) {
                $out[] = $line; // Unparseable - pass through for the client's tolerant parser.

                continue;
            }

            if (isset($decoded['image']) && is_array($decoded['image'])) {
                $decoded['imagePrompt'] = $this->composeImagePrompt($decoded['image'], $aesthetics, $imageStyle);
                unset($decoded['image']);
            } elseif (! empty($decoded['imagePrompt']) && is_string($decoded['imagePrompt'])) {
                // Fallback: model emitted free text - still pin the resolved aesthetic.
                $decoded['imagePrompt'] = $this->joinSentences([$decoded['imagePrompt'], $this->aestheticsSentence($aesthetics, $imageStyle)]);
            }

            $out[] = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        return implode("\n", $out);
    }

    /**
     * Flatten one structured `image` object (variable scene content) plus the
     * template's fixed aesthetics into a single natural-language image prompt -
     * image models read prose far better than raw JSON.
     *
     * @param  array<string, mixed>  $image
     * @param  array<string, string>  $aesthetics
     */
    private function composeImagePrompt(array $image, array $aesthetics, string $imageStyle = ''): string
    {
        $parts = [];

        $parts[] = (string) ($image['main_description'] ?? '');

        foreach ((array) ($image['subjects'] ?? []) as $subject) {
            if (! is_array($subject)) {
                continue;
            }

            $frag = [];
            foreach (['identity', 'appearance', 'attire', 'pose', 'placement'] as $key) {
                $val = trim((string) ($subject[$key] ?? ''));
                if ($val !== '') {
                    $frag[] = $val;
                }
            }

            if ($frag !== []) {
                $parts[] = implode(', ', $frag);
            }
        }

        $scene = trim((string) data_get($image, 'environment.scene', ''));
        if ($scene !== '') {
            $parts[] = 'Setting: '.$scene;
        }

        $elements = array_filter(array_map(
            fn ($e) => trim((string) $e),
            (array) data_get($image, 'environment.elements', []),
        ));
        if ($elements !== []) {
            $parts[] = 'Background: '.implode('; ', $elements);
        }

        $parts[] = $this->aestheticsSentence($aesthetics, $imageStyle);

        return $this->joinSentences($parts);
    }

    /**
     * The aesthetics + shared composition rules as a natural-language tail appended
     * to every image prompt.
     *
     * When the user supplies a free-text `imageStyle`, it OVERRIDES the template's
     * art direction (art style, lighting mood, color grade, grain): the user's look
     * wins, and only the camera framing + universal composition constraints (4:5,
     * face visible, overlay-safe, no text/logos) are kept so the deck stays usable.
     *
     * @param  array<string, string>  $a
     */
    private function aestheticsSentence(array $a, string $imageStyle = ''): string
    {
        $camera = implode(', ', array_filter([$a['camera_angle'] ?? '', $a['lens'] ?? '']));

        if (trim($imageStyle) !== '') {
            return $this->joinSentences([
                trim($imageStyle),
                $camera !== '' ? 'Camera: '.$camera : '',
                self::IMAGE_CONSTRAINTS,
            ]);
        }

        $lighting = implode('; ', array_filter([$a['key_light'] ?? '', $a['fill_light'] ?? '', $a['shadows'] ?? '']));

        return $this->joinSentences([
            $a['art_style'] ?? '',
            $lighting !== '' ? 'Lighting: '.$lighting : '',
            $camera !== '' ? 'Camera: '.$camera : '',
            $a['color_grade'] ?? '',
            $a['grain'] ?? '',
            self::IMAGE_CONSTRAINTS,
        ]);
    }

    /**
     * Join fragments into a clean sentence list: trims, drops empties and trailing
     * periods, then re-joins with ". " and a single terminal period.
     *
     * @param  array<int, string>  $parts
     */
    private function joinSentences(array $parts): string
    {
        $clean = [];
        foreach ($parts as $part) {
            $part = rtrim(trim((string) $part), ' .');
            if ($part !== '') {
                $clean[] = $part;
            }
        }

        return $clean === [] ? '' : implode('. ', $clean).'.';
    }

    /**
     * Run a text generation against the primary provider, falling back to the
     * secondary provider on any failure (timeout, connection error, etc.).
     */
    private function runTextWithFallback(string $systemPrompt, string $userPrompt): string
    {
        try {
            return $this->runText(Provider::DeepSeek, 'deepseek-chat', $systemPrompt, $userPrompt);
        } catch (\Throwable $e) {
            \Log::warning('[Carousel] Primary text provider failed; falling back to OpenAI', [
                'provider' => 'deepseek',
                'message' => $e->getMessage(),
            ]);

            return $this->runText(Provider::OpenAI, 'gpt-4o', $systemPrompt, $userPrompt);
        }
    }

    /**
     * Run a single buffered text generation and return the model's raw text.
     */
    private function runText(Provider $provider, string $model, string $systemPrompt, string $userPrompt): string
    {
        $response = Prism::text()
            ->using($provider, $model)
            ->withSystemPrompt($systemPrompt)
            ->withPrompt($userPrompt)
            ->withClientOptions(['timeout' => 120])
            ->generate();

        return $response->text;
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
            'ticket' => 'refined, editorial, considered voice',
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
     * Generate 3 fresh carousel ideas tailored to the workspace's brand DNA
     * (the onboarding profile). Each idea is a ready-to-use hook headline plus a
     * short snake_case content angle.
     *
     * @param  array<string, mixed>  $profile  The workspace profile (brand_name, brand_description, target_audience, goal, tone_of_voice, ...).
     * @return array<int, array{title: string, angle: string}>
     */
    public function generateIdeas(array $profile, string $language = 'Portuguese (Brazil)'): array
    {
        $brand = (string) ($profile['brand_name'] ?? '');
        $description = (string) ($profile['brand_description'] ?? '');
        $audience = (string) ($profile['target_audience'] ?? '');
        $goal = (string) ($profile['goal'] ?? '');
        $tone = implode(', ', (array) ($profile['tone_of_voice'] ?? []));
        $visualStyle = (string) ($profile['visual_style'] ?? '');

        $systemPrompt = <<<PROMPT
You are a senior Instagram content strategist who turns a brand's DNA into scroll-stopping carousel ideas.

OUTPUT
- Respond ONLY with a JSON array of EXACTLY 3 objects. No markdown, no code fences, no commentary.
- Each object has exactly these keys:
  - "title": a punchy hook headline written in {$language}, max 12 words, specific to this brand and audience. No em-dashes.
  - "angle": a short snake_case label for the content angle, in English, e.g. "mito_verdade", "pergunta_frequente", "comparacao_metodos", "erro_comum", "passo_a_passo", "bastidores".
- The 3 ideas must be distinct angles, fresh, and immediately postable today.

BRAND DNA
- Brand: {$brand}
- What it does: {$description}
- Target audience: {$audience}
- Main goal: {$goal}
- Tone of voice: {$tone}
- Visual style: {$visualStyle}
PROMPT;

        $text = $this->runTextWithFallback($systemPrompt, 'Generate 3 fresh carousel ideas for today.');

        return $this->parseIdeas($text);
    }

    /**
     * Parse the model's JSON-array response into a normalized ideas list,
     * tolerating code fences and surrounding prose.
     *
     * @return array<int, array{title: string, angle: string}>
     */
    private function parseIdeas(string $raw): array
    {
        $text = trim($raw);
        $start = strpos($text, '[');
        $end = strrpos($text, ']');

        if ($start === false || $end === false || $end < $start) {
            throw new \RuntimeException('Idea generation failed: no JSON array in response');
        }

        $decoded = json_decode(substr($text, $start, $end - $start + 1), true);

        if (! is_array($decoded)) {
            throw new \RuntimeException('Idea generation failed: invalid JSON');
        }

        $ideas = [];
        foreach ($decoded as $item) {
            $title = trim((string) (is_array($item) ? ($item['title'] ?? '') : ''));

            if ($title === '') {
                continue;
            }

            $angle = trim((string) (is_array($item) ? ($item['angle'] ?? '') : '')) ?: 'ideia';
            $ideas[] = ['title' => $title, 'angle' => $angle];

            if (count($ideas) >= 3) {
                break;
            }
        }

        if ($ideas === []) {
            throw new \RuntimeException('Idea generation failed: no usable ideas');
        }

        return $ideas;
    }

    /**
     * Generate a background image as a base64 data URI, dispatching to the
     * driver configured via `services.carousel_image.driver`
     * (gemini / openai / unsplash). Defaults to Gemini image generation.
     *
     * @param  string  $aspectRatio  Portrait ratio for generative drivers, e.g. "4:5" (post) or "9:16" (stories).
     * @param  string|null  $byokApiKey  A user-provided Gemini key (BYOK). When set, image generation is billed to the user's key instead of the platform key.
     */
    public function generateImage(string $prompt, string $aspectRatio = '4:5', ?string $byokApiKey = null): string
    {
        \Log::debug('Carousel image prompt', ['prompt' => $prompt, 'aspect_ratio' => $aspectRatio, 'byok' => $byokApiKey !== null]);

        $driver = config('services.carousel_image.driver', 'gemini');
        $usesGenerativeDriver = $byokApiKey !== null || in_array($driver, ['gemini', 'google', 'openai', 'gpt'], true);

        try {
            // BYOK always routes to Gemini (the only driver the user supplies a key
            // for); without a key, use the platform-configured driver.
            if ($byokApiKey !== null) {
                return $this->generateImageWithGemini($prompt, $aspectRatio, $byokApiKey);
            }

            return match ($driver) {
                'gemini', 'google' => $this->generateImageWithGemini($prompt, $aspectRatio),
                'openai', 'gpt' => $this->generateImageWithOpenAi($prompt),
                default => $this->generateImageWithUnsplash($prompt),
            };
        } catch (\Throwable $e) {
            // Failsafe: when a generative driver fails (rate limit, quota, network),
            // fall back to an Unsplash stock photo so the slide still gets an image
            // instead of nothing. Skip when the primary driver already was Unsplash.
            if (! $usesGenerativeDriver) {
                throw $e;
            }

            \Log::warning('Image generation failed, falling back to Unsplash', [
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);

            return $this->generateImageWithUnsplash($prompt);
        }
    }

    /**
     * Generate a cinematic background image with Gemini ("nano banana") and
     * return it as a base64 data URI. Produces portrait images suited to
     * Instagram carousels, with subject-accurate results for real people/brands
     * that keyword-based stock search cannot match.
     */
    public function generateImageWithGemini(string $prompt, string $aspectRatio = '4:5', ?string $apiKey = null): string
    {
        $response = Prism::image()
            ->using(Provider::Gemini, 'gemini-2.5-flash-image', $apiKey ? ['api_key' => $apiKey] : [])
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
