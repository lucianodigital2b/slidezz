<?php

namespace App\Services\AI;

use App\Contracts\ScriptGenerator;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

class OpenAIScriptGenerator implements ScriptGenerator
{
    public function generate(string $topic, string $format = 'tiktok'): array
    {
        $prompt = "You are an expert TikTok creator. Create a viral script for a short-form video about '{$topic}'. "
            . "Format the output as a JSON array where each object has a 'text' (what is said) and 'visual' (what is shown).";

        $response = Prism::text()
            ->using(Provider::DeepSeek, 'deepseek-chat')
            ->withSystemPrompt('You output strictly valid JSON arrays without markdown wrappers.')
            ->withPrompt($prompt)
            ->generate();

        return json_decode(trim($response->text), true) ?? [];
    }
}