<?php

namespace App\Contracts;

interface VoiceGenerator
{
    /**
     * Convert text to speech and return the local path or URL to the audio file.
     */
    public function synthesize(string $text, string $voiceId = 'default'): string;
}