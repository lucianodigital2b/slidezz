<?php

namespace App\Services\Video;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Turns contact sheets (FrameSampler) into a timestamped text list of what is visible on screen,
 * so a text-only model can write the breakdown's video notes. Groq vision, same key as transcription.
 * Never fails the breakdown: without notes the slides just skip the video annotation.
 */
class FrameDescriber
{
    /**
     * @param  list<string>  $sheetPaths
     */
    public function describe(array $sheetPaths): string
    {
        $apiKey = (string) config('services.groq.api_key');

        if ($apiKey === '' || $sheetPaths === []) {
            return '';
        }

        $content = [[
            'type' => 'text',
            'text' => 'Contact sheets of a short vertical video. Each sheet is 2x2 frames; each frame has its timestamp in yellow at the top-left. '
                .'For EACH timestamp write one line "<time> s: ..." on what is visibly done in the edit: on-screen text (quote it), caption style, zoom or punch-in, cut, prop, product or app shown, b-roll, graphic. '
                ."Only describe what you can actually see. Write 'same as previous' when nothing changed. No intro, no summary.",
        ]];

        foreach (array_slice($sheetPaths, 0, 3) as $path) {
            $content[] = [
                'type' => 'image_url',
                'image_url' => ['url' => 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents($path))],
            ];
        }

        try {
            $response = Http::baseUrl('https://api.groq.com/openai/v1')
                ->withToken($apiKey)
                ->timeout(90)
                ->post('/chat/completions', [
                    'model' => config('services.groq.vision_model', 'qwen/qwen3.8-27b'),
                    'max_tokens' => 900,
                    'temperature' => 0.2,
                    'messages' => [['role' => 'user', 'content' => $content]],
                ]);

            if ($response->failed()) {
                Log::warning('[Breakdown] Frame description failed', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 500)]);

                return '';
            }

            return trim((string) $response->json('choices.0.message.content'));
        } catch (\Throwable $e) {
            Log::warning('[Breakdown] Frame description failed', ['message' => $e->getMessage()]);

            return '';
        }
    }
}
