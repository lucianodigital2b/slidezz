<?php

namespace App\Services\AI;

use App\Contracts\ScriptGenerator;
use Illuminate\Support\Facades\Http;

class OpenAIScriptGenerator implements ScriptGenerator
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    public function generate(string $topic, string $format = 'tiktok'): array
    {
        $prompt = "You are an expert TikTok creator. Create a viral script for a short-form video about '{$topic}'. "
            . "Format the output as a JSON array where each object has a 'text' (what is said) and 'visual' (what is shown).";

        $response = Http::withToken($this->apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => 'You output strictly valid JSON arrays without markdown wrappers.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'response_format' => ['type' => 'json_object'],
            ]);

        $data = $response->json();
        
        return json_decode($data['choices'][0]['message']['content'], true) ?? [];
    }
}