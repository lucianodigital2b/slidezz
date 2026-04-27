<?php

use App\Jobs\PublishScheduledContent;
use App\Models\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule as FacadeSchedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Every minute, fetch pending schedules that are due to publish
FacadeSchedule::call(function () {
    $dueSchedules = Schedule::where('status', 'pending')
        ->where('publish_at', '<=', now())
        ->get();

    foreach ($dueSchedules as $schedule) {
        PublishScheduledContent::dispatch($schedule);
    }
})->everyMinute();
