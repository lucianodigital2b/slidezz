<?php

use App\Enums\ScheduleStatus;
use App\Jobs\PublishScheduledContent;
use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule as FacadeSchedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Every minute, claim the due schedules and dispatch each one exactly once
FacadeSchedule::call(function () {
    Schedule::claimDue()->each(fn (Schedule $s) => PublishScheduledContent::dispatch($s));
})->everyMinute();

// Every ten minutes, fail the schedules whose publish job died midway
FacadeSchedule::call(fn () => Schedule::failStuck())->everyTenMinutes();

// Every 15 minutes, generate carousels for automations whose slot came due
FacadeSchedule::command('automations:run')->everyFifteenMinutes()->withoutOverlapping();

// Every hour, refresh TikTok tokens that are close to expiring, so a post never
// fails on a token that lapsed between the last publish and now
FacadeSchedule::command('tiktok:refresh-tokens')->hourly()->withoutOverlapping();

// Every hour, sync analytics for all published posts
FacadeSchedule::call(function () {
    Schedule::where('status', ScheduleStatus::Published)
        ->whereNotNull('platform_post_id')
        ->with('socialAccount')
        ->get()
        ->each(fn (Schedule $s) => SyncPostAnalytics::dispatch($s));
})->hourly();
