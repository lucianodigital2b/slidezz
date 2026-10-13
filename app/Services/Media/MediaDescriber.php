<?php

namespace App\Services\Media;

use App\Models\MediaLibraryItem;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Media\Image;
use Prism\Prism\ValueObjects\Messages\UserMessage;

/**
 * Writes the descriptive metadata a library photo is matched on.
 *
 * A vision model looks at the picture and names what is in it; when that call is
 * unavailable the item still gets keywords derived from the search query that
 * found it, so matching degrades instead of breaking.
 */
class MediaDescriber
{
    /** Words that carry no signal for matching a hook to a photo. */
    private const STOPWORDS = [
        // Portuguese
        'que', 'com', 'para', 'por', 'dos', 'das', 'uma', 'uns', 'umas', 'seu', 'sua', 'seus', 'suas',
        'nao', 'sim', 'mais', 'menos', 'como', 'quando', 'onde', 'porque', 'todo', 'toda', 'todos',
        'todas', 'isso', 'esse', 'essa', 'este', 'esta', 'aqui', 'ali', 'pelo', 'pela', 'nos', 'nas',
        'meu', 'minha', 'voce', 'vou', 'vai', 'foi', 'ser', 'ter', 'tem', 'sem', 'ate', 'sobre',
        // English
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'was', 'were',
        'have', 'has', 'had', 'not', 'but', 'all', 'can', 'will', 'just', 'photo', 'image', 'picture',
    ];

    public function describe(MediaLibraryItem $item): void
    {
        try {
            $described = $this->fromVisionModel($item);
        } catch (\Throwable $e) {
            Log::warning('[MediaLibrary] Vision description failed; keeping derived keywords', [
                'media_library_item_id' => $item->id,
                'message' => $e->getMessage(),
            ]);

            $item->update(['keywords' => $this->fallbackKeywords($item)]);

            return;
        }

        $item->update([
            'description' => $described['description'],
            // The query that found the photo is a real signal; keep it alongside
            // what the model saw rather than replacing it.
            'keywords' => array_values(array_unique([...$described['keywords'], ...(array) $item->keywords])),
            'colors' => $described['colors'],
            'mood' => $described['mood'],
            'described_at' => now(),
        ]);
    }

    /**
     * Normalises free text into matchable tokens. Shared by the describer's seed
     * keywords and by {@see MediaMatcher}, so both sides speak the same vocabulary.
     *
     * @return list<string>
     */
    public static function keywordsFromText(string $text): array
    {
        $ascii = self::toAscii(mb_strtolower(trim($text)));
        $tokens = preg_split('/[^a-z0-9]+/', $ascii) ?: [];

        $kept = array_filter(
            $tokens,
            fn (string $token): bool => mb_strlen($token) >= 3 && ! in_array($token, self::STOPWORDS, true),
        );

        return array_values(array_unique($kept));
    }

    public static function toAscii(string $value): string
    {
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT', $value);

        return $converted === false ? $value : mb_strtolower($converted);
    }

    /**
     * @return array{description: string, keywords: list<string>, colors: list<string>, mood: ?string}
     */
    private function fromVisionModel(MediaLibraryItem $item): array
    {
        $systemPrompt = <<<'PROMPT'
You catalogue stock photos for a short-form video tool. You look at one photo and describe it so it can later be matched to a caption.

Respond with ONE JSON object and nothing else. No markdown, no code fences.

{"description":"...","keywords":["..."],"colors":["#rrggbb"],"mood":"..."}

- `description`: one English sentence, 12 to 25 words, naming the concrete subject, the setting and the lighting. Describe what is visible, never what it might symbolise.
- `keywords`: 8 to 15 lowercase English single words or two-word phrases. Cover subject, objects, setting, colour family, style. No brand names, no camera jargon.
- `colors`: 2 to 4 dominant colours as hex.
- `mood`: one English word, e.g. calm, energetic, moody, warm, clinical.
PROMPT;

        $response = Prism::text()
            ->using(Provider::OpenAI, 'gpt-4o-mini')
            ->withSystemPrompt($systemPrompt)
            ->withMessages([
                new UserMessage('Catalogue this photo.', [
                    Image::fromStoragePath($item->path, $item->disk),
                ]),
            ])
            ->withClientOptions(['timeout' => 60])
            ->generate();

        return $this->parse($response->text);
    }

    /**
     * @return array{description: string, keywords: list<string>, colors: list<string>, mood: ?string}
     */
    private function parse(string $raw): array
    {
        $json = trim($raw, " \t\n\r`");

        if (preg_match('/\{.*\}/s', $json, $matches) === 1) {
            $json = $matches[0];
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            throw new \RuntimeException('The vision model did not return JSON.');
        }

        $description = trim((string) ($decoded['description'] ?? ''));

        if ($description === '') {
            throw new \RuntimeException('The vision model returned no description.');
        }

        $keywords = array_values(array_filter(array_map(
            fn ($word): string => self::toAscii(trim((string) $word)),
            (array) ($decoded['keywords'] ?? []),
        )));

        $colors = array_values(array_filter(array_map(
            fn ($color): string => trim((string) $color),
            (array) ($decoded['colors'] ?? []),
        ), fn (string $color): bool => preg_match('/^#[0-9a-f]{6}$/i', $color) === 1));

        $mood = trim((string) ($decoded['mood'] ?? ''));

        return [
            'description' => $description,
            'keywords' => $keywords,
            'colors' => $colors,
            'mood' => $mood !== '' ? $mood : null,
        ];
    }

    /**
     * @return list<string>
     */
    private function fallbackKeywords(MediaLibraryItem $item): array
    {
        $existing = (array) $item->keywords;

        if ($existing !== []) {
            return array_values($existing);
        }

        // Pinterest paths carry nothing useful, but an uploaded filename does.
        return self::keywordsFromText((string) $item->source_url);
    }
}
