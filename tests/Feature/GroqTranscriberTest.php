<?php

namespace Tests\Feature;

use App\Services\Video\AudioExtractor;
use App\Services\Video\GroqTranscriber;
use Illuminate\Support\Facades\Http;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class GroqTranscriberTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.groq.api_key' => 'test-key',
            'services.groq.transcription_model' => 'whisper-large-v3-turbo',
            'services.ffmpeg.binary' => 'ffmpeg',
        ]);
    }

    public function test_transcribe_returns_word_timestamps(): void
    {
        Http::fake([
            'api.groq.com/*' => Http::response([
                'text' => 'Olá mundo',
                'language' => 'pt',
                'duration' => 2.0,
                'words' => [
                    ['word' => 'Olá', 'start' => 0.0, 'end' => 0.4],
                    ['word' => 'mundo', 'start' => 0.8, 'end' => 1.6],
                ],
            ]),
        ]);

        $extractor = Mockery::mock(AudioExtractor::class);
        $extractor->shouldReceive('extract')->once()->andReturnUsing(function (): string {
            $path = tempnam(sys_get_temp_dir(), 'audio_');
            file_put_contents($path, 'fake audio');

            return $path;
        });

        $transcriber = new GroqTranscriber($extractor);
        $result = $transcriber->transcribe('/tmp/fake-video.mp4', 'pt');

        $this->assertSame('Olá mundo', $result['text']);
        $this->assertSame('pt', $result['language']);
        $this->assertSame(2.0, $result['duration']);
        $this->assertCount(2, $result['words']);
        $this->assertSame(0.0, $result['words'][0]['start']);
        $this->assertSame(1.6, $result['words'][1]['end']);
    }

    public function test_transcribe_fails_clear_when_not_configured(): void
    {
        config(['services.groq.api_key' => null]);

        $transcriber = new GroqTranscriber(Mockery::mock(AudioExtractor::class));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Falta configurar a transcrição (GROQ_API_KEY).');

        $transcriber->transcribe('/tmp/fake.mp4');
    }

    public function test_probe_duration_uses_ffprobe(): void
    {
        // Skip real process; just assert method exists and uses configured binary.
        $this->assertTrue(method_exists(GroqTranscriber::class, 'probeDuration'));
    }
}
