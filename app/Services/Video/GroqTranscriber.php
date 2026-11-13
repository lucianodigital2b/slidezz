<?php

namespace App\Services\Video;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Groq Whisper transcription contract shared by the auto-editor and the other
 * new features. Accepts video files, extracts audio, and returns word-level
 * timestamps.
 */
class GroqTranscriber
{
    private const MAX_MP3_BYTES = 24 * 1024 * 1024;

    public function __construct(private AudioExtractor $extractor) {}

    public function isConfigured(): bool
    {
        return filled(config('services.groq.api_key'));
    }

    /**
     * @return array{text: string, language: ?string, duration: float, words: list<array{word: string, start: float, end: float}>}
     */
    public function transcribe(string $localMediaPath, ?string $language = null): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Falta configurar a transcrição (GROQ_API_KEY).');
        }

        $audioPath = null;

        try {
            $audioPath = $this->extractor->extract($localMediaPath);

            if (filesize($audioPath) > self::MAX_MP3_BYTES) {
                throw new RuntimeException('O áudio extraído ultrapassa o limite de 24 MB para transcrição.');
            }

            $fields = [
                'model' => config('services.groq.transcription_model', 'whisper-large-v3-turbo'),
                'response_format' => 'verbose_json',
                'timestamp_granularities[]' => 'word',
                'timestamp_granularities[]' => 'segment',
                'temperature' => 0,
            ];

            if ($language !== null) {
                $fields['language'] = $language;
            }

            $response = Http::baseUrl('https://api.groq.com/openai/v1')
                ->withToken((string) config('services.groq.api_key'))
                ->timeout(300)
                ->asMultipart()
                ->attach('file', fopen($audioPath, 'r'), 'audio.mp3')
                ->post('/audio/transcriptions', $fields);

            if ($response->failed()) {
                throw new RuntimeException('Transcription request failed: '.$response->body());
            }

            $data = $response->json();

            if (! is_array($data) || ! isset($data['words'])) {
                throw new RuntimeException('Transcription response is missing word timestamps.');
            }

            $words = array_values(array_map(
                fn (array $word): array => [
                    'word' => (string) ($word['word'] ?? ''),
                    'start' => (float) ($word['start'] ?? 0),
                    'end' => (float) ($word['end'] ?? 0),
                ],
                array_filter((array) $data['words'], fn ($word): bool => is_array($word) && isset($word['word'], $word['start'], $word['end'])),
            ));

            if ($words === []) {
                throw new RuntimeException('Transcription response contained no usable words.');
            }

            return [
                'text' => (string) ($data['text'] ?? implode(' ', array_column($words, 'word'))),
                'language' => isset($data['language']) ? (string) $data['language'] : null,
                'duration' => (float) ($data['duration'] ?? 0),
                'words' => $words,
            ];
        } catch (ConnectionException $e) {
            throw new RuntimeException('Transcription request timed out.', 0, $e);
        } finally {
            if ($audioPath && is_file($audioPath)) {
                unlink($audioPath);
            }
        }
    }

    public function probeDuration(string $path): float
    {
        $ffprobe = str_replace('ffmpeg', 'ffprobe', config('services.ffmpeg.binary', 'ffmpeg'));

        $result = \Illuminate\Support\Facades\Process::path(base_path())
            ->timeout(30)
            ->run([$ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', $path]);

        if ($result->failed()) {
            throw new RuntimeException('Could not probe media duration.');
        }

        return (float) trim($result->output());
    }
}
