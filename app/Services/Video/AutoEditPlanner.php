<?php

namespace App\Services\Video;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

/**
 * Turns a raw talking-head transcription into a cleaned-up timeline plan:
 * which ranges to keep, where to punch in, and word-level captions.
 */
class AutoEditPlanner
{
    /**
     * @param  array{text: string, language: ?string, duration: float, words: list<array{word: string, start: float, end: float}>}  $transcript
     * @return array{keep: list<array{start: float, end: float}>, zooms: list<array{start: float, end: float}>, captions: list<array{text: string, start: float, end: float, words: list<array{text: string, start: float, end: float, highlight: bool}>}>}
     */
    public function plan(array $transcript, float $duration, string $language): array
    {
        $words = $transcript['words'];
        $utterances = $this->splitIntoUtterances($words, $duration);

        try {
            $selection = $this->deepseekSelection($this->buildSegments($words));
        } catch (\Throwable $e) {
            \Log::warning('[AutoEdit] LLM selection failed; using deterministic cuts only', [
                'message' => $e->getMessage(),
            ]);
            $selection = ['drop' => [], 'emphasis' => [], 'emphasis_words' => []];
        }

        $dropIntervals = $this->intervalsForIndexes($words, $selection['drop']);
        $keep = $this->subtractIntervals($utterances, $dropIntervals);
        $keep = $this->mergeRanges($keep, 0.15);
        $keep = $this->clampKeepRanges($keep, $duration);
        $keep = array_map(fn (array $range): array => ['start' => round($range['start'], 3), 'end' => round($range['end'], 3)], $keep);

        $zooms = $this->intervalsForIndexes($words, $selection['emphasis']);
        $zooms = $this->intersectWithKeep($zooms, $keep);
        $zooms = $this->mergeRanges($zooms, 0.15);

        $keptWords = $this->wordsInRanges($words, $keep);
        $highlightWords = array_fill_keys(array_map('mb_strtolower', $selection['emphasis_words']), true);

        $captions = $this->chunkCaptions($keptWords, $highlightWords, $keep);

        return [
            'keep' => $keep,
            'zooms' => $zooms,
            'captions' => $captions,
        ];
    }

