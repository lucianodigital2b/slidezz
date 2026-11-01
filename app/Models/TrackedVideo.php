<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrackedVideo extends Model
{
    protected $fillable = [
        'ugc_campaign_id',
        'ugc_creator_id',
        'platform',
        'url',
        'external_id',
        'thumbnail_url',
        'caption',
        'author_handle',
        'posted_at',
        'views',
        'likes',
        'comments',
        'shares',
        'bookmarks',
        'fetch_status',
        'last_synced_at',
        'payout_override_cents',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'paid_at' => 'datetime',
        'views' => 'integer',
        'likes' => 'integer',
        'comments' => 'integer',
        'shares' => 'integer',
        'bookmarks' => 'integer',
        'payout_override_cents' => 'integer',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(UgcCampaign::class, 'ugc_campaign_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UgcCreator::class, 'ugc_creator_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(TrackedVideoSnapshot::class);
    }

    /** (likes + comments + shares) / views, as a percentage. */
    public function engagementRate(): float
    {
        return $this->views > 0
            ? round(($this->likes + $this->comments + $this->shares) / $this->views * 100, 2)
            : 0.0;
    }

    /** When this video's payout freezes: 30 days after posting (or after it was added). */
    public function finalizesAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->posted_at ?? $this->created_at)->addDays(30);
    }

    public function isFinalized(): bool
    {
        return $this->finalizesAt()->lessThanOrEqualTo(CarbonImmutable::now());
    }

    /**
     * Views the payout is computed from. Before the 30-day mark it is the live
     * number (an estimate that keeps moving). After it, an auto-synced row uses
     * the last snapshot taken up to that mark; manual rows (Instagram) keep the
     * typed number, since that is entered from the 30-day count.
     */
    public function payableViews(): int
    {
        if ($this->fetch_status !== 'ok' || ! $this->isFinalized()) {
            return $this->views;
        }

        $mark = $this->finalizesAt();

        $frozen = $this->snapshots
            ->filter(fn (TrackedVideoSnapshot $s) => $s->captured_at->lessThanOrEqualTo($mark))
            ->sortByDesc(fn (TrackedVideoSnapshot $s) => $s->captured_at->getTimestamp())
            ->first();

        return $frozen ? (int) $frozen->views : $this->views;
    }

    /**
     * Record the latest metrics both on the row (fast reads) and as a snapshot
     * (history), but only add a snapshot when a metric actually moved, so a daily
     * cron does not pile on identical points.
     *
     * @param  array{views?: int, likes?: int, comments?: int, shares?: int, bookmarks?: int}  $data
     */
    public function recordMetrics(array $data, string $fetchStatus = 'ok'): void
    {
        $metrics = [
            'views' => (int) ($data['views'] ?? $this->views),
            'likes' => (int) ($data['likes'] ?? $this->likes),
            'comments' => (int) ($data['comments'] ?? $this->comments),
            'shares' => (int) ($data['shares'] ?? $this->shares),
            'bookmarks' => (int) ($data['bookmarks'] ?? $this->bookmarks),
        ];

        $changed = $this->snapshots()->latest('captured_at')->first();
        $moved = $changed === null
            || $changed->views !== $metrics['views']
            || $changed->likes !== $metrics['likes']
            || $changed->comments !== $metrics['comments']
            || $changed->shares !== $metrics['shares']
            || $changed->bookmarks !== $metrics['bookmarks'];

        if ($moved) {
            $this->snapshots()->create([...$metrics, 'captured_at' => now()]);
        }

        $this->update([...$metrics, 'fetch_status' => $fetchStatus, 'last_synced_at' => now()]);
    }
}
