<?php

namespace Tests\Feature;

use App\Models\TrackedVideo;
use App\Models\TrackedVideoSnapshot;
use App\Models\UgcCampaign;
use App\Models\UgcCreator;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UgcPayoutScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_payday_uses_anchor_and_interval(): void
    {
        Carbon::setTestNow('2026-11-27 12:00:00');

        [, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, ['payout_anchor_on' => '2026-11-27', 'payout_interval_days' => 14]);

        $v1 = $this->video($campaign, null, '2026-10-28 19:50:00');
        $v2 = $this->video($campaign, null, '2026-10-30 10:00:00');

        $this->assertSame('2026-11-27', $campaign->paydayFor($v1->finalizesAt(), null)?->toDateString());
        $this->assertSame('2026-12-11', $campaign->paydayFor($v2->finalizesAt(), null)?->toDateString());
    }

    public function test_finalized_tiktok_row_uses_views_frozen_at_day_30(): void
    {
        Carbon::setTestNow('2026-11-02 12:00:00');

        [, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, ['payout_model' => 'cpm', 'cpm_rate_cents' => 100, 'flat_fee_cents' => 0]);

        $video = $this->video($campaign, null, '2026-10-01 00:00:00', ['views' => 200000]);
        $this->snapshot($video, 50000, '2026-10-30 00:00:00');
        $this->snapshot($video, 200000, '2026-11-01 00:00:00');

        $this->assertSame(50000, $video->payableViews());
        $this->assertSame(5000, $campaign->payoutForCents($video, $video->payableViews()));
    }

    public function test_unfinalized_row_is_an_estimate_from_live_views(): void
    {
        Carbon::setTestNow('2026-11-02 12:00:00');

        [, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, ['payout_model' => 'cpm', 'cpm_rate_cents' => 100, 'flat_fee_cents' => 0]);

        $video = $this->video($campaign, null, '2026-10-28 00:00:00', ['views' => 1500]);
        $this->snapshot($video, 900, '2026-10-29 00:00:00');

        $this->assertFalse($video->isFinalized());
        $this->assertSame(1500, $video->payableViews());
    }

    public function test_cap_applies_to_frozen_views(): void
    {
        Carbon::setTestNow('2026-11-02 12:00:00');

        [, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, [
            'payout_model' => 'cpm', 'cpm_rate_cents' => 100, 'flat_fee_cents' => 0, 'payout_cap_cents' => 20000,
        ]);

        $video = $this->video($campaign, null, '2026-10-01 00:00:00', ['views' => 900000]);
        $this->snapshot($video, 500000, '2026-10-30 00:00:00');

        $this->assertSame(20000, $campaign->payoutForCents($video, $video->payableViews()));
    }

    public function test_dashboard_lists_due_open_and_paid_per_creator(): void
    {
        Carbon::setTestNow('2026-12-11 12:00:00');

        [$user, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, ['payout_anchor_on' => '2026-12-01', 'payout_interval_days' => 14]);

        $ana = $this->creator($workspace, 'Ana');
        $bia = $this->creator($workspace, 'Bia');

        $this->video($campaign, $ana->id, '2026-10-20 00:00:00', ['paid_at' => '2026-11-19 10:00:00']);
        $this->video($campaign, $ana->id, '2026-11-01 00:00:00');
        $this->video($campaign, $bia->id, '2026-11-05 00:00:00');
        $this->video($campaign, $bia->id, '2026-11-10 00:00:00');

        $this->actingAs($user)
            ->get("/ugc/{$campaign->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Ugc/CampaignShow')
                ->where('data.payouts.0.creator_id', $ana->id)
                ->where('data.payouts.0.videos', 2)
                ->where('data.payouts.0.next_payout_on', '2026-12-01')
                ->where('data.payouts.0.next_payout_cents', 1000)
                ->where('data.payouts.0.next_payout_final', true)
                ->where('data.payouts.0.due_cents', 1000)
                ->where('data.payouts.0.due_payout_on', '2026-12-01')
                ->where('data.payouts.0.open_cents', 1000)
                ->where('data.payouts.0.paid_cents', 1000)
                ->where('data.payouts.0.last_paid_at', '2026-11-19')
                ->where('data.payouts.1.creator_id', $bia->id)
                ->where('data.payouts.1.next_payout_on', '2026-12-15')
                ->where('data.payouts.1.next_payout_cents', 2000)
                ->where('data.payouts.1.due_cents', 0)
                ->where('data.payouts.1.due_payout_on', null)
                ->where('data.payouts.1.open_cents', 2000)
                ->where('data.payouts.1.paid_cents', 0)
                ->where('data.videos.0.payout_on', fn ($v) => in_array($v, ['2026-11-19', '2026-12-01', '2026-12-15'], true))
            );
    }

    public function test_pay_creator_marks_only_that_creator_and_payday(): void
    {
        Carbon::setTestNow('2026-12-11 12:00:00');

        [$user, $workspace] = $this->user();
        $campaign = $this->campaign($workspace, ['payout_anchor_on' => '2026-12-01', 'payout_interval_days' => 14]);

        $ana = $this->creator($workspace, 'Ana');
        $bia = $this->creator($workspace, 'Bia');

        $a1 = $this->video($campaign, $ana->id, '2026-11-01 00:00:00');
        $a2 = $this->video($campaign, $ana->id, '2026-11-10 00:00:00');
        $b1 = $this->video($campaign, $bia->id, '2026-11-01 00:00:00');

        $this->actingAs($user)
            ->post("/ugc/{$campaign->id}/payouts", ['ugc_creator_id' => $ana->id, 'payout_on' => '2026-12-01'])
            ->assertRedirect();

        $this->assertNotNull($a1->fresh()->paid_at);
        $this->assertNull($a2->fresh()->paid_at);
        $this->assertNull($b1->fresh()->paid_at);
    }

    /** @return array{0: User, 1: Workspace} */
    private function user(): array
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
            'lifetime_access_at' => now(),
        ]);

        return [$user, Workspace::factory()->create(['owner_id' => $user->id])];
    }

    private function campaign(Workspace $workspace, array $attributes = []): UgcCampaign
    {
        return UgcCampaign::create([
            'workspace_id' => $workspace->id,
            'name' => 'Campanha',
            'payout_model' => 'flat',
            'flat_fee_cents' => 1000,
            'cpm_rate_cents' => 0,
            ...$attributes,
        ]);
    }

    private function creator(Workspace $workspace, string $name): UgcCreator
    {
        return UgcCreator::create(['workspace_id' => $workspace->id, 'name' => $name]);
    }

    private function video(UgcCampaign $campaign, ?int $creatorId, string $postedAt, array $attributes = []): TrackedVideo
    {
        return TrackedVideo::create([
            'ugc_campaign_id' => $campaign->id,
            'ugc_creator_id' => $creatorId,
            'platform' => 'tiktok',
            'url' => 'https://www.tiktok.com/@test/video/'.uniqid(),
            'posted_at' => $postedAt,
            'views' => 0,
            'fetch_status' => 'ok',
            ...$attributes,
        ]);
    }

    private function snapshot(TrackedVideo $video, int $views, string $at): void
    {
        TrackedVideoSnapshot::create([
            'tracked_video_id' => $video->id,
            'views' => $views, 'likes' => 0, 'comments' => 0, 'shares' => 0, 'bookmarks' => 0,
            'captured_at' => $at,
        ]);
    }
}