    /**
     * Remaps a source-time point to output timeline time given the kept ranges.
     */
    public static function remap(float $sourceTime, array $keep): ?float
    {
        $output = 0.0;

        foreach ($keep as $range) {
            if ($sourceTime < $range['start']) {
                return null;
            }

            if ($sourceTime <= $range['end']) {
                return $output + ($sourceTime - $range['start']);
            }

            $output += $range['end'] - $range['start'];
        }

        return null;
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @return list<array{start: float, end: float}>
     */
    private function splitIntoUtterances(array $words, float $duration): array
    {
        if ($words === []) {
            return [];
        }

        $utterances = [];
        $currentStart = max(0.0, $words[0]['start'] - 0.12);
        $currentEnd = $words[0]['end'] + 0.12;

        for ($i = 1; $i < count($words); $i++) {
            $gap = $words[$i]['start'] - $words[$i - 1]['end'];

            if ($gap > 0.6) {
                $utterances[] = ['start' => $currentStart, 'end' => min($duration, $currentEnd)];
                $currentStart = max(0.0, $words[$i]['start'] - 0.12);
            }

            $currentEnd = $words[$i]['end'] + 0.12;
        }

        $utterances[] = ['start' => $currentStart, 'end' => min($duration, $currentEnd)];

        return $utterances;
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @return list<array{index: int, start: float, end: float, text: string}>
     */
    private function buildSegments(array $words): array
    {
        $segments = [];
        $current = null;

        foreach ($words as $word) {
            $punctuation = preg_match('/[.!?\p{P}]$/u', $word['word']) === 1;

            if ($current === null) {
                $current = [
                    'index' => 0,
                    'start' => $word['start'],
                    'end' => $word['end'],
                    'words' => [$word['word']],
                ];
            }

            if (! $punctuation && $word['start'] - end($current['words']) === 0) {
                // placeholder, never hit because we are iterating words, not word text
            }

            // Simplified: break on punctuation or gap greater than 0.8s
            $previousWord = $current['words'] ? end($current['words']) : null;
            if (($current !== null && $word['start'] - $previousWord['end'] > 0.8) || $punctuation && $current !== null && count($current['words']) > 0) {
                $segments[] = [
                    'index' => count($segments),
                    'start' => $current['start'],
                    'end' => $current['end'],
                    'text' => implode(' ', $current['words']),
                ];
                $current = null;
            }

            if ($current === null) {
                $current = [
                    'index' => count($segments),
                    'start' => $word['start'],
                    'end' => $word['end'],
                    'words' => [$word['word']],
                ];
            } else {
                $current['end'] = $word['end'];
                $current['words'][] = $word['word'];
            }
        }

        if ($current !== null && $current['words'] !== []) {
            $segments[] = [
                'index' => count($segments),
                'start' => $current['start'],
                'end' => $current['end'],
                'text' => implode(' ', $current['words']),
            ];
        }

        return $segments;
    }

    /**
     * @param  list<array{index: int, start: float, end: float, text: string}>  $segments
     * @return array{drop: list<int>, emphasis: list<int>, emphasis_words: list<string>}
     */
    protected function deepseekSelection(array $segments): array
    {
        $systemPrompt = <<<'PROMPT'
You are a short-form video editor. Given a transcript of a talking-head recording, decide which segments to cut and which moments deserve a punch-in zoom.

Return ONLY a JSON object with this shape:
{"drop":[0,2],"emphasis":[1],"emphasis_words":["word1","word2"]}

Rules:
- drop: indexes of false starts, repeated takes (keep the LAST good take of a repeated sentence), stutters, or filler-only segments like "é...", "tipo", "um", "uh".
- emphasis: up to 1 segment per 8 seconds of video worth a punch-in zoom. Max 1 per 8 seconds.
- emphasis_words: exact words (lowercase) to highlight in captions, max 12.

Use the supplied segment indexes, starts, ends, and texts.
PROMPT;

        $segmentsJson = json_encode($segments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $userPrompt = "Transcript segments:\n{$segmentsJson}";

        $response = $this->runWithFallback($systemPrompt, $userPrompt);

        return $this->parseSelection($response, count($segments));
    }

    private function runWithFallback(string $systemPrompt, string $userPrompt): string
    {
        try {
            return $this->run(Provider::DeepSeek, 'deepseek-chat', $systemPrompt, $userPrompt);
        } catch (\Throwable $e) {
            \Log::warning('[AutoEdit] Primary text provider failed; falling back to OpenAI', [
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

    /**
     * @return array{drop: list<int>, emphasis: list<int>, emphasis_words: list<string>}
     */
    private function parseSelection(string $json, int $segmentCount): array
    {
        $json = trim($json);
        $json = preg_replace('/^```(?:json)?\s*/', '', $json);
        $json = preg_replace('/\s*```$/', '', $json);
        $start = strpos($json, '{');
        $end = strrpos($json, '}');
        if ($start === false || $end === false) {
            throw new \RuntimeException('No JSON object found in LLM response');
        }
        $json = substr($json, $start, $end - $start + 1);
        $data = json_decode($json, true);

        if (! is_array($data)) {
            throw new \RuntimeException('Invalid JSON from LLM');
        }

        $drop = array_values(array_filter(array_map('intval', (array) ($data['drop'] ?? [])), fn ($i): bool => $i >= 0 && $i < $segmentCount));
        $emphasis = array_values(array_filter(array_map('intval', (array) ($data['emphasis'] ?? [])), fn ($i): bool => $i >= 0 && $i < $segmentCount));

        $maxEmphasis = max(1, (int) floor($segmentCount / 2));
        $emphasis = array_slice($emphasis, 0, $maxEmphasis);

        $emphasisWords = array_slice(array_values(array_filter(array_map(fn ($word): string => trim((string) $word), (array) ($data['emphasis_words'] ?? [])), fn ($word): bool => $word !== '')), 0, 12);

        return [
            'drop' => $drop,
            'emphasis' => $emphasis,
            'emphasis_words' => $emphasisWords,
        ];
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @param  list<int>  $indexes
     * @return list<array{start: float, end: float}>
     */
    private function intervalsForIndexes(array $words, array $indexes): array
    {
        $ranges = [];
        foreach ($indexes as $index) {
            $segment = $this->buildSegments($words)[$index] ?? null;
            if ($segment !== null) {
                $ranges[] = ['start' => $segment['start'], 'end' => $segment['end']];
            }
        }

        return $ranges;
    }

    /**
     * @param  list<array{start: float, end: float}>  $keep
     * @param  list<array{start: float, end: float}>  $drop
     * @return list<array{start: float, end: float}>
     */
    private function subtractIntervals(array $keep, array $drop): array
    {
        if ($drop === []) {
            return $keep;
        }

        $drop = $this->mergeRanges($drop, 0.0);

        $result = [];
        foreach ($keep as $range) {
            $cursor = $range['start'];
            foreach ($drop as $interval) {
                if ($interval['end'] <= $range['start']) {
                    continue;
                }
                if ($interval['start'] >= $range['end']) {
                    break;
                }
                if ($interval['start'] > $cursor) {
                    $result[] = ['start' => $cursor, 'end' => $interval['start']];
                }
                $cursor = max($cursor, $interval['end']);
                if ($cursor >= $range['end']) {
                    break;
                }
            }
            if ($cursor < $range['end']) {
                $result[] = ['start' => $cursor, 'end' => $range['end']];
            }
        }

        return $result;
    }

    /**
     * @param  list<array{start: float, end: float}>  $ranges
     * @return list<array{start: float, end: float}>
     */
    private function mergeRanges(array $ranges, float $gap): array
    {
        if ($ranges === []) {
            return [];
        }

        usort($ranges, fn ($a, $b): int => $a['start'] <=> $b['start']);

        $merged = [];
        $current = $ranges[0];

        foreach (array_slice($ranges, 1) as $range) {
            if ($range['start'] <= $current['end'] + $gap) {
                $current['end'] = max($current['end'], $range['end']);
            } else {
                $merged[] = $current;
                $current = $range;
            }
        }
        $merged[] = $current;

        return $merged;
    }

    /**
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{start: float, end: float}>
     */
    private function clampKeepRanges(array $keep, float $duration): array
    {
        return array_values(array_filter(array_map(
            fn (array $range): array => [
                'start' => max(0.0, (float) $range['start']),
                'end' => min($duration, (float) $range['end']),
            ],
            $keep,
        ), fn (array $range): bool => $range['end'] > $range['start']));
    }

    /**
     * @param  list<array{start: float, end: float}>  $zooms
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{start: float, end: float}>
     */
    private function intersectWithKeep(array $zooms, array $keep): array
    {
        $intersections = [];
        foreach ($zooms as $zoom) {
            foreach ($keep as $range) {
                $start = max($zoom['start'], $range['start']);
                $end = min($zoom['end'], $range['end']);
                if ($end - $start > 0.5) {
                    $intersections[] = ['start' => $start, 'end' => $end];
                }
            }
        }

        return $intersections;
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{word: string, start: float, end: float}>
     */
    private function wordsInRanges(array $words, array $keep): array
    {
        return array_values(array_filter($words, function (array $word) use ($keep): bool {
            foreach ($keep as $range) {
                if ($word['start'] >= $range['start'] && $word['end'] <= $range['end']) {
                    return true;
                }
            }

            return false;
        }));
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $words
     * @param  array<string, bool>  $highlightWords
     * @param  list<array{start: float, end: float}>  $keep
     * @return list<array{text: string, start: float, end: float, words: list<array{text: string, start: float, end: float, highlight: bool}>}>
     */
    private function chunkCaptions(array $words, array $highlightWords, array $keep): array
    {
        if ($words === []) {
            return [];
        }

        $captions = [];
        $chunk = [];
        $chunkStart = null;
        $chunkEnd = null;

        foreach ($words as $word) {
            if ($chunk === []) {
                $chunk = [$word];
                $chunkStart = $word['start'];
                $chunkEnd = $word['end'];
                continue;
            }

            $lastWord = end($chunk);
            $gap = $word['start'] - $lastWord['end'];
            $punctuation = preg_match('/[.!?\p{P}]$/u', $lastWord['word']) === 1;
            $duration = $word['end'] - $chunkStart;

            if (count($chunk) >= 3 || $duration > 1.2 || $gap > 0.3 || $punctuation) {
                $captions[] = $this->buildCaption($chunk, $chunkStart, $chunkEnd, $highlightWords);
                $chunk = [$word];
                $chunkStart = $word['start'];
                $chunkEnd = $word['end'];
                continue;
            }

            $chunk[] = $word;
            $chunkEnd = $word['end'];
        }

        if ($chunk !== []) {
            $captions[] = $this->buildCaption($chunk, $chunkStart, $chunkEnd, $highlightWords);
        }

        return $captions;
    }

    /**
     * @param  list<array{word: string, start: float, end: float}>  $chunk
     * @param  array<string, bool>  $highlightWords
     * @return array{text: string, start: float, end: float, words: list<array{text: string, start: float, end: float, highlight: bool}>}
     */
    private function buildCaption(array $chunk, float $start, float $end, array $highlightWords): array
    {
        $words = array_map(fn (array $word): array => [
            'text' => $word['word'],
            'start' => $word['start'],
            'end' => $word['end'],
            'highlight' => isset($highlightWords[mb_strtolower($word['word'])]),
        ], $chunk);

        return [
            'text' => implode(' ', array_column($words, 'text')),
            'start' => $start,
            'end' => $end,
            'words' => $words,
        ];
    }
}
