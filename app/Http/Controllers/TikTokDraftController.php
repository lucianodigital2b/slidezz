<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\PublishScheduledContent;
use App\Models\ContentProject;
use App\Models\Schedule;
use App\Models\SlideProject;
use App\Models\SocialAccount;
use App\Models\VideoProject;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * "Enviar rascunho pro TikTok": pushes a carousel or a rendered video to the
 * creator's TikTok inbox, where they add sound and caption and tap post.
 *
 * Every send becomes a {@see Schedule} so it shows in the calendar with its
 * outcome, and runs on the queue because a video upload can take a while.
 */
class TikTokDraftController extends Controller
{
    /**
     * Carousel from the slide editor: the browser exports each slide as a JPEG.
     */
    public function slideProject(Request $request, SlideProject $slideProject): JsonResponse
    {
        $workspace = $this->workspace($request);
        abort_unless($slideProject->workspace_id === $workspace->id, 403);

        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'images' => ['required', 'array', 'min:1', 'max:35'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg', 'max:20480'],
        ]);

        $account = $this->account($workspace, $validated['social_account_id']);
        $disk = config('filesystems.media_disk');
        $imageUrls = [];

        foreach ($validated['images'] as $file) {
            $path = $file->storePubliclyAs(
                "tiktok/slide-projects/{$workspace->id}/{$slideProject->id}",
                Str::uuid().'.jpg',
                ['disk' => $disk],
            );

            abort_if($path === false, 500, 'Não foi possível salvar as imagens.');

            $imageUrls[] = url(Storage::disk($disk)->url($path));
        }

        $project = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => $slideProject->title,
            'type' => 'carousel',
            'status' => 'ready',
            'script_data' => [
                'hook' => $slideProject->title,
                'caption' => $validated['caption'] ?? '',
                'image_urls' => $imageUrls,
                'slide_project_id' => $slideProject->id,
            ],
        ]);

        return $this->send($project, $account);
    }

    /**
     * A carousel made by the TikTok generator or an automation; its slides are
     * already rendered on the media disk.
     */
    public function contentProject(Request $request, ContentProject $contentProject): JsonResponse
    {
        $workspace = $this->workspace($request);
        abort_unless($contentProject->workspace_id === $workspace->id, 403);

        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
        ]);

        abort_if(
            $contentProject->status !== 'ready' || empty($contentProject->script_data['image_urls']),
            422,
            'Esse carrossel ainda não terminou de ser gerado.',
        );

        return $this->send($contentProject, $this->account($workspace, $validated['social_account_id']));
    }

    public function videoProject(Request $request, VideoProject $videoProject): JsonResponse
    {
        $workspace = $this->workspace($request);
        abort_unless($videoProject->workspace_id === $workspace->id, 403);

        $validated = $request->validate([
            'social_account_id' => ['required', 'integer'],
        ]);

        abort_if(
            $videoProject->status !== 'ready' || ! $videoProject->video_path,
            422,
            'Renderize o vídeo antes de enviar pro TikTok.',
        );

        $project = ContentProject::create([
            'workspace_id' => $workspace->id,
            'title' => $videoProject->title ?: 'Vídeo',
            'type' => 'video',
            'status' => 'ready',
            'video_url' => $videoProject->videoUrl(),
            'script_data' => [
                'video_path' => $videoProject->video_path,
                'video_project_id' => $videoProject->id,
            ],
        ]);

        return $this->send($project, $this->account($workspace, $validated['social_account_id']));
    }

    /**
     * Polled by the client after a send, until TikTok accepted or refused it.
     */
    public function status(Request $request, Schedule $schedule): JsonResponse
    {
        abort_unless($schedule->socialAccount?->workspace_id === $this->workspace($request)->id, 403);

        return response()->json($this->summarize($schedule));
    }

    private function send(ContentProject $project, SocialAccount $account): JsonResponse
    {
        // Created as publishing, not pending, so the every-minute scheduler
        // doesn't dispatch it a second time.
        $schedule = Schedule::create([
            'content_project_id' => $project->id,
            'social_account_id' => $account->id,
            'publish_at' => now(),
            'status' => ScheduleStatus::Publishing,
        ]);

        PublishScheduledContent::dispatch($schedule);

        return response()->json($this->summarize($schedule->refresh()), 202);
    }

    /**
     * @return array{id: int, status: string, error: string|null}
     */
    private function summarize(Schedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'status' => $schedule->status->value,
            'error' => $schedule->error_log,
        ];
    }

    private function account(Workspace $workspace, int $accountId): SocialAccount
    {
        return SocialAccount::where('workspace_id', $workspace->id)
            ->where('provider', 'tiktok')
            ->findOrFail($accountId);
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }
}
