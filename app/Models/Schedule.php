<?php

namespace App\Models;

use App\Enums\ScheduleStatus;
use Database\Factories\ScheduleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    /** @use HasFactory<ScheduleFactory> */
    use HasFactory;

    protected $fillable = [
        'content_project_id',
        'social_account_id',
        'publish_at',
        'status',
        'platform_post_id',
        'error_log',
    ];

    protected $casts = [
        'publish_at' => 'datetime',
        'status' => ScheduleStatus::class,
    ];

    public function contentProject()
    {
        return $this->belongsTo(ContentProject::class);
    }

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }
}
