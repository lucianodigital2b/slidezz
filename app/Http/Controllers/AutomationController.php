<?php

namespace App\Http\Controllers;

use App\Enums\SlideTextPreset;
use App\Models\Automation;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Automations\AutomationRunner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AutomationController extends Controller
{
    public function __construct(private readonly AutomationRunner $runner) {}

    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $automations = Automation::where('workspace_id', $workspace->id)
            ->with(['socialAccount:id,handle,avatar', 'runs' => fn ($query) => $query->latest('ran_at')->limit(5)->with('contentProject:id,title,status')])
            ->latest('id')
            ->get()
            ->map(fn (Automation $automation): array => [
                'id' => $automation->id,
                'name' => $automation->name,
                'status' => $automation->status,
                'niche' => $automation->niche,
                'slide_count' => $automation->slide_count,
                'image_source' => $automation->image_source,
                'image_keywords' => $automation->image_keywords ?? [],
                'text_position' => $automation->text_position,
                'text_preset' => $automation->text_preset->value,
                'post_times' => $automation->post_times,
                'timezone' => $automation->timezone,
                'social_account' => $automation->socialAccount?->only(['id', 'handle', 'avatar']),
                'next_run_at' => $automation->next_run_at?->toIso8601String(),
                'last_run_at' => $automation->last_run_at?->toIso8601String(),
                'runs' => $automation->runs->map(fn ($run): array => [
                    'id' => $run->id,
                    'status' => $run->status,
                    'error' => $run->error,
                    'ran_at' => $run->ran_at?->toIso8601String(),
                    'content_project_id' => $run->content_project_id,
                    'title' => $run->contentProject?->title,
                ])->all(),
            ])
            ->all();

        return Inertia::render('Automations', [
            'automations' => $automations,
            'tiktokAccounts' => SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'tiktok')
                ->get(['id', 'handle', 'avatar'])
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $workspace = $this->workspace($request);
        $validated = $this->validated($request, $workspace);

        $automation = new Automation([...$validated, 'workspace_id' => $workspace->id]);
        $automation->save();
        $automation->update(['next_run_at' => $automation->nextSlotAfter()]);

        return back()->with('success', 'Automação criada.');
    }

    public function update(Request $request, Automation $automation): RedirectResponse
    {
        $workspace = $this->workspace($request);
        $this->authorizeAutomation($automation, $workspace);

        $automation->update($this->validated($request, $workspace));
        $automation->update(['next_run_at' => $automation->nextSlotAfter()]);

        return back()->with('success', 'Automação atualizada.');
    }

    public function destroy(Request $request, Automation $automation): RedirectResponse
    {
        $this->authorizeAutomation($automation, $this->workspace($request));

        $automation->delete();

        return back()->with('success', 'Automação removida.');
    }

    /**
     * Generate one carousel immediately, without touching the posting schedule.
     */
    public function runNow(Request $request, Automation $automation): RedirectResponse
    {
        $this->authorizeAutomation($automation, $this->workspace($request));

        if (! $request->user()->hasPremiumAccess()) {
            return back()->with('error', 'Ative o acesso vitalício para rodar automações.');
        }

        $this->runner->run($automation);

        return back()->with('success', 'Geração iniciada. O carrossel aparece aqui em instantes.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, Workspace $workspace): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'niche' => ['required', 'string', 'max:1000'],
            'status' => ['nullable', Rule::in(['active', 'paused'])],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:12'],
            'image_source' => ['nullable', Rule::in(['pinterest', 'ai'])],
            'image_keywords' => ['nullable', 'array', 'max:20'],
            'image_keywords.*' => ['string', 'max:80'],
            'text_position' => ['nullable', Rule::in(['top', 'center', 'bottom'])],
            'text_preset' => ['nullable', Rule::in(SlideTextPreset::values())],
            'post_times' => ['required', 'array', 'min:1', 'max:8'],
            'post_times.*' => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'timezone' => ['nullable', 'timezone'],
            'social_account_id' => ['nullable', 'integer'],
            'language' => ['nullable', 'string', 'max:50'],
        ]);

        if (! empty($validated['social_account_id'])) {
            SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'tiktok')
                ->findOrFail($validated['social_account_id']);
        }

        return $validated;
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }

    private function authorizeAutomation(Automation $automation, Workspace $workspace): void
    {
        abort_unless($automation->workspace_id === $workspace->id, 403);
    }
}
