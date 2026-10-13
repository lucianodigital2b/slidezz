<?php

namespace App\Models;

use App\Enums\ScheduleStatus;
use Database\Factories\ScheduleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Schedule extends Model
{
    /** @use HasFactory<ScheduleFactory> */
    use HasFactory;

    protected $fillable = [
        'group_id',
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

    /**
     * Every row belongs to a group: the same post scheduled to several accounts
     * shares one group_id. A row created alone starts its own group.
     */
    protected static function booted(): void
    {
        static::creating(function (Schedule $schedule) {
            $schedule->group_id ??= (string) Str::uuid();
        });
    }

    /**
     * Pending or failed rows can still change time or accounts; the rest can only be duplicated.
     */
    public function isMovable(): bool
    {
        return in_array($this->status, [ScheduleStatus::Pending, ScheduleStatus::Failed], true);
    }

    /**
     * The other accounts this post goes out to, this row included.
     */
    public function group()
    {
        return $this->hasMany(Schedule::class, 'group_id', 'group_id');
    }

    public function contentProject()
    {
        return $this->belongsTo(ContentProject::class);
    }

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function postAnalytic()
    {
        return $this->hasOne(PostAnalytic::class);
    }
}
