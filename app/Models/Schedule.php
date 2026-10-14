<?php

namespace App\Models;

use App\Enums\ScheduleStatus;
use Database\Factories\ScheduleFactory;
use Illuminate\Database\Eloquent\Collection;
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
        'public_post_id',
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
     * Move every due pending row to publishing and return the ones this call
     * won. Each row is switched with its own conditional update, so a row is
     * handed out once even when the scheduler runs again before the queue
     * gets to it, or two schedulers race.
     *
     * @return Collection<int, Schedule>
     */
    public static function claimDue(): Collection
    {
        $claimed = static::where('status', ScheduleStatus::Pending)
            ->where('publish_at', '<=', now())
            ->pluck('id')
            ->filter(fn (int $id): bool => static::whereKey($id)
                ->where('status', ScheduleStatus::Pending)
                ->update(['status' => ScheduleStatus::Publishing]) === 1);

        return static::with(['contentProject', 'socialAccount'])->whereIn('id', $claimed)->get();
    }

    /**
     * Rows left in publishing for an hour lost their job: the worker died or a
     * deploy restarted it mid-send. They are marked failed, not re-queued,
     * because the post may already have gone out; the user checks and moves it.
     */
    public static function failStuck(): int
    {
        return static::where('status', ScheduleStatus::Publishing)
            ->where('updated_at', '<', now()->subHour())
            ->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => 'A publicação travou no meio (o servidor parou antes de terminar). Confira na rede se o post saiu antes de reagendar.',
            ]);
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
