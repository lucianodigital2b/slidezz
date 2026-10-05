<?php

namespace Tests\Feature;

use App\Models\MediaLibraryItem;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Media\MediaEmbeddings;
use App\Services\Media\MediaMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\EmbeddingsResponseFake;
use Prism\Prism\ValueObjects\Embedding;
use Tests\TestCase;

class MediaEmbeddingsTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = Workspace::factory()->create(['owner_id' => User::factory()]);
    }

    public function test_packing_survives_a_round_trip(): void
    {
        $vector = MediaEmbeddings::normalize([0.5, -0.25, 0.125, 1.0]);

        $restored = MediaEmbeddings::unpack(MediaEmbeddings::pack($vector));

        $this->assertNotNull($restored);
        $this->assertCount(4, $restored);

        foreach ($vector as $index => $value) {
            $this->assertEqualsWithDelta($value, $restored[$index], 0.0001);
        }
    }

    public function test_unpacking_nothing_gives_null(): void
    {
        $this->assertNull(MediaEmbeddings::unpack(null));
        $this->assertNull(MediaEmbeddings::unpack(''));
    }

    public function test_normalising_makes_similarity_a_plain_dot_product(): void
    {
        $a = MediaEmbeddings::normalize([3.0, 4.0]);

        // A unit vector against itself is exactly 1.
        $this->assertEqualsWithDelta(1.0, MediaEmbeddings::similarity($a, $a), 0.0001);

        $orthogonal = MediaEmbeddings::normalize([-4.0, 3.0]);
        $this->assertEqualsWithDelta(0.0, MediaEmbeddings::similarity($a, $orthogonal), 0.0001);
    }

    public function test_it_stores_the_vector_for_a_described_photo(): void
    {
        $this->fakeEmbeddings([[0.6, 0.8]]);

        $item = MediaLibraryItem::factory()
            ->describedAs('Sunrise through bedroom curtains', ['sunrise', 'bedroom'])
            ->create(['workspace_id' => $this->workspace->id]);

        app(MediaEmbeddings::class)->store($item);

        $item->refresh();

        $this->assertNotNull($item->embedding);
        $this->assertStringContainsString('text-embedding-3-small', (string) $item->embedding_model);
        $this->assertEqualsWithDelta(1.0, MediaEmbeddings::similarity($item->embeddingVector(), $item->embeddingVector()), 0.0001);
    }

    public function test_it_skips_a_photo_with_no_description_yet(): void
    {
        $item = MediaLibraryItem::factory()->undescribed()->create(['workspace_id' => $this->workspace->id]);

        app(MediaEmbeddings::class)->store($item);

        $this->assertNull($item->refresh()->embedding);
    }

    public function test_a_provider_that_returns_nothing_leaves_the_item_alone(): void
    {
        // No canned response: the fake answers with an empty embeddings list.
        Prism::fake([]);

        $item = MediaLibraryItem::factory()
            ->describedAs('Sunrise through bedroom curtains', ['sunrise'])
            ->create(['workspace_id' => $this->workspace->id]);

        app(MediaEmbeddings::class)->store($item);

        $this->assertNull($item->refresh()->embedding);
    }

    public function test_meaning_beats_words_when_no_keyword_overlaps(): void
    {
        // The caption talks about waking up early; no photo shares a single word,
        // but one of them means the same thing.
        $sunrise = $this->embedded('Sunrise through bedroom curtains', ['sunrise', 'curtains'], [1.0, 0.0]);
        $this->embedded('Dumbbells on a gym rack', ['dumbbells', 'rack'], [0.0, 1.0]);

        // Query vector points at the sunrise photo.
        $this->fakeEmbeddings([[0.97, 0.24]]);

        $best = app(MediaMatcher::class)->bestFor($this->workspace->id, 'acordar as 5 da manha muda tudo');

        $this->assertSame($sunrise->id, $best?->id);
    }

    public function test_a_distant_meaning_does_not_clear_the_floor(): void
    {
        $this->embedded('Dumbbells on a gym rack', ['dumbbells', 'rack'], [0.0, 1.0]);

        // Nearly orthogonal: similarity lands under the semantic floor.
        $this->fakeEmbeddings([[1.0, 0.1]]);

        $this->assertNull(app(MediaMatcher::class)->bestFor($this->workspace->id, 'assunto totalmente distinto'));
    }

    public function test_it_does_not_call_the_provider_when_nothing_is_embedded(): void
    {
        MediaLibraryItem::factory()
            ->describedAs('Woman lifting weights in a gym', ['gym', 'weights'])
            ->create(['workspace_id' => $this->workspace->id, 'embedding' => null]);

        $fake = Prism::fake([]);

        // Lexical matching still works, and no embedding request was made.
        $best = app(MediaMatcher::class)->bestFor($this->workspace->id, 'gym weights');

        $this->assertNotNull($best);
        $fake->assertCallCount(0);
    }

    /**
     * @param  list<list<float>>  $vectors
     */
    private function fakeEmbeddings(array $vectors): void
    {
        Prism::fake([
            EmbeddingsResponseFake::make()->withEmbeddings(
                array_map(fn (array $vector): Embedding => new Embedding($vector), $vectors),
            ),
        ]);
    }

    /**
     * @param  list<string>  $keywords
     * @param  list<float>  $vector
     */
    private function embedded(string $description, array $keywords, array $vector): MediaLibraryItem
    {
        return MediaLibraryItem::factory()
            ->describedAs($description, $keywords)
            ->create([
                'workspace_id' => $this->workspace->id,
                'orientation' => 'portrait',
                'last_used_at' => null,
                'embedding' => MediaEmbeddings::pack(MediaEmbeddings::normalize($vector)),
                'embedding_model' => 'text-embedding-3-small@512',
            ]);
    }
}
