<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Models\Asset;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SlideProject;
use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Social\SocialPublisherFactory;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SlideProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();

        $projects = $workspace
            ? SlideProject::where('workspace_id', $workspace->id)
                ->latest()
                ->paginate(12)
                ->through(fn (SlideProject $p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'format' => $p->format,
                    'template' => $p->template,
                    'prompt' => $p->prompt,
                    'slide_count' => count($p->slides ?? []),
                    'cover_color' => data_get($p->slides, '0.background', '#1a1a1a'),
                    'created_at' => $p->created_at->diffForHumans(),
                ])
            : collect()->paginate(12);

        return Inertia::render('SlideshowsIndex', [
            'projects' => $projects,
        ]);
    }

    public function create(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $instagramAccounts = $workspace
            ? SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'instagram')
                ->get(['id', 'provider', 'handle', 'avatar', 'expires_at'])
            : collect();

        return Inertia::render('SlideEditor', [
            'slideProject' => null,
            'instagramAccounts' => $instagramAccounts,
        ]);
    }

    public function edit(Request $request, SlideProject $slideProject): Response
    {
        $this->authorizeWorkspace($request, $slideProject);

        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $instagramAccounts = $workspace
            ? SocialAccount::where('workspace_id', $workspace->id)
                ->where('provider', 'instagram')
                ->get(['id', 'provider', 'handle', 'avatar', 'expires_at'])
            : collect();

        $wizardConfig = session('wizardTopic') ? [
            'topic' => session('wizardTopic'),
            'style' => session('wizardStyle'),
            'slideCount' => session('wizardSlideCount', 3),
            'imageMode' => session('wizardImageMode', 'background'),
            'wordHighlight' => session('wizardWordHighlight', true),
        ] : null;

        return Inertia::render('SlideEditor', [
            'slideProject' => $slideProject->only('id', 'title', 'caption', 'format', 'slides'),
            'wizardConfig' => $wizardConfig,
            'instagramAccounts' => $instagramAccounts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'format' => ['required', 'string', 'in:post,stories'],
            'slides' => ['required', 'array'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        $project = SlideProject::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'caption' => $validated['caption'] ?? '',
            'format' => $validated['format'],
            'slides' => $validated['slides'],
        ]);

        return response()->json(['id' => $project->id]);
    }

    public function update(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'format' => ['required', 'string', 'in:post,stories'],
            'slides' => ['required', 'array'],
        ]);

        $slideProject->update($validated);

        return response()->json(['id' => $slideProject->id]);
    }

    public function duplicate(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject);

        $copy = $slideProject->replicate();
        $copy->title = $slideProject->title.' (cópia)';
        $copy->save();

        return response()->json(['id' => $copy->id]);
    }

    public function publishInstagram(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject);

        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'publish_at' => ['nullable', 'date', 'after_or_equal:now'],
            'images' => ['required', 'array', 'min:2', 'max:10'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg', 'max:10240'],
        ]);

        $workspace = Workspace::where('owner_id', $request->user()->id)->firstOrFail();

        $socialAccount = SocialAccount::where('workspace_id', $workspace->id)
            ->where('provider', 'instagram')
            ->findOrFail($validated['social_account_id']);

        $imageUrls = [];
        $disk = env('MEDIA_DISK', 'public');

        foreach ($validated['images'] as $file) {
            $path = $file->storePubliclyAs(
                "instagram/slide-projects/{$workspace->id}/{$slideProject->id}",
                Str::uuid().'.jpg',
                ['disk' => $disk]
            );

            if ($path === false) {
                throw new \Exception("Failed to upload image to disk: {$disk}. Check your filesystem configuration and credentials.");
            }

            $publicPath = Storage::disk($disk)->url($path);
            $fullUrl = url($publicPath);

            $imageUrls[] = $fullUrl;

            Asset::create([
                'workspace_id' => $workspace->id,
                'type' => 'image',
                'url' => $imageUrls[count($imageUrls) - 1],
                'metadata' => [
                    'source' => 'slide_project',
                    'slide_project_id' => $slideProject->id,
                ],
            ]);
        }

        $contentProject = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => $slideProject->title,
            'type' => 'carousel',
            'status' => 'ready',
            'script_data' => [
                'caption' => $validated['caption'] ?? '',
                'image_urls' => $imageUrls,
            ],
        ]);

        $publishAt = empty($validated['publish_at']) ? null : Carbon::parse($validated['publish_at']);
        $isScheduled = $publishAt && $publishAt->isFuture();

        $schedule = Schedule::create([
            'content_project_id' => $contentProject->id,
            'social_account_id' => $socialAccount->id,
            'publish_at' => $publishAt ?? now(),
            'status' => $isScheduled ? ScheduleStatus::Pending : ScheduleStatus::Publishing,
        ]);

        if ($isScheduled) {
            return response()->json([
                'schedule_id' => $schedule->id,
                'message' => 'Post scheduled successfully.',
            ]);
        }

        Log::info('Instagram Image URLs being sent:', ['urls' => $imageUrls]);

        try {
            $publisher = SocialPublisherFactory::make('instagram');
            $platformPostId = $publisher->publish($contentProject, $schedule);

            $schedule->update([
                'status' => ScheduleStatus::Published,
                'platform_post_id' => $platformPostId,
            ]);
        } catch (\Throwable $th) {
            $schedule->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => $th->getMessage(),
            ]);

            return response()->json([
                'message' => $th->getMessage(),
                'image_urls' => $imageUrls,
                'debug_info' => 'Ensure the URLs are publicly accessible. If using a local environment without a public disk, Instagram cannot download the images.',
            ], 422);
        }

        return response()->json([
            'schedule_id' => $schedule->id,
            'platform_post_id' => $schedule->platform_post_id,
        ]);
    }

    public function destroy(Request $request, SlideProject $slideProject): HttpResponse
    {
        $this->authorizeWorkspace($request, $slideProject);
        $slideProject->delete();

        return response()->noContent();
    }

    private function authorizeWorkspace(Request $request, SlideProject $slideProject): void
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        abort_unless($workspaceIds->contains($slideProject->workspace_id), 403);
    }
}
