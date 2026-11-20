<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use RuntimeException;

class ViralBreakdownAnalyzer
{
    /**
     * DeepSeek writes the analysis (OpenAI as fallback). It cannot see the video, so what is on
     * screen arrives as text: `$frameNotes`, written by App\Services\Video\FrameDescriber.
     *
     * @param  array{text: string, language: ?string, duration: float, words: list<array{word: string, start: float, end: float}>}  $transcript
     * @param  array<string, mixed>  $source
     * @return array{niche: string, summary: string, caption: string, stages: list<array<string, mixed>>}
     */
    public function analyze(array $transcript, string $frameNotes, array $source, string $language): array
    {
        $words = $transcript['words'] ?? [];

        if (count($words) === 0) {
            throw new RuntimeException('Esse vídeo não tem fala pra destrinchar.');
        }

        $system = $this->systemPrompt($language);
        $userText = $this->buildUserText($transcript, $frameNotes, $source, $language);

        try {
            $raw = $this->run(Provider::DeepSeek, 'deepseek-chat', $system, $userText);
        } catch (\Throwable $e) {
            Log::warning('[Breakdown] DeepSeek analysis failed, falling back to OpenAI', [
                'message' => $e->getMessage(),
            ]);

            $raw = $this->run(Provider::OpenAI, 'gpt-4o', $system, $userText);
        }

        return $this->normalize($raw, $words, $language);
    }

    private function run(Provider $provider, string $model, string $system, string $userText): string
    {
        return Prism::text()
            ->using($provider, $model)
            ->withSystemPrompt($system)
            ->withPrompt($userText)
            ->withClientOptions(['timeout' => 180])
            ->generate()
            ->text;
    }

