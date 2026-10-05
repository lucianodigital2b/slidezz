<?php

namespace Tests\Feature;

use App\Models\MediaLibraryItem;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Media\MediaMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaMatcherTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    private MediaMatcher $matcher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = Workspace::factory()->create(['owner_id' => User::factory()]);
        $this->matcher = app(MediaMatcher::class);
    }

    public function test_it_picks_the_photo_whose_keywords_fit_the_line(): void
    {
        $gym = $this->item('Woman lifting weights in a dim gym', ['gym', 'weights', 'fitness']);
        $this->item('Bowl of oatmeal on a kitchen counter', ['breakfast', 'oatmeal', 'kitchen']);

        $best = $this->matcher->bestFor($this->workspace->id, 'gym motivation weights');

        $this->assertSame($gym->id, $best?->id);
    }

    public function test_a_two_word_keyword_beats_two_loose_matches(): void
    {
        $loose = $this->item('Sun through a window', ['morning', 'light']);
        $phrase = $this->item('A cup of coffee in morning light', ['morning light']);

        $best = $this->matcher->bestFor($this->workspace->id, 'coffee in morning light');

        $this->assertSame($phrase->id, $best?->id);
        $this->assertGreaterThan(
            $this->matcher->score($loose, 'coffee in morning light'),
            $this->matcher->score($phrase, 'coffee in morning light'),
        );
    }

    public function test_it_returns_nothing_when_the_library_has_no_fit(): void
    {
        $this->item('Bowl of oatmeal on a kitchen counter', ['breakfast', 'oatmeal']);

        $this->assertNull($this->matcher->bestFor($this->workspace->id, 'formula 1 pit stop'));
    }

    public function test_it_ignores_another_workspaces_library(): void
    {
        $other = Workspace::factory()->create(['owner_id' => User::factory()]);
        MediaLibraryItem::factory()
            ->describedAs('Woman lifting weights in a gym', ['gym', 'weights'])
            ->create(['workspace_id' => $other->id]);

        $this->assertNull($this->matcher->bestFor($this->workspace->id, 'gym weights'));
    }

    public function test_it_matches_across_accents_and_case(): void
    {
        $item = $this->item('Morning skincare routine on a bathroom shelf', ['skincare', 'rotina', 'banheiro']);

        $best = $this->matcher->bestFor($this->workspace->id, 'Minha ROTINA de skincare no banheiro');

        $this->assertSame($item->id, $best?->id);
    }

    public function test_portrait_wins_a_tie_against_landscape(): void
    {
        $landscape = $this->item('Gym floor', ['gym', 'weights'], 'landscape');
        $portrait = $this->item('Gym floor', ['gym', 'weights'], 'portrait');

        $this->assertGreaterThan(
            $this->matcher->score($landscape, 'gym weights'),
            $this->matcher->score($portrait, 'gym weights'),
        );
        $this->assertSame($portrait->id, $this->matcher->bestFor($this->workspace->id, 'gym weights')?->id);
    }

    public function test_it_never_hands_the_same_photo_to_two_slides(): void
    {
        $this->item('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);
        $this->item('Dumbbells on a gym rack', ['gym', 'dumbbells', 'fitness']);

        $picked = $this->matcher->assign($this->workspace->id, ['gym fitness', 'gym fitness']);

        $this->assertNotNull($picked[0]);
        $this->assertNotNull($picked[1]);
        $this->assertNotSame($picked[0]->id, $picked[1]->id);
    }

    public function test_assign_leaves_a_gap_when_nothing_fits(): void
    {
        $this->item('Woman lifting weights in a gym', ['gym', 'weights', 'fitness']);

        $picked = $this->matcher->assign($this->workspace->id, ['gym fitness', 'formula 1 pit stop']);

        $this->assertNotNull($picked[0]);
        $this->assertNull($picked[1]);
    }

    public function test_equally_good_photos_rotate_least_recently_used_first(): void
    {
        $tired = $this->item('Gym floor', ['gym', 'weights']);
        $tired->forceFill(['last_used_at' => now()->subDay(), 'used_count' => 5])->save();

        $fresh = $this->item('Gym rack', ['gym', 'weights']);

        $this->assertSame($fresh->id, $this->matcher->bestFor($this->workspace->id, 'gym weights')?->id);
    }

    /**
     * @param  list<string>  $keywords
     */
    private function item(string $description, array $keywords, string $orientation = 'portrait'): MediaLibraryItem
    {
        return MediaLibraryItem::factory()
            ->describedAs($description, $keywords)
            ->create([
                'workspace_id' => $this->workspace->id,
                'orientation' => $orientation,
                'last_used_at' => null,
            ]);
    }
}
