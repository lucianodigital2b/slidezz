<?php

namespace App\Http\Controllers;

use App\Enums\CampaignStatus;
use App\Enums\PayoutModel;
use App\Jobs\SyncTrackedVideo;
use App\Models\TrackedVideo;
use App\Models\UgcCampaign;
use App\Models\UgcCreator;
use App\Models\Workspace;
use App\Services\Ugc\UgcDashboard;
use App\Services\Ugc\VideoStatsFetcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * UGC campaign tracker: paste a creator's public TikTok/Instagram link, follow its
 * views over time, and see spend under the campaign's payout rule. Modeled on
 * viral.app — campaigns, tracked videos, creator payouts and the charts over them.
 */
class UgcCampaignController extends Controller
{
    public function __construct(private readonly UgcDashboard $dashboard) {}

    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);
        $days = $this->days($request);

        return Inertia::render('Ugc/Campaigns', [
            'overview' => $this->dashboard->overview($workspace->id, $days),
            'creators' => $this->creators($workspace),
            'days' => $days,
            'currency' => $workspace->profile['currency'] ?? 'USD',
            'defaults' => $this->payoutDefaults(),
        ]);
    }

    public function show(Request $request, UgcCampaign $campaign): Response
    {
        $this->authorizeCampaign($request, $campaign);
        $days = $this->days($request);

        return Inertia::render('Ugc/CampaignShow', [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status->value,
                'objective' => $campaign->objective,
                'currency' => $campaign->currency,
                'color' => $campaign->color,
                'payout_model' => $campaign->payout_model->value,
                'cpm_rate_cents' => $campaign->cpm_rate_cents,
                'flat_fee_cents' => $campaign->flat_fee_cents,
                'payout_cap_cents' => $campaign->payout_cap_cents,
                'budget_cents' => $campaign->budget_cents,
                'starts_on' => $campaign->starts_on?->toDateString(),
                'ends_on' => $campaign->ends_on?->toDateString(),
                'notes' => $campaign->notes,
            ],
            'data' => $this->dashboard->forCampaign($campaign, $days),
            'creators' => $this->creators($this->workspace($request)),
            'days' => $days,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $workspace = $this->workspace($request);
        $data = $this->validateCampaign($request);

        $campaign = UgcCampaign::create([...$data, 'workspace_id' => $workspace->id]);

        return redirect()->route('ugc.show', $campaign)->with('flash', 'Campanha criada.');
    }

    public function update(Request $request, UgcCampaign $campaign): RedirectResponse
    {
        $this->authorizeCampaign($request, $campaign);
        $campaign->update($this->validateCampaign($request));

        return back()->with('flash', 'Campanha atualizada.');
    }

    public function destroy(Request $request, UgcCampaign $campaign): RedirectResponse
    {
        $this->authorizeCampaign($request, $campaign);
        $campaign->delete();

        return redirect()->route('ugc.index')->with('flash', 'Campanha removida.');
    }

    /**
     * Add a video by its public link. TikTok is fetched right away so the row
     * lands with real numbers; Instagram comes in flagged for manual entry.
     */
    public function addVideo(Request $request, UgcCampaign $campaign, VideoStatsFetcher $fetcher): RedirectResponse
    {
        $this->authorizeCampaign($request, $campaign);

        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
            'ugc_creator_id' => ['nullable', Rule::exists('ugc_creators', 'id')->where('workspace_id', $campaign->workspace_id)],
        ]);

        $meta = $fetcher->fetch($validated['url']);

        if ($meta['platform'] === 'unknown') {
            throw ValidationException::withMessages([
                'url' => 'Link não reconhecido. Use uma URL pública de TikTok ou Instagram.',
            ]);
        }

        $video = $campaign->videos()->create([
            'ugc_creator_id' => $validated['ugc_creator_id'] ?? null,
            'platform' => $meta['platform'],
            'url' => $validated['url'],
            'external_id' => $meta['external_id'],
            'thumbnail_url' => $meta['thumbnail_url'],
            'caption' => $meta['caption'],
            'author_handle' => $meta['author_handle'],
            'posted_at' => $meta['posted_at'],
            'fetch_status' => $meta['fetch_status'],
        ]);

        if ($meta['fetch_status'] === 'ok') {
            $video->recordMetrics($meta, 'ok');
        }

        return back()->with('flash', 'Vídeo adicionado.');
    }

    public function syncVideo(Request $request, TrackedVideo $video): RedirectResponse
    {
        $this->authorizeVideo($request, $video);

        if ($video->platform === 'tiktok') {
            SyncTrackedVideo::dispatchSync($video);

            return back()->with('flash', 'Métricas atualizadas.');
        }

        return back()->with('flash', 'Instagram é atualizado manualmente.');
    }

    /**
     * Manual edits: metrics (for Instagram), creator assignment, payout override,
     * and the paid toggle.
     */
    public function updateVideo(Request $request, TrackedVideo $video): RedirectResponse
    {
        $this->authorizeVideo($request, $video);

        $validated = $request->validate([
            'ugc_creator_id' => ['nullable', Rule::exists('ugc_creators', 'id')->where('workspace_id', $video->campaign->workspace_id)],
            'views' => ['nullable', 'integer', 'min:0'],
            'likes' => ['nullable', 'integer', 'min:0'],
            'comments' => ['nullable', 'integer', 'min:0'],
            'shares' => ['nullable', 'integer', 'min:0'],
            'bookmarks' => ['nullable', 'integer', 'min:0'],
            'payout_override_cents' => ['nullable', 'integer', 'min:0'],
            'paid' => ['nullable', 'boolean'],
        ]);

        if (array_key_exists('ugc_creator_id', $validated)) {
            $video->ugc_creator_id = $validated['ugc_creator_id'];
        }

        // Only manual (Instagram / failed) rows let their metrics be typed; an
        // auto-synced TikTok row keeps the numbers the platform returned.
        if ($video->fetch_status !== 'ok') {
            foreach (['views', 'likes', 'comments', 'shares', 'bookmarks'] as $metric) {
                if (isset($validated[$metric])) {
                    $video->{$metric} = $validated[$metric];
                }
            }
            $video->recordMetrics([
                'views' => $video->views, 'likes' => $video->likes, 'comments' => $video->comments,
                'shares' => $video->shares, 'bookmarks' => $video->bookmarks,
            ], 'manual');
        }

        if (array_key_exists('payout_override_cents', $validated)) {
            $video->payout_override_cents = $validated['payout_override_cents'];
        }

        if (array_key_exists('paid', $validated)) {
            $video->paid_at = $validated['paid'] ? ($video->paid_at ?? now()) : null;
        }

        $video->save();

        return back()->with('flash', 'Vídeo atualizado.');
    }

    public function destroyVideo(Request $request, TrackedVideo $video): RedirectResponse
    {
        $this->authorizeVideo($request, $video);
        $video->delete();

        return back()->with('flash', 'Vídeo removido.');
    }

    public function storeCreator(Request $request): RedirectResponse
    {
        $workspace = $this->workspace($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:40'],
            'contact' => ['nullable', 'string', 'max:160'],
        ]);

        UgcCreator::create([...$validated, 'workspace_id' => $workspace->id]);

        return back()->with('flash', 'Criadora adicionada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateCampaign(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'status' => ['nullable', Rule::enum(CampaignStatus::class)],
            'objective' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'size:3'],
            'payout_model' => ['nullable', Rule::enum(PayoutModel::class)],
            'cpm_rate_cents' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'flat_fee_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'payout_cap_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'budget_cents' => ['nullable', 'integer', 'min:0'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'color' => ['nullable', 'string', 'max:9'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function days(Request $request): int
    {
        $days = (int) $request->integer('days', 30);

        return in_array($days, [7, 30, 90], true) ? $days : 30;
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::firstOrCreate(
            ['owner_id' => $request->user()->id],
            ['name' => $request->user()->name ?? 'Workspace'],
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function creators(Workspace $workspace): array
    {
        return UgcCreator::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get(['id', 'name', 'handle', 'avatar', 'platform', 'contact'])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function payoutDefaults(): array
    {
        return [
            'payout_model' => PayoutModel::Cpm->value,
            'currency' => 'USD',
            'color' => '#4F46E5',
        ];
    }

    private function authorizeCampaign(Request $request, UgcCampaign $campaign): void
    {
        abort_unless(
            $campaign->workspace()->where('owner_id', $request->user()->id)->exists(),
            403,
        );
    }

    private function authorizeVideo(Request $request, TrackedVideo $video): void
    {
        $this->authorizeCampaign($request, $video->campaign);
    }
}