    /**
     * @param  string|array<mixed>  $raw
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @return array{niche: string, summary: string, caption: string, stages: list<array<string, mixed>>}
     */
    public function normalize(string|array $raw, array $words, string $language): array
    {
        if (is_string($raw)) {
            $data = $this->decodeJson($raw);
        } else {
            $data = $raw;
        }

        if (! is_array($data) || empty($data['stages']) || ! is_array($data['stages'])) {
            throw new RuntimeException('A análise do vídeo falhou: resposta inválida.');
        }

        $count = count($words);
        if ($count === 0) {
            throw new RuntimeException('Esse vídeo não tem fala pra destrinchar.');
        }

        $stages = array_values(array_map(function (array $stage): array {
            return [
                'key' => $this->normalizeKey($stage['key'] ?? 'body'),
                'title' => (string) ($stage['title'] ?? ''),
                'label' => (string) ($stage['label'] ?? ''),
                'start_word' => (int) ($stage['start_word'] ?? 0),
                'end_word' => (int) ($stage['end_word'] ?? 0),
                'video_note' => (string) ($stage['video_note'] ?? ''),
                'video_note_side' => isset($stage['video_note_side']) && in_array($stage['video_note_side'], ['left', 'right'], true)
                    ? $stage['video_note_side']
                    : null,
                'notes' => is_array($stage['notes'] ?? null) ? array_values($stage['notes']) : [],
            ];
        }, array_filter($data['stages'], 'is_array')));

        usort($stages, fn ($a, $b) => $a['start_word'] <=> $b['start_word']);

        $contiguous = [];
        $cursor = 0;
        foreach ($stages as $index => $stage) {
            $start = max(0, min($count - 1, $stage['start_word']));
            $end = max(0, min($count - 1, $stage['end_word']));
            if ($end < $start) {
                continue;
            }
            $start = max($start, $cursor);
            if ($start > $end) {
                continue;
            }
            if ($index === count($stages) - 1) {
                $end = $count - 1;
            }
            $end = max($end, $start);
            if ($end >= $count) {
                $end = $count - 1;
            }
            $stage['start_word'] = $start;
            $stage['end_word'] = $end;
            $cursor = $end + 1;
            $contiguous[] = $stage;
        }

        if ($contiguous === []) {
            throw new RuntimeException('A análise do vídeo falhou: resposta inválida.');
        }

        $contiguous[0]['start_word'] = 0;
        $lastKey = array_key_last($contiguous);
        $contiguous[$lastKey]['end_word'] = $count - 1;

        $fallbacks = $this->fallbacksFor($language);

        foreach ($contiguous as $index => &$stage) {
            $stage['title'] = mb_substr(
                $stage['title'] !== '' ? $stage['title'] : ($fallbacks['titles'][$stage['key']] ?? 'Body'),
                0,
                40
            );
            $stage['label'] = mb_strtoupper(mb_substr(
                $stage['label'] !== '' ? $stage['label'] : ($fallbacks['labels'][$stage['key']] ?? 'BODY'),
                0,
                24
            ));
            $stage['video_note'] = mb_substr($stage['video_note'], 0, 70);
            $stage['video_note_side'] = $stage['video_note_side'] ?? (($index % 2 === 0) ? 'left' : 'right');

            $keptNotes = [];
            foreach ($stage['notes'] as $note) {
                if (! is_array($note)) {
                    continue;
                }
                $from = (int) ($note['from_word'] ?? $note['from'] ?? -1);
                $to = (int) ($note['to_word'] ?? $note['to'] ?? -1);
                $text = (string) ($note['text'] ?? '');
                if ($from < $stage['start_word'] || $to > $stage['end_word'] || $from > $to) {
                    continue;
                }
                // An underline marks a key phrase, never a whole sentence.
                $to = min($to, $from + 7);
                $keptNotes[] = [
                    'from_word' => $from,
                    'to_word' => $to,
                    'text' => mb_substr($text, 0, 60),
                ];
                if (count($keptNotes) >= 2) {
                    break;
                }
            }
            $stage['notes'] = $keptNotes;
        }
        unset($stage);

        $splitStages = [];
        foreach ($contiguous as $stage) {
            $startTime = (float) $words[$stage['start_word']]['start'];
            $endTime = (float) $words[$stage['end_word']]['end'];
            $duration = $endTime - $startTime;

            if ($duration <= 20.0) {
                $splitStages[] = $stage;

                continue;
            }

            $chunkStart = $stage['start_word'];
            while ($chunkStart <= $stage['end_word']) {
                $chunkStartTime = (float) $words[$chunkStart]['start'];
                $maxEndTime = $chunkStartTime + 15.0;
                $chunkEnd = $chunkStart;

                for ($i = $chunkStart; $i <= $stage['end_word']; $i++) {
                    if ((float) $words[$i]['end'] <= $maxEndTime) {
                        $chunkEnd = $i;
                    } else {
                        break;
                    }
                }

                for ($i = $chunkEnd; $i >= $chunkStart; $i--) {
                    $wordText = (string) $words[$i]['word'];
                    if (preg_match('/[.?!]$/', $wordText) && (float) $words[$i]['end'] <= $maxEndTime) {
                        $chunkEnd = $i;
                        break;
                    }
                }

                $chunk = $stage;
                $chunk['start_word'] = $chunkStart;
                $chunk['end_word'] = $chunkEnd;

                $chunkNotes = [];
                foreach ($stage['notes'] as $note) {
                    if ($note['from_word'] >= $chunkStart && $note['to_word'] <= $chunkEnd) {
                        $chunkNotes[] = $note;
                    }
                }
                $chunk['notes'] = array_slice($chunkNotes, 0, 2);

                if ($chunkStart !== $stage['start_word']) {
                    $chunk['video_note'] = '';
                }

                $splitStages[] = $chunk;
                $chunkStart = $chunkEnd + 1;
            }
        }

        if (count($splitStages) > 9) {
            $firstNine = array_slice($splitStages, 0, 9);
            $tail = array_slice($splitStages, 9);
            $mergeTarget = $firstNine[8];
            $mergeTarget['end_word'] = end($tail)['end_word'] ?? $mergeTarget['end_word'];

            $mergedNotes = $mergeTarget['notes'];
            foreach ($tail as $tailStage) {
                foreach ($tailStage['notes'] as $note) {
                    $mergedNotes[] = $note;
                    if (count($mergedNotes) >= 2) {
                        $mergedNotes = array_slice($mergedNotes, 0, 2);
                        break 2;
                    }
                }
            }
            $mergeTarget['notes'] = $mergedNotes;
            $firstNine[8] = $mergeTarget;
            $splitStages = $firstNine;
        }

        foreach ($splitStages as $index => &$stage) {
            $stage['video_note_side'] = $index % 2 === 0 ? 'left' : 'right';
        }
        unset($stage);

        foreach ($splitStages as &$stage) {
            $stage['start'] = (float) $words[$stage['start_word']]['start'];
            $stage['end'] = (float) $words[$stage['end_word']]['end'];
        }
        unset($stage);

        $summary = (string) ($data['summary'] ?? '');
        $niche = (string) ($data['niche'] ?? '');
        $caption = isset($data['caption']) && is_string($data['caption']) && $data['caption'] !== ''
            ? $data['caption']
            : $summary;

        $result = [
            'niche' => $niche,
            'summary' => $summary,
            'caption' => $caption,
            'stages' => $splitStages,
        ];

        array_walk_recursive($result, function (&$value): void {
            if (is_string($value)) {
                $value = str_replace('—', ', ', $value);
            }
        });

        return $result;
    }

