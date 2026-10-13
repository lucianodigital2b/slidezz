<?php

namespace App\Services\Media;

use App\Models\MediaLibraryItem;
use Illuminate\Support\Collection;

/**
 * Picks the library photo that best fits a line of slide text.
 *
 * Scoring is deliberately plain PHP rather than a vector index: a workspace
 * library is thousands of rows at most, and a transparent score is something the
 * user can reason about when a slide gets the wrong picture.
 */
class MediaMatcher
{
    public function __construct(private readonly MediaEmbeddings $embeddings) {}

    /** A keyword the model actually assigned is a stronger signal than prose. */
    private const KEYWORD_WEIGHT = 3.0;

    private const DESCRIPTION_WEIGHT = 1.0;

    private const MOOD_WEIGHT = 1.0;

    /** A whole two-word keyword landing in the query is worth more than its halves. */
    private const PHRASE_BONUS = 2.5;

    /** TikTok slides are 9:16, so a landscape photo starts at a disadvantage. */
    private const PORTRAIT_BONUS = 1.5;

    /**
     * Two unrelated English sentences still score around 0.2 against each other,
     * so only similarity above this floor counts as a real semantic match.
     */
    private const SEMANTIC_FLOOR = 0.25;

    /** Puts semantic points on the same scale as a couple of keyword hits. */
    private const SEMANTIC_SCALE = 16.0;

    /** Below this, the library has nothing relevant and the caller should look elsewhere. */
    public const MIN_SCORE = 3.0;

    /** Enough to rank against without loading a huge library into memory. */
    private const CANDIDATE_LIMIT = 2000;

    /**
     * One photo per query, never handing the same photo to two slides.
     *
     * @param  list<string>  $queries  Free text per slide: the image query plus the slide's own words.
     * @return list<MediaLibraryItem|null> Aligned with `$queries`; null where nothing cleared MIN_SCORE.
     */
    public function assign(int $workspaceId, array $queries, float $minScore = self::MIN_SCORE): array
    {
        $candidates = $this->candidates($workspaceId);
        // One request for the whole carousel, and none at all when no candidate
        // carries a vector yet.
        $vectors = $this->queryVectors($candidates, $queries);
        $taken = [];
        $picked = [];

        foreach ($queries as $index => $query) {
            $best = $this->pick($candidates, $query, $vectors[$index] ?? null, $taken, $minScore);

            if ($best !== null) {
                $taken[$best->id] = true;
            }

            $picked[] = $best;
        }

        return $picked;
    }

    /**
     * @param  list<int>  $excludeIds
     */
    public function bestFor(int $workspaceId, string $query, array $excludeIds = [], float $minScore = self::MIN_SCORE): ?MediaLibraryItem
    {
        $candidates = $this->candidates($workspaceId);

        return $this->pick(
            $candidates,
            $query,
            $this->queryVectors($candidates, [$query])[0] ?? null,
            array_flip($excludeIds),
            $minScore,
        );
    }

    /**
     * How well one photo fits one piece of text. Exposed so the library screen can
     * show why a photo was chosen.
     *
     * @param  list<float>|null  $queryVector  Omit to score on words alone.
     */
    public function score(MediaLibraryItem $item, string $query, ?array $queryVector = null): float
    {
        $semantic = $this->semanticScore($item, $queryVector);
        $queryTokens = MediaDescriber::keywordsFromText($query);

        if ($queryTokens === []) {
            return $semantic;
        }

        $wanted = array_flip($queryTokens);
        $queryText = ' '.implode(' ', $queryTokens).' ';
        $score = 0.0;

        foreach ((array) $item->keywords as $keyword) {
            $keyword = MediaDescriber::toAscii((string) $keyword);
            $parts = MediaDescriber::keywordsFromText($keyword);

            if ($parts === []) {
                continue;
            }

            if (count($parts) > 1 && str_contains($queryText, ' '.implode(' ', $parts).' ')) {
                $score += self::PHRASE_BONUS;
            }

            foreach ($parts as $part) {
                if (isset($wanted[$part])) {
                    $score += self::KEYWORD_WEIGHT;
                }
            }
        }

        foreach (MediaDescriber::keywordsFromText((string) $item->description) as $word) {
            if (isset($wanted[$word])) {
                $score += self::DESCRIPTION_WEIGHT;
            }
        }

        if ($item->mood !== null && isset($wanted[MediaDescriber::toAscii($item->mood)])) {
            $score += self::MOOD_WEIGHT;
        }

        if (($score > 0.0 || $semantic > 0.0) && $item->orientation === 'portrait') {
            $score += self::PORTRAIT_BONUS;
        }

        return $score + $semantic;
    }

    /**
     * Meaning, for the cases where the caption and the photo describe the same
     * thing in different words.
     *
     * @param  list<float>|null  $queryVector
     */
    private function semanticScore(MediaLibraryItem $item, ?array $queryVector): float
    {
        if ($queryVector === null) {
            return 0.0;
        }

        $itemVector = $item->embeddingVector();

        if ($itemVector === null) {
            return 0.0;
        }

        $similarity = MediaEmbeddings::similarity($queryVector, $itemVector);

        return max(0.0, $similarity - self::SEMANTIC_FLOOR) * self::SEMANTIC_SCALE;
    }

    /**
     * Skips the provider entirely when nothing in the library is embedded yet, so
     * a young library costs nothing and matching stays lexical.
     *
     * @param  Collection<int, MediaLibraryItem>  $candidates
     * @param  list<string>  $queries
     * @return list<list<float>|null>
     */
    private function queryVectors(Collection $candidates, array $queries): array
    {
        $anyEmbedded = $candidates->contains(fn (MediaLibraryItem $item): bool => $item->embedding !== null);

        if (! $anyEmbedded) {
            return array_fill(0, count($queries), null);
        }

        return $this->embeddings->embedMany($queries);
    }

    /**
     * Least recently used first, so ties rotate the library instead of replaying
     * the same favourite photo in every carousel.
     *
     * @return Collection<int, MediaLibraryItem>
     */
    private function candidates(int $workspaceId): Collection
    {
        return MediaLibraryItem::forWorkspace($workspaceId)
            ->orderByRaw('last_used_at is null desc')
            ->orderBy('last_used_at')
            ->orderBy('used_count')
            ->orderBy('id')
            ->limit(self::CANDIDATE_LIMIT)
            ->get();
    }

    /**
     * @param  Collection<int, MediaLibraryItem>  $candidates
     * @param  list<float>|null  $queryVector
     * @param  array<int, mixed>  $taken
     */
    private function pick(Collection $candidates, string $query, ?array $queryVector, array $taken, float $minScore): ?MediaLibraryItem
    {
        $best = null;
        $bestScore = 0.0;

        foreach ($candidates as $item) {
            if (isset($taken[$item->id])) {
                continue;
            }

            $score = $this->score($item, $query, $queryVector);

            // Strictly greater keeps the candidate ordering as the tie-break, which
            // is what rotates equally good photos between runs.
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $item;
            }
        }

        return $bestScore >= $minScore ? $best : null;
    }
}
