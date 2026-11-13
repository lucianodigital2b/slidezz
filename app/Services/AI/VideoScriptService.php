<?php

namespace App\Services\AI;

use App\Models\Workspace;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use RuntimeException;

class VideoScriptService
{
    /**
     * @param  array{
     *    topic?: string|null,
     *    language?: string,
     *    target_seconds?: int,
     *    reference?: array{caption?: string|null, transcript?: string|null, views?: int, duration?: float|null}|null,
     *    source?: array{title?: string|null, url?: string, text?: string|null}|null
     *  } $input
     * @return array{title: string, hooks: list<array{text: string, style: string}>, chosen_hook: int, body: list<array{beat: string, line: string, on_screen_text: string, b_roll: string}>, cta: string, full_script: string, estimated_seconds: int, caption: string, hashtags: list<string>, sources: list<array{title: string, url: string}>}
     */
    public function generate(array $input, Workspace $workspace): array
    {
        $targetSeconds = max(15, min(180, (int) ($input['target_seconds'] ?? 45)));
        $language = trim((string) ($input['language'] ?? 'Portuguese (Brazil)'));

        if ($language === '') {
            $language = 'Portuguese (Brazil)';
        }

        $systemPrompt = $this->systemPrompt($language, $targetSeconds);
        $userPrompt = $this->userPrompt($input, $workspace);

        $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $input, $targetSeconds, $language);

