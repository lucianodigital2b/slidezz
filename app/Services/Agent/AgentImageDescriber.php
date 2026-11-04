<?php

namespace App\Services\Agent;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Media\Image;

/**
 * Turns an image into text for agent models that can't read images
 * (DeepSeek): transcribes every visible word and describes the photo and
 * layout, so the agent can still recreate a carousel slide by slide.
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

    public function describe(string $base64, string $mediaType = 'image/jpeg'): string
    {
        return Cache::remember('agent-image-description:'.md5($base64), now()->addDays(7), function () use ($base64, $mediaType): string {
            try {
                $response = Prism::text()
                    ->using(Provider::OpenAI, config('services.openai.vision_model', 'gpt-4o-mini'))
                    ->withPrompt(self::PROMPT, [Image::fromBase64($base64, $mediaType)])
                    ->withClientOptions(['timeout' => 60])
                    ->generate();

                return trim($response->text);
            } catch (\Throwable $e) {
                Log::warning('[Agent] Image description failed', ['message' => $e->getMessage()]);

                return 'não foi possível descrever esta imagem';
            }
        });
    }
}
