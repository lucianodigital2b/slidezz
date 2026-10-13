<?php

namespace App\Services\Media;

use App\Models\MediaLibraryItem;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Enums\Provider;

/**
 * Turns library photos and slide lines into vectors, so the matcher can pair a
 * caption with a photo that means the same thing without sharing a single word.
 *
 * There is no vector database here on purpose: pgvector needs Postgres, Qdrant and
 * Pinecone need a server, and a workspace library is a few thousand rows. Vectors
 * live in a column on the table that already exists and the comparison is a dot
 * product, which is exact rather than approximate.
 */
class MediaEmbeddings
{
    private const MODEL = 'text-embedding-3-small';

    /**
     * OpenAI's small model is trained so a truncated vector still works. 512 costs a
     * third of the arithmetic of the full 1536 and loses very little accuracy.
     */
    private const DIMENSIONS = 512;

    /**
     * Reads a photo's descriptive metadata and stores its vector.
     * Called after {@see MediaDescriber}, whose output is the text being embedded.
     */
    public function store(MediaLibraryItem $item): void
    {
        $text = $item->searchableText();

        if (trim($text) === '') {
            return;
        }

        $vector = $this->embed($text);

        if ($vector === null) {
            return;
        }

        $item->update([
            'embedding' => self::pack($vector),
            'embedding_model' => self::MODEL.'@'.self::DIMENSIONS,
        ]);
    }

    /**
     * @return list<float>|null Null whenever the provider is unreachable, so the
     *                          caller falls back to lexical matching instead of failing.
     */
    public function embed(string $text): ?array
    {
        return $this->embedMany([$text])[0] ?? null;
    }

    /**
     * One request for the whole batch: a six-slide carousel is one call, not six.
     *
     * @param  list<string>  $texts
     * @return list<list<float>|null> Aligned with `$texts`.
     */
    public function embedMany(array $texts): array
    {
        if ($texts === []) {
            return [];
        }

        try {
            $response = Prism::embeddings()
                ->using(Provider::OpenAI, self::MODEL)
                ->fromArray(array_values($texts))
                ->withProviderOptions(['dimensions' => self::DIMENSIONS])
                ->withClientOptions(['timeout' => 60])
                ->generate();
        } catch (\Throwable $e) {
            Log::warning('[MediaLibrary] Embedding request failed; matching stays lexical', [
                'count' => count($texts),
                'message' => $e->getMessage(),
            ]);

            return array_fill(0, count($texts), null);
        }

        $vectors = [];

        foreach (array_keys(array_values($texts)) as $index) {
            $raw = $response->embeddings[$index]->embedding ?? null;

            $vectors[] = is_array($raw) && $raw !== []
                ? self::normalize(array_map('floatval', $raw))
                : null;
        }

        return $vectors;
    }

    /**
     * Unit length at write time, which is what lets similarity be a bare dot
     * product instead of recomputing both magnitudes on every comparison.
     *
     * @param  list<float>  $vector
     * @return list<float>
     */
    public static function normalize(array $vector): array
    {
        $magnitude = sqrt(array_sum(array_map(fn (float $value): float => $value * $value, $vector)));

        if ($magnitude <= 0.0) {
            return $vector;
        }

        return array_map(fn (float $value): float => $value / $magnitude, $vector);
    }

    /**
     * Cosine similarity, valid only for vectors already normalised.
     *
     * @param  list<float>  $a
     * @param  list<float>  $b
     */
    public static function similarity(array $a, array $b): float
    {
        $length = min(count($a), count($b));
        $total = 0.0;

        for ($i = 0; $i < $length; $i++) {
            $total += $a[$i] * $b[$i];
        }

        return $total;
    }

    /**
     * @param  list<float>  $vector
     */
    public static function pack(array $vector): string
    {
        return base64_encode(pack('g*', ...$vector));
    }

    /**
     * @return list<float>|null
     */
    public static function unpack(?string $packed): ?array
    {
        if ($packed === null || $packed === '') {
            return null;
        }

        $binary = base64_decode($packed, true);

        if ($binary === false || $binary === '') {
            return null;
        }

        $values = unpack('g*', $binary);

        return $values === false ? null : array_values($values);
    }
}
