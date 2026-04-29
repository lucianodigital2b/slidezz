<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;

class CarouselWizardController extends Controller
{
    public function create(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $carouselConfig = data_get($workspace?->profile, 'carousel');

        return Inertia::render('CreateCarousel', [
            'workspaceConfig' => $carouselConfig,
        ]);
    }

    public function extractUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:500'],
            'type' => ['required', 'string', 'in:youtube,instagram,blog'],
        ]);

        $url = $validated['url'];
        $type = $validated['type'];

        if ($type === 'youtube') {
            try {
                $oembed = Http::timeout(8)->get('https://www.youtube.com/oembed', [
                    'url' => $url,
                    'format' => 'json',
                ])->json();
            } catch (\Exception $e) {
                return response()->json(['error' => 'Não foi possível acessar o vídeo do YouTube.'], 422);
            }

            $title = $oembed['title'] ?? '';
            $author = $oembed['author_name'] ?? '';

            return response()->json([
                'title' => $title,
                'description' => $author ? "Canal: {$author}" : '',
                'topic' => $title,
            ]);
        }

        if ($type === 'instagram') {
            return response()->json([
                'error' => 'Instagram não suporta extração automática. Copie o texto do post e cole no campo descrição.',
            ], 422);
        }

        // Blog / article: fetch HTML and extract with AI
        try {
            $html = Http::timeout(10)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; SlidezzBot/1.0)',
            ])->get($url)->body();
        } catch (\Exception $e) {
            return response()->json(['error' => 'Não foi possível acessar a URL informada.'], 422);
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
            return response()->json([
                'title' => $title,
                'description' => $metaDesc,
                'topic' => trim($title.' '.$metaDesc),
            ]);
        }

        return response()->json($data);
    }

    public function saveConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template' => ['required', 'string', 'max:100'],
            'archetype' => ['required', 'string', 'max:100'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();
        $profile = $workspace->profile ?? [];
        $profile['carousel'] = [
            'template' => $validated['template'],
            'archetype' => $validated['archetype'],
        ];
        $workspace->update(['profile' => $profile]);

        return response()->json(['success' => true]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:2000'],
            'template' => ['required', 'string', 'max:100'],
            'archetype' => ['required', 'string', 'max:100'],
            'save_config' => ['boolean'],
            'format' => ['nullable', 'string', 'in:post,stories'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        if ($request->boolean('save_config')) {
            $profile = $workspace->profile ?? [];
            $profile['carousel'] = [
                'template' => $validated['template'],
                'archetype' => $validated['archetype'],
            ];
            $workspace->update(['profile' => $profile]);
        }

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'format' => $validated['format'] ?? 'post',
            'slides' => [],
            'prompt' => $validated['topic'],
            'template' => $validated['template'],
        ]);

        $style = $this->buildStyle($validated['template'], $validated['archetype']);

        return redirect()
            ->route('slideshow-editor.edit', $project)
            ->with('wizardTopic', $validated['topic'])
            ->with('wizardStyle', $style);
    }

    private function buildStyle(string $template, string $archetype): string
    {
        $templates = [
            'noir-manifesto' => 'dark gradient overlay, ALL CAPS typography, documentary motivational style',
            'dark-cards' => 'dark background, full-bleed cover photo, rounded image cards on dark slides',
            'pop-magazine' => 'giant Anton typography, red highlight words, pop culture magazine maximum visual impact',
            'twitter-x' => 'white background, large bold text, clean minimal editorial style',
            'acid-brutalist' => 'black background, massive Montserrat 900, acid green accent color, outlined text',
            'documentary' => 'vintage investigative journalism aesthetic, Playfair Display serif, film grain texture',
        ];

        $archetypes = [
            'disruptor-social' => 'shocking social phenomenon that reveals a serious consequence hook',
            'poder-oculto' => 'hidden power exposé revealing why a group acts while the vulnerable suffers hook',
            'paradoxo-social' => 'counter-intuitive statement that flips conventional wisdom hook',
            'profecia-provocativa' => 'authoritative prophecy fulfilled hook, revelation that surprises everyone',
            'estrategia-inusitada' => 'unusual winning strategy used by an unexpected person or brand hook',
            'autoridade-cientifica' => 'scientific authority proves a surprising result with clear cause hook',
        ];

        $templateStyle = $templates[$template] ?? $template;
        $archetypeStyle = $archetypes[$archetype] ?? $archetype;

        return "{$templateStyle}. Hook archetype: {$archetypeStyle}.";
    }
}
