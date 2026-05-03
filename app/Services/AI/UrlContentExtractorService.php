<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

class UrlContentExtractorService
{
    /**
     * @return array{title: string, description: string, topic: string}
     *
     * @throws \RuntimeException
     */
    public function extract(string $url, string $type): array
    {
        return match ($type) {
            'youtube' => $this->extractYoutube($url),
            'instagram' => throw new \RuntimeException('Instagram não suporta extração automática. Copie o texto do post e cole no campo descrição.'),
            'blog' => $this->extractBlog($url),
            default => throw new \InvalidArgumentException("Unsupported type: {$type}"),
        };
    }

    /** @return array{title: string, description: string, topic: string} */
    private function extractYoutube(string $url): array
    {
        try {
            $oembed = Http::timeout(8)->get('https://www.youtube.com/oembed', [
                'url' => $url,
                'format' => 'json',
            ])->json();
        } catch (\Exception) {
            throw new \RuntimeException('Não foi possível acessar o vídeo do YouTube.');
        }

        $title = $oembed['title'] ?? '';
        $author = $oembed['author_name'] ?? '';

        return [
            'title' => $title,
            'description' => $author ? "Canal: {$author}" : '',
            'topic' => $title,
        ];
    }

    /** @return array{title: string, description: string, topic: string} */
    private function extractBlog(string $url): array
    {
        try {
            $html = Http::timeout(10)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; SlidezzBot/1.0)',
            ])->get($url)->body();
        } catch (\Exception) {
            throw new \RuntimeException('Não foi possível acessar a URL informada.');
        }

        preg_match('/<title[^>]*>(.*?)<\/title>/si', $html, $titleMatch);
        preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/si', $html, $descMatch);

        $title = html_entity_decode(trim($titleMatch[1] ?? ''), ENT_QUOTES, 'UTF-8');
        $metaDesc = html_entity_decode(trim($descMatch[1] ?? ''), ENT_QUOTES, 'UTF-8');
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags($html)) ?? '');
        $truncated = mb_substr($plain, 0, 2000);

        $result = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4o-mini')
            ->withSystemPrompt('Você extrai conteúdo de páginas web para carrosséis do Instagram. Responda APENAS com JSON válido, sem markdown.')
            ->withPrompt("Extraia: título curto (max 10 palavras) e descrição resumida (max 100 palavras) para um carrossel.\n\nTítulo: {$title}\nMeta: {$metaDesc}\nTexto: {$truncated}\n\nJSON: {\"title\": \"\", \"description\": \"\", \"topic\": \"\"}")
            ->generate();

        $data = json_decode(trim($result->text), true);

        if (! is_array($data)) {
            return [
                'title' => $title,
                'description' => $metaDesc,
                'topic' => trim($title.' '.$metaDesc),
            ];
        }

        return $data;
    }
}
