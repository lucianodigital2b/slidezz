<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Enums\PayoutModel;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UgcCampaign extends Model
{
    protected $fillable = [
        'workspace_id',
        'name',
        'status',
        'objective',
        'currency',
        'payout_model',
        'cpm_rate_cents',
        'flat_fee_cents',
        'payout_cap_cents',
        'budget_cents',
        'payout_anchor_on',
        'payout_interval_days',
        'starts_on',
        'ends_on',
        'color',
        'notes',
    ];

    protected $casts = [
        'status' => CampaignStatus::class,
        'payout_model' => PayoutModel::class,
        'cpm_rate_cents' => 'integer',
        'flat_fee_cents' => 'integer',
        'payout_cap_cents' => 'integer',
        'budget_cents' => 'integer',
        'payout_anchor_on' => 'date',
        'payout_interval_days' => 'integer',
        'starts_on' => 'date',
        'ends_on' => 'date',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function videos(): HasMany
    {
        return $this->hasMany(TrackedVideo::class);
    }

    /**
     * The payout owed for one video under this campaign's rule, in cents. A video
     * can override the computed amount (manual entry); the cap, when set, is the
     * ceiling for the computed part only (an explicit override is honored as-is).
     * `$views` lets the caller pass views frozen at the 30-day mark.
     */
    public function payoutForCents(TrackedVideo $video, ?int $views = null): int
    {
        if ($video->payout_override_cents !== null) {
            return $video->payout_override_cents;
        }

        $views ??= $video->views;
        $cpmPart = (int) round($views / 1000 * $this->cpm_rate_cents);

        $amount = match ($this->payout_model) {
            PayoutModel::Cpm => $cpmPart,
            PayoutModel::Flat => $this->flat_fee_cents,
            PayoutModel::CpmPlusFlat => $this->flat_fee_cents + $cpmPart,
        };

        if ($this->payout_cap_cents !== null) {
            $amount = min($amount, $this->payout_cap_cents);
        }

        return $amount;
    }

    /**
     * The payday a video lands on: the first date of the anchor + k * interval
     * series that is on or after the day it finalizes. Without an anchor on the
     * campaign, the caller's fallback (the earliest finalization) starts the series.
     */
    public function paydayFor(CarbonInterface $finalizesAt, ?CarbonInterface $fallbackAnchor): ?CarbonImmutable
    {
        $anchor = $this->payout_anchor_on ?? $fallbackAnchor;

        if ($anchor === null) {
            return null;
        }

        $anchor = CarbonImmutable::parse($anchor)->startOfDay();
        $day = CarbonImmutable::parse($finalizesAt)->startOfDay();

        if ($anchor->greaterThanOrEqualTo($day)) {
            return $anchor;
        }

        $interval = max(1, (int) ($this->payout_interval_days ?: 14));
        $steps = (int) ceil(round($anchor->diffInDays($day)) / $interval);

        return $anchor->addDays($steps * $interval);
    }
}
