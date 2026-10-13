<?php

namespace App\Console\Commands;

use App\Enums\ScheduleStatus;
use App\Models\Schedule;
use App\Services\Social\SocialPublisherFactory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

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
    protected $description = 'Publish scheduled posts that are due';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for scheduled posts to publish...');

        $schedules = Schedule::with(['contentProject', 'socialAccount'])
            ->where('status', ScheduleStatus::Pending)
            ->where('publish_at', '<=', now())
            ->get();

        if ($schedules->isEmpty()) {
            $this->info('No posts due for publishing.');
            return Command::SUCCESS;
        }

        $this->info("Found {$schedules->count()} post(s) to publish.");

        foreach ($schedules as $schedule) {
            $this->info("Publishing schedule ID {$schedule->id} for project {$schedule->contentProject->id} to {$schedule->socialAccount->provider}...");
            
            // Mark as publishing to prevent duplicate processing
            $schedule->update(['status' => ScheduleStatus::Publishing]);

            try {
                $publisher = SocialPublisherFactory::make($schedule->socialAccount->provider);
                
                $platformPostId = $publisher->publish($schedule->contentProject, $schedule);

                $schedule->update([
                    'status' => ScheduleStatus::Published,
                    'platform_post_id' => $platformPostId,
                    'error_log' => null,
                ]);

                $this->info("Successfully published schedule ID {$schedule->id}. Platform Post ID: {$platformPostId}");
            } catch (\Exception $e) {
                Log::error("Failed to publish schedule ID {$schedule->id}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);

                $schedule->update([
                    'status' => ScheduleStatus::Failed,
                    'error_log' => $e->getMessage(),
                ]);

                $this->error("Failed to publish schedule ID {$schedule->id}. See logs for details.");
            }
        }

        $this->info('Finished publishing scheduled posts.');
        return Command::SUCCESS;
    }
}
