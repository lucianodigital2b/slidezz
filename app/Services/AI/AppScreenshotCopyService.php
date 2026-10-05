<?php

namespace App\Services\AI;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

/**
 * Copywriting for App Store / Google Play screenshot captions: the short
 * headline + subheadline pairs painted over each screenshot, and their
 * translations for every store locale the user ships to.
 */
class AppScreenshotCopyService
{
    /**
     * Write one caption per screenshot.
     *
     * @param  list<string>  $screenLabels  What each uploaded screenshot shows, in order (may be empty strings).
     * @return list<array{headline: string, subheadline: string}>
     */
    public function generateCaptions(
        string $appName,
        string $pitch,
        int $count,
        string $language = 'Portuguese (Brazil)',
        string $store = 'appstore',
        array $screenLabels = [],
        string $tone = 'confident and benefit-driven',
    ): array {
        $storeName = $store === 'playstore' ? 'Google Play' : 'the Apple App Store';

        $screensBrief = '';
        foreach ($screenLabels as $index => $label) {
            $label = trim($label);
            if ($label !== '') {
                $screensBrief .= 'Screenshot '.($index + 1).': '.$label."\n";
            }
        }
        $screensBrief = $screensBrief === ''
            ? ''
            : "\nWHAT EACH SCREENSHOT SHOWS\n".$screensBrief;

        $systemPrompt = <<<PROMPT
You are a senior app marketing copywriter writing the caption overlays for {$storeName} screenshots.

LANGUAGE
- Write every headline and subheadline in {$language}.

OUTPUT
- Respond ONLY with NDJSON: exactly one valid JSON object per line, exactly {$count} lines, in screenshot order.
- No markdown, no code fences, no commentary, no blank lines, no numbering.
- Plain text only: no em-dashes (use a hyphen), no markdown, straight quotes, no emoji.

KEYS (each line must have exactly these keys)
- headline: the big caption. MAXIMUM 5 words and 32 characters. A benefit, not a feature name. Never the app name alone.
- subheadline: one short supporting line. MAXIMUM 9 words and 58 characters. Adds a concrete detail the headline does not say.
- highlight: one word or short phrase copied EXACTLY from the headline, the part that carries the value. Never the whole headline.

RULES
- Screenshot 1 is the hook: the single strongest reason to download. It must work with no context.
- Each following caption sells a DIFFERENT benefit. Never repeat a benefit or a verb across lines.
- Speak to the user's outcome ("Ship in minutes"), not to the interface ("Dashboard screen").
- No superlatives you cannot prove, no "the best", no pricing claims, no competitor names.
- Keep it scannable: a store visitor reads this in under a second while scrolling.

APP
- Name: {$appName}
- What it does: {$pitch}
- Voice: {$tone}
{$screensBrief}
Output exactly {$count} lines of raw NDJSON. Nothing else.
PROMPT;

        $userPrompt = "Write {$count} screenshot captions for {$appName}.";

        $lines = $this->parseNdjson($this->runTextWithFallback($systemPrompt, $userPrompt));

        if (count($lines) < $count) {
            $lines = $this->parseNdjson($this->runTextWithFallback($systemPrompt, $userPrompt));
        }

        $captions = [];

        foreach (array_slice($lines, 0, $count) as $line) {
            $captions[] = [
                'headline' => trim((string) ($line['headline'] ?? '')),
                'subheadline' => trim((string) ($line['subheadline'] ?? '')),
                'highlight' => trim((string) ($line['highlight'] ?? '')),
            ];
        }

        return $captions;
    }

    /**
     * Translate screenshot captions into a single store locale, keeping every
     * string within the length the layout was designed for.
     *
     * @param  list<array{id: string, text: string, highlight?: string, max_chars?: int}>  $items
     * @return list<array{id: string, text: string, highlight: string}>
     */
    public function translate(array $items, string $language, string $appName = ''): array
    {
        $payload = [];

        foreach ($items as $item) {
            $id = trim((string) ($item['id'] ?? ''));
            $text = trim((string) ($item['text'] ?? ''));

            if ($id === '' || $text === '') {
                continue;
            }

            $entry = ['id' => $id, 'text' => $text];

            if (trim((string) ($item['highlight'] ?? '')) !== '') {
                $entry['highlight'] = trim((string) $item['highlight']);
            }

            // The source string's own length is the layout budget: a translation
            // much longer than it will not fit the box it was designed for.
            $entry['max_chars'] = (int) ($item['max_chars'] ?? max(24, (int) round(mb_strlen($text) * 1.25)));

            $payload[] = $entry;
        }

        if ($payload === []) {
            return [];
        }

        $appLine = $appName === '' ? '' : "\n- The app is called \"{$appName}\". Never translate the app name.";

        $systemPrompt = <<<PROMPT
You localize App Store and Google Play screenshot captions.

TASK
- Translate every item into {$language}, as a native marketer in that market would write it, not word for word.
- Keep the marketing punch: short, concrete, benefit-first.{$appLine}
- Never exceed the item's max_chars. If a literal translation is too long, rewrite it shorter with the same meaning.
- Keep product names, brand names, and numbers exactly as they are.
- If the item has a "highlight", return the translated fragment that carries the same emphasis. It MUST appear verbatim inside your translated text. If nothing fits, return an empty string.

OUTPUT
- Respond ONLY with NDJSON: one valid JSON object per line, one line per input item, in the same order.
- Keys per line: id (copied verbatim from the input), text (the translation), highlight (the translated fragment or "").
- No markdown, no code fences, no commentary, no blank lines, no em-dashes.
PROMPT;

        $userPrompt = "Translate these caption items into {$language}:\n".
            implode("\n", array_map(fn (array $entry): string => json_encode($entry, JSON_UNESCAPED_UNICODE), $payload));

        $lines = $this->parseNdjson($this->runTextWithFallback($systemPrompt, $userPrompt));

        $byId = [];

        foreach ($lines as $line) {
            $id = trim((string) ($line['id'] ?? ''));
            $text = trim((string) ($line['text'] ?? ''));

            if ($id !== '' && $text !== '') {
                $byId[$id] = [
                    'id' => $id,
                    'text' => $text,
                    'highlight' => trim((string) ($line['highlight'] ?? '')),
                ];
            }
        }

        $translations = [];

        // Return them in the requested order, falling back to the source string so a
        // dropped line never blanks a caption on the exported screenshot.
        foreach ($payload as $entry) {
            $translations[] = $byId[$entry['id']] ?? [
                'id' => $entry['id'],
                'text' => $entry['text'],
                'highlight' => (string) ($entry['highlight'] ?? ''),
            ];
        }

        return $translations;
    }

    /**
     * Decode the model's NDJSON reply, tolerating code fences and prose around it.
     *
     * @return list<array<string, mixed>>
     */
    private function parseNdjson(string $raw): array
    {
        $rows = [];

        foreach (preg_split('/\r\n|\r|\n/', $raw) ?: [] as $line) {
            $line = trim($line);

            if ($line === '' || ! str_starts_with($line, '{')) {
                continue;
            }

            $decoded = json_decode($line, true);

            if (is_array($decoded)) {
                $rows[] = $decoded;
            }
        }

        return $rows;
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
            \Log::warning('[AppScreenshots] Primary text provider failed; falling back to OpenAI', [
                'provider' => 'deepseek',
                'message' => $e->getMessage(),
            ]);

            return $this->runText(Provider::OpenAI, 'gpt-4o', $systemPrompt, $userPrompt);
        }
    }

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
}
