<?php

namespace App\Services\AI;

use App\Contracts\VoiceGenerator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ElevenLabsVoiceGenerator implements VoiceGenerator
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.elevenlabs.api_key');
    }

    public function synthesize(string $text, string $voiceId = 'default'): string
    {
        $voiceId = $voiceId === 'default' ? config('services.elevenlabs.default_voice_id', '21m00Tcm4TlvDq8ikWAM') : $voiceId;
        
        $response = Http::withHeaders([
            'xi-api-key' => $this->apiKey,
        ])->post("https://api.elevenlabs.io/v1/text-to-speech/{$voiceId}", [
            'text' => $text,
            'model_id' => 'eleven_multilingual_v2',
            'voice_settings' => [
                'stability' => 0.5,
                'similarity_boost' => 0.75,
            ]
        ]);

        if ($response->failed()) {
            throw new \Exception('ElevenLabs API Error: ' . $response->body());
        }

        $fileName = 'audio/' . Str::random(40) . '.mp3';
        Storage::disk('public')->put($fileName, $response->body());

        return Storage::url($fileName);
    }
}