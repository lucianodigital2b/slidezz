<?php

namespace App\Console\Commands;

use App\Jobs\PublishScheduledContent;
use App\Models\Schedule;
use Illuminate\Console\Command;

class PublishScheduledPosts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'posts:publish';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Publish the scheduled posts that are due, right now, without the queue';

    /**
     * Same claim as the every-minute scheduler, so running this by hand never
     * sends a post the queue is already sending.
     */
    public function handle(): int
    {
        $schedules = Schedule::claimDue();

        $this->info("Found {$schedules->count()} post(s) to publish.");

        foreach ($schedules as $schedule) {
            PublishScheduledContent::dispatchSync($schedule);
            $this->line("Schedule {$schedule->id}: {$schedule->fresh()->status->value}");
        }

        return self::SUCCESS;
    }
}
