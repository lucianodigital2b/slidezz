<?php

namespace App\Services\Agent;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Turns images into text for agent models that can't read images
 * (DeepSeek): transcribes every visible word and describes the photo and
 * layout, so the agent can still recreate a carousel slide by slide.
 * New images are described in parallel; descriptions are cached.
 */
class AgentImageDescriber
{
    private const PROMPT = <<<'TXT'
        Esta imagem é um slide de carrossel/slideshow (ou uma foto candidata a fundo de slide).
        Descreva para alguém que não pode vê-la:
        1. TEXTO: transcreva literalmente todo texto visível, na língua original, na ordem de leitura. Se não houver texto, escreva "nenhum".
        2. IMAGEM: em 1-2 frases, o que a foto mostra, cores dominantes e clima.
        3. LAYOUT: posição e tamanho do texto (topo/meio/base, grande/pequeno), fonte (serifada, sans, manuscrita), cor do texto e se tem caixa/contorno atrás.
        Responda só com os 3 itens, sem introdução.
        TXT;

    private const FALLBACK = 'não foi possível descrever esta imagem';

    /**
     * @param  array<string, array{data: string, media_type: string}>  $images  keyed by any id
     * @return array<string, string> descriptions keyed by the same ids
     */
    public function describeMany(array $images): array
    {
        $descriptions = [];
        $missing = [];

        foreach ($images as $id => $image) {
            $cached = Cache::get($this->cacheKey($image['data']));

            if (is_string($cached)) {
                $descriptions[$id] = $cached;
            } else {
                $missing[$id] = $image;
            }
        }

        foreach (array_chunk($missing, 8, true) as $chunk) {
            $responses = Http::pool(fn (Pool $pool) => array_map(
                fn (string $id) => $pool->as($id)
                    ->withToken((string) config('services.openai.api_key'))
                    ->timeout(60)
                    ->post('https://api.openai.com/v1/chat/completions', $this->payload($chunk[$id])),
                array_keys($chunk),
            ));

            foreach ($chunk as $id => $image) {
                $text = $this->textFrom($responses[$id] ?? null);
                $descriptions[$id] = $text ?? self::FALLBACK;

                if ($text !== null) {
                    Cache::put($this->cacheKey($image['data']), $text, now()->addDays(7));
                }
            }
        }

        return $descriptions;
    }

    /**
     * @param  array{data: string, media_type: string}  $image
     * @return array<string, mixed>
     */
    private function payload(array $image): array
    {
        return [
            'model' => config('services.openai.vision_model', 'gpt-4o-mini'),
            'max_tokens' => 400,
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => self::PROMPT],
                    ['type' => 'image_url', 'image_url' => [
                        'url' => 'data:'.$image['media_type'].';base64,'.$image['data'],
                        'detail' => 'low',
                    ]],
                ],
            ]],
        ];
    }

    private function textFrom(mixed $response): ?string
    {
        if (! $response instanceof Response || ! $response->successful()) {
            Log::warning('[Agent] Image description failed', [
                'status' => $response instanceof Response ? $response->status() : null,
                'error' => $response instanceof \Throwable ? $response->getMessage() : null,
            ]);

            return null;
        }

        $text = trim((string) $response->json('choices.0.message.content'));

        return $text === '' ? null : $text;
    }

    private function cacheKey(string $base64): string
    {
        return 'agent-image-description:'.md5($base64);
    }
}
