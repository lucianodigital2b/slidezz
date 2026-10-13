<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Services\Automations\AutomationRunner;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunAutomations extends Command
{
    protected $signature = 'automations:run';

    protected $description = 'Generate TikTok carousels for automations whose next slot is due';

    public function handle(AutomationRunner $runner): int
    {
        $due = Automation::where('status', 'active')
            ->whereNotNull('next_run_at')
            ->where('next_run_at', '<=', now())
            ->get();

        if ($due->isEmpty()) {
            $this->info('No automations due.');

            return self::SUCCESS;
        }

        $this->info("Found {$due->count()} automation(s) due.");

        foreach ($due as $automation) {
            // The slot that just came due is when this carousel should post; the
            // generation itself runs now, on the queue.
            $publishAt = CarbonImmutable::instance($automation->next_run_at);

            try {
                $runner->run($automation, $publishAt);
                $this->info("Automation #{$automation->id} ({$automation->name}) dispatched.");
            } catch (\Throwable $e) {
                Log::error("[Automations] Failed to start automation #{$automation->id}", [
                    'message' => $e->getMessage(),
                ]);

                $this->error("Automation #{$automation->id} failed: {$e->getMessage()}");
            }

            // Advance regardless, so one bad run cannot make the automation fire in a
            // tight loop every time the scheduler ticks.
            $automation->update(['next_run_at' => $automation->nextSlotAfter($publishAt)]);
        }

        return self::SUCCESS;
    }
}
