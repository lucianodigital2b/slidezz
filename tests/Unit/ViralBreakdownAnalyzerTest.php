<?php

namespace Tests\Unit;

use App\Services\AI\ViralBreakdownAnalyzer;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class ViralBreakdownAnalyzerTest extends TestCase
{
    public function test_normalize_makes_gaps_and_overlaps_contiguous(): void
    {
        $words = $this->words(10);
        $analyzer = new ViralBreakdownAnalyzer;

        $raw = json_encode([
            'summary' => 'Test summary',
            'stages' => [
                ['key' => 'hook', 'title' => 'Hook', 'label' => 'HOOK', 'start_word' => 3, 'end_word' => 5, 'video_note' => '', 'notes' => []],
                ['key' => 'body', 'title' => 'Body', 'label' => 'BODY', 'start_word' => 0, 'end_word' => 2, 'video_note' => '', 'notes' => []],
            ],
        ]);

        $result = $analyzer->normalize($raw, $words, 'English');

        $this->assertSame(0, $result['stages'][0]['start_word']);
        $this->assertSame(2, $result['stages'][0]['end_word']);
        $this->assertSame(3, $result['stages'][1]['start_word']);
        $this->assertSame(9, $result['stages'][1]['end_word']);
    }

    public function test_normalize_splits_long_stage_into_chunks_under_15_seconds(): void
    {
        $words = $this->words(100, true);
        $analyzer = new ViralBreakdownAnalyzer;

        $raw = json_encode([
            'summary' => 'Split test',
            'stages' => [
                ['key' => 'body', 'title' => 'Body', 'label' => 'BODY', 'start_word' => 0, 'end_word' => 99, 'video_note' => '', 'notes' => []],
            ],
        ]);

        $result = $analyzer->normalize($raw, $words, 'English');
        $stages = $result['stages'];

        $this->assertGreaterThan(1, count($stages));

        $nextWord = 0;
        foreach ($stages as $stage) {
            $this->assertLessThanOrEqual(15, $stage['end'] - $stage['start']);
            $this->assertSame($nextWord, $stage['start_word']);
            $nextWord = $stage['end_word'] + 1;
        }
        $this->assertSame(100, $nextWord);
    }

    public function test_normalize_drops_notes_outside_stage(): void
    {
        $words = $this->words(20);
        $analyzer = new ViralBreakdownAnalyzer;

        $raw = json_encode([
            'summary' => 'Note test',
            'stages' => [
                [
                    'key' => 'hook',
                    'title' => 'Hook',
                    'label' => 'HOOK',
                    'start_word' => 0,
                    'end_word' => 10,
                    'video_note' => '',
                    'notes' => [
                        ['from_word' => 12, 'to_word' => 14, 'text' => 'Outside note'],
                        ['from_word' => 6, 'to_word' => 8, 'text' => 'Inside note'],
                    ],
                ],
                ['key' => 'body', 'title' => 'Body', 'label' => 'BODY', 'start_word' => 11, 'end_word' => 19, 'video_note' => '', 'notes' => []],
            ],
        ]);

        $result = $analyzer->normalize($raw, $words, 'English');
        $notes = $result['stages'][0]['notes'];

        $this->assertCount(1, $notes);
        $this->assertSame(6, $notes[0]['from_word']);
        $this->assertSame(8, $notes[0]['to_word']);
    }

    public function test_normalize_replaces_em_dashes(): void
    {
        $words = $this->words(5);
        $analyzer = new ViralBreakdownAnalyzer;

        $raw = json_encode([
            'summary' => 'Em dash — test',
            'stages' => [
                ['key' => 'hook', 'title' => 'Hook — Test', 'label' => 'HOOK', 'start_word' => 0, 'end_word' => 4, 'video_note' => '', 'notes' => []],
            ],
        ]);

        $result = $analyzer->normalize($raw, $words, 'English');

        $this->assertStringNotContainsString('—', $result['summary']);
        $this->assertStringContainsString(', ', $result['summary']);
        $this->assertStringNotContainsString('—', $result['stages'][0]['title']);
    }

    public function test_normalize_throws_for_invalid_json(): void
    {
        $analyzer = new ViralBreakdownAnalyzer;

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('A análise do vídeo falhou: resposta inválida.');

        $analyzer->normalize('not a json', $this->words(3), 'English');
    }

    /**
     * @param  bool  $withPunctuation  Add '.' to every 10th word if true.
     * @return list<array{word: string, start: float, end: float}>
     */
    private function words(int $count, bool $withPunctuation = false): array
    {
        $words = [];

        for ($i = 0; $i < $count; $i++) {
            $text = 'word'.$i;
            if ($withPunctuation && ($i + 1) % 10 === 0) {
                $text .= '.';
            }

            $words[] = [
                'word' => $text,
                'start' => $i * 0.4,
                'end' => ($i + 1) * 0.4,
            ];
        }

        return $words;
    }
}
