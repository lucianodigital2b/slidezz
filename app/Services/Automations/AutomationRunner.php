<?php

namespace App\Services\Automations;

use App\Jobs\GenerateSlideshow;
use App\Models\Automation;
use App\Models\AutomationRun;
use App\Models\ContentProject;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Kicks off one execution of an automation. Shared by the scheduler command and
 * the "Rodar agora" button so both produce identical history.
 */
class AutomationRunner
{
    /**
     * @param  CarbonImmutable|null  $publishAt  When the finished carousel should post;
     *                                           null leaves it unscheduled (manual run).
     */
    public function run(Automation $automation, ?CarbonImmutable $publishAt = null): AutomationRun
    {
        $project = ContentProject::create([
            'workspace_id' => $automation->workspace_id,
            'title' => Str::limit($automation->niche, 120, ''),
            'type' => 'slideshow',
            'status' => 'generating',
            'script_data' => [
                'topic' => $this->topic($automation),
                'slide_count' => $automation->slide_count,
                'image_source' => $automation->image_source,
                'text_position' => $automation->text_position,
                'text_preset' => $automation->text_preset->value,
                'language' => $automation->language,
                'automation_id' => $automation->id,
                'avoid_topics' => $automation->recentHooks(),
                'social_account_id' => $publishAt ? $automation->social_account_id : null,
                'publish_at' => $publishAt?->toDateTimeString(),
            ],
        ]);

        $run = AutomationRun::create([
            'automation_id' => $automation->id,
            'content_project_id' => $project->id,
            'status' => 'running',
            'ran_at' => now(),
        ]);

        GenerateSlideshow::dispatch($project, $run);

        $automation->update(['last_run_at' => now()]);

        return $run;
    }

    /**
     * The niche plus its keyword seeds, so the writer varies the angle between runs
     * instead of rewriting the same list every day.
     */
    private function topic(Automation $automation): string
    {
        $keywords = array_filter((array) $automation->image_keywords);

        if ($keywords === []) {
            return $automation->niche;
        }

        return $automation->niche.' (temas possíveis: '.implode(', ', $keywords).')';
    }
}
