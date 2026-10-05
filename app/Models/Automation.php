<?php

namespace App\Models;

use App\Enums\SlideTextPreset;
use Carbon\CarbonImmutable;
use Database\Factories\AutomationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A standing instruction to keep producing TikTok photo carousels for a niche:
 * "skincare coreano, 2 posts a day, 09:00 and 19:00".
 */
class Automation extends Model
{
    /** @use HasFactory<AutomationFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'social_account_id',
        'name',
        'status',
        'niche',
        'language',
        'slide_count',
        'image_source',
        'image_keywords',
        'text_position',
        'text_preset',
        'post_times',
        'timezone',
        'last_run_at',
        'next_run_at',
    ];

    protected $casts = [
        'text_preset' => SlideTextPreset::class,
        'image_keywords' => 'array',
        'post_times' => 'array',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
        'slide_count' => 'integer',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function runs()
    {
        return $this->hasMany(AutomationRun::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * The next configured slot strictly after `$after`, in the automation's own
     * timezone, rolling over to tomorrow's first slot when the day is spent.
     */
    public function nextSlotAfter(?CarbonImmutable $after = null): CarbonImmutable
    {
        $after = ($after ?? CarbonImmutable::now())->setTimezone($this->timezone);
        $times = $this->sortedPostTimes();

        foreach ($times as $time) {
            [$hour, $minute] = array_pad(array_map('intval', explode(':', $time)), 2, 0);
            $slot = $after->setTime($hour, $minute, 0);

            if ($slot->greaterThan($after)) {
                return $slot->utc();
            }
        }

        [$hour, $minute] = array_pad(array_map('intval', explode(':', $times[0])), 2, 0);

        return $after->addDay()->setTime($hour, $minute, 0)->utc();
    }

    /**
     * Hooks from the most recent runs, handed to the writer so it stops repeating angles.
     *
     * @return list<string>
     */
    public function recentHooks(int $limit = 15): array
    {
        return $this->runs()
            ->whereNotNull('content_project_id')
            ->with('contentProject')
            ->latest('ran_at')
            ->limit($limit)
            ->get()
            ->map(fn (AutomationRun $run): string => (string) $run->contentProject?->title)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function sortedPostTimes(): array
    {
        $times = array_values(array_filter((array) $this->post_times));

        if ($times === []) {
            return ['09:00'];
        }

        sort($times);

        return $times;
    }
}
