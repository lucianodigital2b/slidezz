<?php

namespace App\Services\AI;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use RuntimeException;

/**
 * Writes the script for a TikTok photo carousel: a hook slide, a run of listicle
 * slides, and the caption that ships with the post.
 *
 * Mirrors {@see CarouselGenerationService} (NDJSON out, DeepSeek with an OpenAI
 * fallback) but targets a different medium: one short line per slide instead of
 * headline + body, plus an English Pinterest query per slide.
 */
class SlideshowScriptService
{
    /**
     * @param  list<string>  $avoidTopics  Hooks this automation already used, so runs stay fresh.
     * @return array{hook: string, slides: list<array{text: string, image_query: string}>, caption: string, hashtags: list<string>}
     */
    public function generate(
        string $topic,
        int $slideCount = 6,
        string $language = 'Portuguese (Brazil)',
        array $avoidTopics = [],
    ): array {
        $systemPrompt = $this->systemPrompt($slideCount, $language, $avoidTopics);
        $userPrompt = "Write a {$slideCount}-slide TikTok photo carousel about: {$topic}";

        $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $slideCount);

        // Models occasionally stop early. One retry recovers nearly all of them.
        if (count($parsed['slides']) < $slideCount) {
            \Log::warning('[Slideshow] Model returned fewer slides than requested; retrying', [
                'requested' => $slideCount,
                'received' => count($parsed['slides']),
            ]);

            $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $slideCount);
        }

        if ($parsed['slides'] === []) {
            throw new RuntimeException('Slideshow script generation failed: no usable slides in response');
        }

        return $parsed;
    }

    /**
     * Writes the payoff slides for a hook that already exists — a line pulled from
     * an imported CSV — instead of inventing one. The hook ships back untouched.
     *
     * @param  list<string>  $avoidTopics
     * @return array{hook: string, slides: list<array{text: string, image_query: string}>, caption: string, hashtags: list<string>}
     */
    public function generateFromHook(
        string $hook,
        int $slideCount = 6,
        string $language = 'Portuguese (Brazil)',
        array $avoidTopics = [],
    ): array {
        $hook = trim(preg_replace('/\s+/u', ' ', $hook) ?? '');

        if ($hook === '') {
            throw new RuntimeException('Slideshow generation needs a hook.');
        }

        $systemPrompt = $this->systemPrompt($slideCount, $language, $avoidTopics, $hook);
        $userPrompt = "Write the carousel for this hook: {$hook}";

        $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $slideCount);

        if (count($parsed['slides']) < 2) {
            $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $slideCount);
        }

        if ($parsed['slides'] === []) {
            throw new RuntimeException('Slideshow script generation failed: no usable slides in response');
        }

        // The imported hook is the whole point of the run: never let a model
        // paraphrase it, even when it ignored the instruction to echo it back.
        $parsed['slides'][0]['text'] = $hook;
        $parsed['hook'] = $hook;

        if ($parsed['caption'] === '') {
            $parsed['caption'] = $hook;
        }

        return $parsed;
    }

    /**
     * @param  list<string>  $avoidTopics
     * @param  string|null  $fixedHook  When set, line 1's text is dictated instead of written.
     */
    private function systemPrompt(int $slideCount, string $language, array $avoidTopics, ?string $fixedHook = null): string
    {
        $bodyCount = max(1, $slideCount - 1);
        $avoid = $avoidTopics === []
            ? ''
            : "\nALREADY USED (write a different angle, do not repeat these)\n- ".implode("\n- ", array_slice($avoidTopics, 0, 15))."\n";

        $hookRule = $fixedHook === null
            ? <<<'RULE'
- `text`: the scroll-stopper, 12 to 18 words, first person, specific. Listicle framing works best: a lived credential plus the promise of a list. Emoji are welcome, at most 2.
- Never a question with no payoff, never a generic promise. It must make the reader need slide 2.
RULE
            : <<<RULE
- `text`: copy this hook EXACTLY, character for character, changing nothing: {$fixedHook}
- `image_query`: your own English query for a photo that fits that hook.
- Every payoff slide below must deliver on the promise this hook makes.
RULE;

        return <<<PROMPT
You are a viral TikTok photo-carousel writer. You write the text overlays that sit on top of aesthetic photos.

LANGUAGE
- Write `hook`, every slide `text`, and the `caption` in {$language}.
- Write every `image_query` in ENGLISH (Pinterest search works best in English).
- Spell {$language} correctly, accents included ("vão", "até", "você"). Never strip diacritics.

OUTPUT
- Respond ONLY with NDJSON: one valid JSON object per line, no markdown, no code fences, no commentary, no blank lines.
- Line 1 is the hook object. Lines 2 to {$bodyCount} + 1 are the slide objects. The final line is the meta object.
- Plain text only inside values: no em-dashes (use a hyphen), no markdown, straight quotes.

LINE 1 - the hook
{"type":"hook","text":"...","image_query":"..."}
{$hookRule}

LINES 2 to {$bodyCount} + 1 - the payoff slides ({$bodyCount} of them)
{"type":"slide","text":"...","image_query":"..."}
- `text`: ONE concrete tip, fact or step. Maximum 14 words - it is rendered large over a photo and must fit 3 lines.
- Every slide adds something new and specific. No filler, no restating the hook, no "and that's it".
- Never number or label a slide ("Hack 1:", "Dica 2:", "Passo 3:"). Its position in the carousel already says which one it is - open with the tip itself.
- At most one emoji per slide, and only when it adds meaning.

FINAL LINE - the meta
{"type":"meta","caption":"...","hashtags":["...","..."]}
- `caption`: 1 to 2 sentences for the post description, in {$language}.
- `hashtags`: 4 to 8 lowercase tags without the # sign.

IMAGE QUERIES (`image_query` on the hook and every slide)
- 3 to 6 English words describing a real photo someone would pin: subject plus aesthetic, e.g. "korean skincare shelfie aesthetic", "minimal bathroom counter morning light".
- Concrete nouns only. No brand names, no text-in-image requests, no camera or lens jargon, no "photo of".
- Vary them across slides so the carousel does not show six versions of the same picture.
{$avoid}
Output exactly {$slideCount} + 1 lines of raw NDJSON. Nothing else.
PROMPT;
    }

    /**
     * @return array{hook: string, slides: list<array{text: string, image_query: string}>, caption: string, hashtags: list<string>}
     */
    private function parse(string $ndjson, int $slideCount): array
    {
        $slides = [];
        $caption = '';
        $hashtags = [];
        $hook = '';

        foreach (preg_split('/\r?\n/', trim($ndjson)) ?: [] as $line) {
            $line = trim($line, " \t\r\n`");

            if ($line === '' || ! str_starts_with($line, '{')) {
                continue;
            }

            $row = json_decode($line, true);

            if (! is_array($row)) {
                continue;
            }

            if (($row['type'] ?? '') === 'meta') {
                $caption = trim((string) ($row['caption'] ?? ''));
                $hashtags = array_values(array_filter(array_map(
                    fn ($tag): string => ltrim(trim((string) $tag), '#'),
                    (array) ($row['hashtags'] ?? []),
                )));

                continue;
            }

            $text = trim((string) ($row['text'] ?? ''));

            if ($text === '') {
                continue;
            }

            if ($hook === '' && ($row['type'] ?? '') === 'hook') {
                $hook = $text;
            }

            $slides[] = [
                'text' => $text,
                'image_query' => trim((string) ($row['image_query'] ?? '')) ?: 'aesthetic lifestyle photography',
            ];
        }

        // A model that skips the "hook" type still puts the hook on line 1.
        if ($hook === '' && $slides !== []) {
            $hook = $slides[0]['text'];
        }

        return [
            'hook' => $hook,
            'slides' => array_slice($slides, 0, $slideCount),
            'caption' => $caption !== '' ? $caption : $hook,
            'hashtags' => $hashtags,
        ];
    }

    private function runWithFallback(string $systemPrompt, string $userPrompt): string
    {
        try {
            return $this->run(Provider::DeepSeek, 'deepseek-chat', $systemPrompt, $userPrompt);
        } catch (\Throwable $e) {
            \Log::warning('[Slideshow] Primary text provider failed; falling back to OpenAI', [
                'provider' => 'deepseek',
                'message' => $e->getMessage(),
            ]);

            return $this->run(Provider::OpenAI, 'gpt-4o', $systemPrompt, $userPrompt);
        }
    }

    private function run(Provider $provider, string $model, string $systemPrompt, string $userPrompt): string
    {
        return Prism::text()
            ->using($provider, $model)
            ->withSystemPrompt($systemPrompt)
            ->withPrompt($userPrompt)
            ->withClientOptions(['timeout' => 120])
            ->generate()
            ->text;
    }
}
