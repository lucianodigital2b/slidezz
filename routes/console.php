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

// Every minute, dispatch due pending schedules for publishing
FacadeSchedule::call(function () {
    Schedule::where('status', ScheduleStatus::Pending)
        ->where('publish_at', '<=', now())
        ->get()
        ->each(fn (Schedule $s) => PublishScheduledContent::dispatch($s));
})->everyMinute();

// Every hour, sync analytics for all published posts
FacadeSchedule::call(function () {
    Schedule::where('status', ScheduleStatus::Published)
        ->whereNotNull('platform_post_id')
        ->with('socialAccount')
        ->get()
        ->each(fn (Schedule $s) => SyncPostAnalytics::dispatch($s));
})->hourly();