    private function decodeJson(string $text): array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*/', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);

        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $start > $end) {
            throw new RuntimeException('A análise do vídeo falhou: resposta inválida.');
        }

        $json = substr($text, $start, $end - $start + 1);
        $data = json_decode($json, true);

        if (! is_array($data)) {
            throw new RuntimeException('A análise do vídeo falhou: resposta inválida.');
        }

        return $data;
    }

    /**
     * @return array{titles: array<string, string>, labels: array<string, string>}
     */
    private function fallbacksFor(string $language): array
    {
        if ($language === 'English') {
            return [
                'titles' => [
                    'hook' => 'The Hook',
                    'open_loop' => 'The Open Loop',
                    'micro_commitment' => 'The Micro-commitment',
                    'body' => 'The Body',
                    'payoff' => 'The Payoff',
                    'cta' => 'The CTA',
                    'loop' => 'The Loop',
                ],
                'labels' => [
                    'hook' => 'HOOK',
                    'open_loop' => 'OPEN LOOP',
                    'micro_commitment' => 'MICRO-COMMITMENT',
                    'body' => 'BODY',
                    'payoff' => 'PAYOFF',
                    'cta' => 'CTA',
                    'loop' => 'LOOP',
                ],
            ];
        }

        return [
            'titles' => [
                'hook' => 'O Gancho',
                'open_loop' => 'O Loop Aberto',
                'micro_commitment' => 'O Micro-compromisso',
                'body' => 'O Corpo',
                'payoff' => 'A Recompensa',
                'cta' => 'O CTA',
                'loop' => 'O Loop',
            ],
            'labels' => [
                'hook' => 'GANCHO',
                'open_loop' => 'LOOP ABERTO',
                'micro_commitment' => 'MICRO-COMPROMISSO',
                'body' => 'CORPO',
                'payoff' => 'RECOMPENSA',
                'cta' => 'CTA',
                'loop' => 'LOOP',
            ],
        ];
    }

    private function normalizeKey(mixed $key): string
    {
        $allowed = ['hook', 'open_loop', 'micro_commitment', 'body', 'payoff', 'cta', 'loop'];

        return in_array($key, $allowed, true) ? $key : 'body';
    }

    /**
     * @param  array{text: string, language: ?string, duration: float, words: list<array{word: string, start: float, end: float}>}  $transcript
     * @param  array<string, mixed>  $source
     */
    private function buildUserText(array $transcript, string $frameNotes, array $source, string $language): string
    {
        $lines = [];
        $lines[] = 'Language: '.$language;
        $lines[] = '';

        if (isset($source['caption']) && is_string($source['caption']) && $source['caption'] !== '') {
            $lines[] = 'Video caption: '.$source['caption'];
        }

        $lines[] = 'Views: '.($source['views'] ?? 0);
        $lines[] = 'Author handle: '.($source['author']['handle'] ?? '');
        $lines[] = '';

        if (trim($frameNotes) !== '') {
            $lines[] = 'What is visible on screen, by timestamp (written by a vision model; use it for video_note):';
            $lines[] = trim($frameNotes);
        } else {
            $lines[] = "Nothing is known about the visuals, so set video_note to '' for every stage.";
        }

        $lines[] = '';
        $lines[] = 'Transcript with word timestamps (index|start|end|word):';
        foreach ($transcript['words'] as $index => $word) {
            $lines[] = $index.'|'
                .number_format((float) $word['start'], 2, '.', '').'|'
                .number_format((float) $word['end'], 2, '.', '').'|'
                .$word['word'];
        }

        return implode("\n", $lines);
    }

    private function systemPrompt(string $language): string
    {
        return <<<PROMPT
You are a short-form video strategist who reverse-engineers why a video went viral.

Output ONLY one JSON object with the following shape:
{
  "niche": string (2-4 words in {$language}, Title Case, e.g. "Science-Based Bodybuilding" or "Dicas de Faculdade"),
  "summary": string (one sentence why it worked),
  "caption": string (Instagram caption for OUR breakdown carousel, 2-4 short lines, ends asking the reader to comment a keyword, no hashtags, no em dash),
  "stages": [
    {
      "key": "hook|open_loop|micro_commitment|body|payoff|cta|loop",
      "title": string (2-3 words in {$language}),
      "label": string (uppercase short version),
      "start_word": int,
      "end_word": int,
      "video_note": string (<= 7 words in {$language} about a visible editing/visual technique) or "",
      "video_note_side": "left" | "right",
      "notes": [
        {
          "from_word": int,
          "to_word": int,
          "text": string (<= 6 words in {$language})
        }
      ]
    }
  ]
}

Rules:
- stages are contiguous, in order, cover every word from 0 to last;
- 4 to 8 stages;
- first stage key 'hook';
- use the retention vocabulary: hook, open_loop (a promise/question that is paid off later), micro_commitment (makes the viewer rank/compare themselves or answer mentally), body (the value; split long bodies into several 'body' stages of 6-15 s each), payoff (delivers the promise), cta, loop (the ending that sends you back to the start).
- Do not invent stages that are not there.
- title: 2-3 words in {$language} written like "The Hook", "The Open Loop", "The Body", "The Payoff" (in Portuguese: "O Gancho", "O Loop Aberto", "O Micro-compromisso", "O Corpo", "A Recompensa", "O CTA", "O Loop").
- label: uppercase short version ("HOOK"/"GANCHO").
- notes: 0-2 per stage, each underlines the exact 1-6 consecutive words that carry the technique (a key phrase, never a whole sentence) INSIDE that stage and explains the persuasion technique in <= 6 words in {$language} (e.g. "Sexual innuendo", "Open loop: introduced advice").
- video_note: <= 7 words in {$language} naming a visible editing/visual technique from the on-screen notes whose timestamps fall inside that stage (on-screen text, punch-in, cut, prop, product shown; e.g. "Blur timer creates an open loop", "Punch-in on the key line"), or '' if nothing notable. Never invent visuals that are not in the notes.
- video_note_side 'left' or 'right' (alternate).
- All text fields in {$language}; never use the em dash character.
PROMPT;
    }
}