        if (count($parsed['body']) < 3) {
            Log::warning('[VideoScript] Model returned fewer beats than requested; retrying', [
                'requested' => 3,
                'received' => count($parsed['body']),
            ]);

            $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $input, $targetSeconds, $language);
        }

        if (count($parsed['body']) < 3 || $parsed['full_script'] === '') {
            throw new RuntimeException('Video script generation failed: no usable script in response');
        }

        return $parsed;
    }

    private function systemPrompt(string $language, int $targetSeconds): string
    {
        $targetWords = (int) round($targetSeconds * 2.5);

        return <<<PROMPT
You are a viral talking-head video script writer for TikTok, Instagram Reels and YouTube Shorts. You write scripts for a person speaking directly to the camera.

LANGUAGE
- Write every string field in {$language}.
- Spell {$language} correctly, accents included. Never strip diacritics.
- Spoken language: short sentences, contractions, "voce" in Portuguese, simple words.

OUTPUT
- Respond ONLY with a single JSON object, no markdown, no code fences, no commentary.
- Use this exact shape:
{
  "title": "string",
  "hooks": [
    {"text": "string", "style": "question|bold_claim|story|number|contrarian"}
  ],
  "chosen_hook": 0,
  "body": [
    {"beat": "string", "line": "string", "on_screen_text": "string", "b_roll": "string"}
  ],
  "cta": "string",
  "full_script": "string",
  "estimated_seconds": 0,
  "caption": "string",
  "hashtags": ["string"],
  "sources": [{"title": "string", "url": "string"}]
}

RULES
- Exactly 5 hooks.
- `chosen_hook` is the 0-based index of the best hook.
- 3 to 8 body beats.
- The hook must be under 12 words.
- The whole script must fit around {$targetSeconds} seconds when read aloud. Use 2.5 words per second, so aim for about {$targetWords} words total.
- `full_script` must be the complete teleprompter text: chosen hook, every body line, and the CTA, in order, separated by blank lines. No labels like "HOOK:" or "CTA".
- No em dash characters anywhere. Use commas or hyphens.
- If a reference video is provided, keep its structure, pacing and number of beats, but never copy its sentences.
- Sources: only cite the provided source article URL. Never invent URLs. If no source article is provided, `sources` must be [].
- Hashtags: max 6, lowercase without #.

The CTA should ask for one specific action: follow, comment, save or share.
PROMPT;
    }

    private function userPrompt(array $input, Workspace $workspace): string
    {
        $profileAnalysis = is_array($workspace->profile) ? ($workspace->profile['analysis'] ?? null) : null;

        $brief = [
            'topic' => $input['topic'] ?? null,
            'target_seconds' => $input['target_seconds'] ?? 45,
            'reference' => $input['reference'] ?? null,
            'source' => $input['source'] ?? null,
            'brand' => [
                'name' => $workspace->name,
                'industry' => $workspace->industry,
                'vibe' => $workspace->vibe,
                'target_audience' => $workspace->target_audience,
                'tone_of_voice' => $workspace->tone_of_voice,
                'goal' => $workspace->goal,
                'analysis' => $profileAnalysis,
            ],
        ];

        return "Write the video script for this brief:\n".json_encode($brief, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{title: string, hooks: list<array{text: string, style: string}>, chosen_hook: int, body: list<array{beat: string, line: string, on_screen_text: string, b_roll: string}>, cta: string, full_script: string, estimated_seconds: int, caption: string, hashtags: list<string>, sources: list<array{title: string, url: string}>}
     */
    private function parse(string $json, array $input, int $targetSeconds, string $language): array
    {
        $data = $this->decodeJson($json);

        if ($data === null) {
            throw new RuntimeException('Video script generation failed: invalid JSON in response');
        }

        $topic = trim((string) ($input['topic'] ?? ''));
        $title = trim((string) ($data['title'] ?? ''));

        if ($title === '') {
            $title = $topic !== '' ? $topic : 'Roteiro de vídeo';
        }

        $hooks = $this->parseHooks($data['hooks'] ?? [], $language, $topic);
        $chosenIndex = (int) ($data['chosen_hook'] ?? 0);
        $chosenIndex = max(0, min(count($hooks) - 1, $chosenIndex));
        $body = $this->parseBody($data['body'] ?? []);
        $cta = trim((string) ($data['cta'] ?? ''));

        if ($cta === '') {
            $cta = str_starts_with($language, 'Portuguese')
                ? 'Comenta aqui embaixo o que você achou.'
                : 'Comment below and tell me what you think.';
        }

        $chosenHookText = $hooks[$chosenIndex]['text'] ?? ($hooks[0]['text'] ?? '');

        $fullScript = $this->buildFullScript($chosenHookText, $body, $cta);
        $estimatedSeconds = (int) ($data['estimated_seconds'] ?? 0);

        if ($estimatedSeconds <= 0) {
            $wordCount = preg_match_all('/\S+/u', $fullScript, $matches);
            $estimatedSeconds = (int) round((int) $wordCount / 2.5);
        }

        $estimatedSeconds = max(1, min(180, $estimatedSeconds));

        $caption = trim((string) ($data['caption'] ?? ''));

        if ($caption === '') {
            $caption = $title !== '' ? $title : ($hooks[0]['text'] ?? '');
        }

        $sourceUrl = isset($input['source']['url']) ? trim((string) $input['source']['url']) : '';
        $sourceTitle = isset($input['source']['title']) ? trim((string) $input['source']['title']) : '';

        $sources = [];

        if ($sourceUrl !== '') {
            $sources[] = [
                'title' => $sourceTitle !== '' ? $sourceTitle : $sourceUrl,
                'url' => $sourceUrl,
            ];
        }

        return [
            'title' => $title,
            'hooks' => $hooks,
            'chosen_hook' => $chosenIndex,
            'body' => $body,
            'cta' => $cta,
            'full_script' => $fullScript,
            'estimated_seconds' => $estimatedSeconds,
            'caption' => $caption,
            'hashtags' => $this->parseHashtags($data['hashtags'] ?? []),
            'sources' => $sources,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeJson(string $json): ?array
    {
        $clean = trim($json);

        if (preg_match('/```(?:json)?\s*(.*?)```/s', $clean, $match)) {
            $clean = trim($match[1]);
        }

        $start = strpos($clean, '{');
        $end = strrpos($clean, '}');

        if ($start !== false && $end !== false && $end > $start) {
            $clean = substr($clean, $start, $end - $start + 1);
        }

        $data = json_decode($clean, true);

        return is_array($data) ? $data : null;
    }

    /**
     * @return list<array{text: string, style: string}>
     */
    private function parseHooks(mixed $raw, string $language, string $topic): array
    {
        $styles = ['question', 'bold_claim', 'story', 'number', 'contrarian'];
        $hooks = [];

        foreach ((array) $raw as $entry) {
            if (is_string($entry)) {
                $text = trim($entry);
                $style = 'question';
            } elseif (is_array($entry)) {
                $text = trim((string) ($entry['text'] ?? ''));
                $style = (string) ($entry['style'] ?? 'question');
            } else {
                continue;
            }

            $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

            if ($text === '') {
                continue;
            }

            if (! in_array($style, $styles, true)) {
                $style = 'question';
            }

            $hooks[] = ['text' => $text, 'style' => $style];
        }

        $hooks = array_slice($hooks, 0, 5);
        $fallbacks = $this->fallbackHooks($language, $topic);

        while (count($hooks) < 5 && $fallbacks !== []) {
            $fallback = array_shift($fallbacks);

            if (! in_array($fallback['text'], array_column($hooks, 'text'), true)) {
                $hooks[] = $fallback;
            }
        }

        return $hooks;
    }

    /**
     * @return list<array{text: string, style: string}>
     */
    private function fallbackHooks(string $language, string $topic): array
    {
        if (str_starts_with($language, 'Portuguese')) {
            return [
                ['text' => 'Você comete esse erro todos os dias.', 'style' => 'bold_claim'],
                ['text' => 'Por que ninguém te contou isso?', 'style' => 'question'],
                ['text' => '3 coisas que mudam tudo.', 'style' => 'number'],
                ['text' => 'Eu aprendi isso do jeito difícil.', 'style' => 'story'],
                ['text' => 'Todo mundo faz isso errado.', 'style' => 'contrarian'],
            ];
        }

        return [
            ['text' => 'You make this mistake every single day.', 'style' => 'bold_claim'],
            ['text' => 'Why did nobody tell you this?', 'style' => 'question'],
            ['text' => '3 things that change everything.', 'style' => 'number'],
            ['text' => 'I learned this the hard way.', 'style' => 'story'],
            ['text' => 'Everyone gets this wrong.', 'style' => 'contrarian'],
        ];
    }

    /**
     * @return list<array{beat: string, line: string, on_screen_text: string, b_roll: string}>
     */
    private function parseBody(mixed $raw): array
    {
        $body = [];

        foreach ((array) $raw as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $line = trim((string) ($entry['line'] ?? ''));

            if ($line === '') {
                continue;
            }

            $body[] = [
                'beat' => trim((string) ($entry['beat'] ?? '')),
                'line' => $line,
                'on_screen_text' => trim((string) ($entry['on_screen_text'] ?? '')),
                'b_roll' => trim((string) ($entry['b_roll'] ?? '')),
            ];
        }

        return array_slice($body, 0, 8);
    }

    /**
     * @return list<string>
     */
    private function parseHashtags(mixed $raw): array
    {
        $tags = [];

        foreach ((array) $raw as $tag) {
            if (! is_string($tag)) {
                continue;
            }

            $tag = ltrim(trim($tag), '#');

            if ($tag === '') {
                continue;
            }

            $tags[] = $tag;
        }

        return array_slice(array_unique($tags), 0, 6);
    }

    /**
     * @param  list<array{beat: string, line: string, on_screen_text: string, b_roll: string}>  $body
     */
    private function buildFullScript(string $hook, array $body, string $cta): string
    {
        $parts = [];

        if ($hook !== '') {
            $parts[] = $hook;
        }

        foreach ($body as $beat) {
            if (trim((string) $beat['line']) !== '') {
                $parts[] = trim((string) $beat['line']);
            }
        }

        if ($cta !== '') {
            $parts[] = $cta;
        }

        return implode("\n\n", $parts);
    }

    private function runWithFallback(string $systemPrompt, string $userPrompt): string
    {
        try {
            return $this->run(Provider::DeepSeek, 'deepseek-chat', $systemPrompt, $userPrompt);
        } catch (\Throwable $e) {
            Log::warning('[VideoScript] Primary text provider failed; falling back to OpenAI', [
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
