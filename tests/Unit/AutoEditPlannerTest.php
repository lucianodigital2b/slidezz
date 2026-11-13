<?php

namespace Tests\Unit;

use App\Services\Video\AutoEditPlanner;
use Tests\TestCase;

class AutoEditPlannerTest extends TestCase
{
    public function test_remap_maps_source_time_to_output_time(): void
    {
        $keep = [
            ['start' => 1.0, 'end' => 4.0],
            ['start' => 6.0, 'end' => 8.0],
        ];

        $this->assertSame(0.0, AutoEditPlanner::remap(1.0, $keep));
        $this->assertSame(3.0, AutoEditPlanner::remap(4.0, $keep));
        $this->assertSame(3.0, AutoEditPlanner::remap(6.0, $keep));
        $this->assertSame(5.0, AutoEditPlanner::remap(8.0, $keep));
        $this->assertNull(AutoEditPlanner::remap(5.5, $keep));
        $this->assertNull(AutoEditPlanner::remap(0.0, $keep));
        $this->assertNull(AutoEditPlanner::remap(9.0, $keep));
    }

    public function test_plan_without_llm(): void
    {
        $planner = new class extends AutoEditPlanner
        {
            protected function deepseekSelection(array $segments): array
            {
                return ['drop' => [], 'emphasis' => [], 'emphasis_words' => []];
            }
        };

        $words = [
            ['word' => 'Olá', 'start' => 0.0, 'end' => 0.4],
            ['word' => 'mundo', 'start' => 0.6, 'end' => 1.0],
            ['word' => 'tipo', 'start' => 1.8, 'end' => 2.0],
            ['word' => 'assim', 'start' => 2.2, 'end' => 2.8],
        ];

        $plan = $planner->plan([
            'text' => 'Olá mundo tipo assim',
            'language' => 'pt',
            'duration' => 3.0,
            'words' => $words,
        ], 3.0, 'pt');

        // The 0.6s gap at 1.6 splits into two utterances.
        $this->assertCount(2, $plan['keep']);
        $this->assertSame(0.0, $plan['keep'][0]['start']);
        $this->assertSame(1.12, $plan['keep'][0]['end']);
        $this->assertSame(1.68, $plan['keep'][1]['start']);
        $this->assertSame(2.92, $plan['keep'][1]['end']);

        // Captions are generated from kept words and remapped.
        $this->assertNotEmpty($plan['captions']);
        $firstCaption = $plan['captions'][0];
        $this->assertSame('Olá mundo', $firstCaption['text']);
        $this->assertCount(2, $firstCaption['words']);
        $this->assertSame(0.0, $firstCaption['words'][0]['start']);
        $this->assertSame(0.6, $firstCaption['words'][1]['start']);
    }
}
