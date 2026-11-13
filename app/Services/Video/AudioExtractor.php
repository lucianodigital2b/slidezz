<?php

namespace App\Services\Video;

use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * Extracts a 16 kHz mono MP3 from an uploaded video or audio file, which is
 * the format Groq's transcription endpoint accepts.
 */
class AudioExtractor
{
    public function extract(string $mediaPath): string
    {
        $outputPath = tempnam(sys_get_temp_dir(), 'slidezz_audio_').'.mp3';
        // tempnam creates a file without extension; we want .mp3 for ffmpeg.
        if ($outputPath === false) {
            throw new RuntimeException('Could not create a temporary audio file.');
        }

        $command = [
            config('services.ffmpeg.binary', 'ffmpeg'),
            '-y',
            '-i',
            $mediaPath,
            '-vn',
            '-ac',
            '1',
            '-ar',
            '16000',
            '-b:a',
            '48k',
            $outputPath,
        ];

        $result = Process::path(base_path())
            ->timeout((int) config('services.ffmpeg.timeout', 600))
            ->run($command);

        if ($result->failed() || ! is_file($outputPath)) {
            if (is_file($outputPath)) {
                unlink($outputPath);
            }

            $details = trim($result->errorOutput()) ?: trim($result->output());

            throw new RuntimeException('Audio extraction failed: '.$details);
        }

        return $outputPath;
    }
}
