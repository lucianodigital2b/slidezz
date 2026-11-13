<?php

namespace App\Http\Controllers;

use App\Jobs\AutoEditRecording;
use App\Jobs\RenderVideo;
use App\Models\SlideProject;
use App\Models\SocialAccount;
use App\Models\VideoProject;
use App\Models\Workspace;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Video projects: a timeline of image/video clips and a music track, previewed in
 * the browser with @remotion/player and rendered to MP4 by {@see RenderVideo}.
 */
class VideoProjectController extends Controller
{
    /** On-screen time for a slide turned into a clip. */
    private const SLIDE_SECONDS = 3;

    private const UPLOAD_MIMETYPES = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav';

    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $videos = VideoProject::where('workspace_id', $workspace->id)
            ->latest('updated_at')
            ->limit(100)
            ->get()
            ->map(fn (VideoProject $video): array => [
                'id' => $video->id,
                'title' => $video->title,
                'format' => $video->format,
                'status' => $video->status,
                'clip_count' => count($video->timeline['clips'] ?? []),
                'cover' => isset($video->timeline['clips'][0])
                    ? Arr::only($video->timeline['clips'][0], ['type', 'src'])
                    : null,
                'updated_at' => $video->updated_at->diffForHumans(),
            ])
            ->all();

        return Inertia::render('VideosIndex', ['videos' => $videos]);
    }

    public function store(Request $request): JsonResponse
    {
        $video = VideoProject::create([
            'workspace_id' => $this->workspace($request)->id,
            'title' => '',
            'format' => 'stories',
            'timeline' => ['clips' => [], 'audio' => null],
            'status' => 'draft',
        ]);

        return response()->json(['id' => $video->id], 201);
    }

    /**
     * Starts a video from a slideshow: the editor uploads every slide as a rendered
     * JPEG and each one becomes an image clip. With `render`, the MP4 render is queued
     * right away (plain ffmpeg, no Chrome) so the editor can download it without opening
     * the video editor.
     */
    public function storeFromSlides(Request $request, SlideProject $slideProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $slideProject->workspace_id);

        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:30'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg', 'max:10240'],
            'render' => ['sometimes', 'boolean'],
        ]);

        $video = VideoProject::create([
            'workspace_id' => $slideProject->workspace_id,
            'slide_project_id' => $slideProject->id,
            'title' => (string) $slideProject->title,
            'format' => $slideProject->format === 'post' ? 'post' : 'stories',
            'timeline' => ['clips' => [], 'audio' => null],
            'status' => 'draft',
        ]);

        $clips = [];

        foreach (array_values($validated['images']) as $index => $image) {
            $clips[] = $this->clip('image', $this->storeUpload($video, $image, sprintf('slide-%02d', $index + 1)), [
                'duration' => self::SLIDE_SECONDS,
                'transition' => $index === 0 ? 'none' : 'fade',
            ]);
        }

        $video->update(['timeline' => ['clips' => $clips, 'audio' => null]]);

        if ($request->boolean('render')) {
            $video->update(['status' => 'rendering', 'render_progress' => 0]);

            RenderVideo::dispatch($video, useFfmpeg: true);
        }

        return response()->json(['id' => $video->id], 201);
    }

    /**
     * Uploads a raw talking-head recording and queues the automatic edit pipeline.
     */
    public function autoEdit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:512000', 'mimetypes:video/mp4,video/quicktime,video/webm'],
            'title' => ['nullable', 'string', 'max:255'],
            'format' => ['nullable', Rule::in(VideoProject::FORMATS)],
            'language' => ['nullable', Rule::in(['pt', 'en'])],
            'caption_style' => ['nullable', Rule::in(['bold', 'clean'])],
        ]);

        $workspace = $this->workspace($request);
        $video = VideoProject::create([
            'workspace_id' => $workspace->id,
            'title' => (string) ($validated['title'] ?? ''),
            'format' => $validated['format'] ?? 'stories',
            'timeline' => ['clips' => [], 'audio' => null],
            'status' => 'draft',
            'auto_edit_status' => 'pending',
            'auto_edit_language' => $validated['language'] ?? null,
            'auto_edit_caption_style' => $validated['caption_style'] ?? 'bold',
        ]);

        $recording = $this->storeRecording($video, $validated['file']);
        $video->update([
            'source_recording_path' => $recording['path'],
            'auto_edit_status' => 'pending',
        ]);

        AutoEditRecording::dispatch($video);

        return response()->json([
            'id' => $video->id,
            'edit_url' => "/videos/{$video->id}",
        ], 201);
    }

    public function autoEditStatus(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        return response()->json([
            'status' => $videoProject->auto_edit_status,
            'error' => $videoProject->auto_edit_error,
            'timeline' => $videoProject->auto_edit_status === 'done' ? $videoProject->timeline : null,
        ]);
    }

    public function reAutoEdit(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        if ($videoProject->source_recording_path === null) {
            return response()->json(['message' => 'Nenhuma gravação de origem para reprocessar.'], 422);
        }

        $videoProject->update([
            'auto_edit_status' => 'pending',
            'auto_edit_error' => null,
        ]);

        AutoEditRecording::dispatch($videoProject);

        return response()->json(['status' => 'pending'], 202);
    }

    public function edit(Request $request, VideoProject $videoProject): Response
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        return Inertia::render('VideoEditor', [
            'videoProject' => $this->editorPayload($videoProject),
            'tiktokAccounts' => SocialAccount::where('workspace_id', $videoProject->workspace_id)
                ->where('provider', 'tiktok')
                ->get(['id', 'handle', 'avatar']),
        ]);
    }

    public function update(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        $hostedMedia = $this->hostedMediaRule();

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'format' => ['required', Rule::in(VideoProject::FORMATS)],
            'timeline' => ['required', 'array'],
            'timeline.clips' => ['present', 'array', 'max:100'],
            'timeline.clips.*.id' => ['required', 'string', 'max:64'],
            'timeline.clips.*.type' => ['required', Rule::in(['image', 'video'])],
            'timeline.clips.*.src' => ['required', 'string', 'max:2048', $hostedMedia],
            'timeline.clips.*.duration' => ['required', 'numeric', 'between:0.5,60'],
            'timeline.clips.*.trimStart' => ['nullable', 'numeric', 'between:0,3600'],
            'timeline.clips.*.transition' => ['required', Rule::in(VideoProject::TRANSITIONS)],
            'timeline.clips.*.text' => ['nullable', 'string', 'max:300'],
            'timeline.clips.*.textPosition' => ['required', Rule::in(VideoProject::TEXT_POSITIONS)],
            'timeline.clips.*.zoom' => ['boolean'],
            'timeline.clips.*.punchIn' => ['sometimes', 'boolean'],
            'timeline.clips.*.muted' => ['boolean'],
            'timeline.audio' => ['nullable', 'array'],
            'timeline.audio.src' => ['required_with:timeline.audio', 'string', 'max:2048', $hostedMedia],
            'timeline.audio.volume' => ['required_with:timeline.audio', 'numeric', 'between:0,1'],
            'timeline.captions' => ['nullable', 'array'],
            'timeline.captions.enabled' => ['required_with:timeline.captions', 'boolean'],
            'timeline.captions.style' => ['required_with:timeline.captions', Rule::in(['bold', 'clean'])],
            'timeline.captions.position' => ['required_with:timeline.captions', Rule::in(VideoProject::TEXT_POSITIONS)],
            'timeline.captions.items' => ['required_with:timeline.captions', 'array'],
            'timeline.captions.items.*.text' => ['required', 'string', 'max:300'],
            'timeline.captions.items.*.start' => ['required', 'numeric', 'min:0'],
            'timeline.captions.items.*.end' => ['required', 'numeric', 'gt:timeline.captions.items.*.start'],
            'timeline.captions.items.*.words' => ['present', 'array'],
            'timeline.captions.items.*.words.*.text' => ['required', 'string', 'max:100'],
            'timeline.captions.items.*.words.*.start' => ['required', 'numeric', 'min:0'],
            'timeline.captions.items.*.words.*.end' => ['required', 'numeric', 'gt:timeline.captions.items.*.words.*.start'],
            'timeline.captions.items.*.words.*.highlight' => ['boolean'],
        ]);

        $videoProject->update([
            'title' => (string) ($validated['title'] ?? ''),
            'format' => $validated['format'],
            'timeline' => $this->normalizeTimeline($validated['timeline']),
        ]);

        return response()->json(['id' => $videoProject->id]);
    }

    /**
     * Stores one image, video or music file for the timeline and returns its public URL.
     */
    public function media(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:204800', 'mimetypes:'.self::UPLOAD_MIMETYPES],
        ]);

        $file = $validated['file'];

        return response()->json([
            'type' => Str::before((string) $file->getMimeType(), '/'),
            'url' => $this->storeUpload($videoProject, $file, (string) Str::uuid()),
        ], 201);
    }

    public function render(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        if ($videoProject->isRendering()) {
            return response()->json(['status' => 'rendering'], 202);
        }

        if (empty($videoProject->timeline['clips'])) {
            return response()->json(['message' => 'Adicione pelo menos um clipe antes de exportar.'], 422);
        }

        $videoProject->update(['status' => 'rendering', 'render_progress' => 0, 'render_error' => null]);

        RenderVideo::dispatch($videoProject);

        return response()->json(['status' => 'rendering'], 202);
    }

    public function status(Request $request, VideoProject $videoProject): JsonResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        return response()->json(Arr::only($this->editorPayload($videoProject), [
            'status', 'render_progress', 'render_error', 'video_url',
        ]));
    }

    /**
     * The rendered MP4 as an attachment. The media disk lives on another origin, where
     * the browser ignores `<a download>`, so the file is streamed through the app.
     */
    public function download(Request $request, VideoProject $videoProject): StreamedResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        abort_unless($videoProject->video_path && $this->disk()->exists($videoProject->video_path), 404);

        $name = Str::slug((string) $videoProject->title) ?: "video-{$videoProject->id}";

        return $this->disk()->download($videoProject->video_path, "{$name}.mp4");
    }

    public function destroy(Request $request, VideoProject $videoProject): RedirectResponse
    {
        $this->authorizeWorkspace($request, $videoProject->workspace_id);

        $this->disk()->deleteDirectory($videoProject->storageDirectory());
        $videoProject->delete();

        return to_route('videos.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function editorPayload(VideoProject $video): array
    {
        return [
            ...$video->only('id', 'title', 'format', 'timeline', 'status', 'render_progress', 'render_error'),
            'video_url' => $video->videoUrl(),
            'auto_edit_status' => $video->auto_edit_status,
            'auto_edit_error' => $video->auto_edit_error,
        ];
    }

    /**
     * @param  array<string, mixed>  $timeline
     * @return array{clips: list<array<string, mixed>>, audio: array{src: string, volume: float}|null, captions: array{enabled: bool, style: string, position: string, items: list<array<string, mixed>>}|null}
     */
    private function normalizeTimeline(array $timeline): array
    {
        $audio = $timeline['audio'] ?? null;
        $captions = $timeline['captions'] ?? null;

        if ($captions !== null) {
            $captions = [
                'enabled' => (bool) ($captions['enabled'] ?? false),
                'style' => (string) ($captions['style'] ?? 'bold'),
                'position' => (string) ($captions['position'] ?? 'center'),
                'items' => array_values(array_map(fn (array $item): array => [
                    'text' => (string) ($item['text'] ?? ''),
                    'start' => (float) ($item['start'] ?? 0),
                    'end' => (float) ($item['end'] ?? 0),
                    'words' => array_values(array_map(fn (array $word): array => [
                        'text' => (string) ($word['text'] ?? ''),
                        'start' => (float) ($word['start'] ?? 0),
                        'end' => (float) ($word['end'] ?? 0),
                        'highlight' => (bool) ($word['highlight'] ?? false),
                    ], $item['words'] ?? [])),
                ], $captions['items'] ?? [])),
            ];
        }

        return [
            'clips' => array_map(
                fn (array $clip): array => $this->clip($clip['type'], $clip['src'], $clip),
                array_values($timeline['clips'] ?? []),
            ),
            'audio' => $audio ? ['src' => $audio['src'], 'volume' => (float) $audio['volume']] : null,
            'captions' => $captions,
        ];
    }

    /**
     * One clip in the shape of `VideoClip` (resources/js/remotion/timeline.ts).
     *
     * @param  'image'|'video'  $type
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function clip(string $type, string $src, array $attributes = []): array
    {
        $clip = [
            'id' => (string) ($attributes['id'] ?? Str::uuid()),
            'type' => $type,
            'src' => $src,
            'duration' => (float) ($attributes['duration'] ?? self::SLIDE_SECONDS),
            'trimStart' => (float) ($attributes['trimStart'] ?? 0),
            'transition' => $attributes['transition'] ?? 'fade',
            'text' => (string) ($attributes['text'] ?? ''),
            'textPosition' => $attributes['textPosition'] ?? 'center',
            'zoom' => (bool) ($attributes['zoom'] ?? false),
            'muted' => (bool) ($attributes['muted'] ?? false),
        ];

        // Punch-in only exists on auto-edited video clips; leave older timelines untouched.
        if ($type === 'video' && (bool) ($attributes['punchIn'] ?? false)) {
            $clip['punchIn'] = true;
        }

        return $clip;
    }

    /**
     * Timeline media must live on our media disk. The renderer's headless Chrome
     * fetches every source, so arbitrary URLs would let a user aim it at internal hosts.
     */
    private function hostedMediaRule(): \Closure
    {
        $baseUrl = Str::beforeLast(url($this->disk()->url('_')), '_');

        return function (string $attribute, mixed $value, \Closure $fail) use ($baseUrl): void {
            if (! is_string($value) || ! str_starts_with($value, $baseUrl)) {
                $fail('A mídia precisa ser enviada pelo editor de vídeo.');
            }
        };
    }

    private function storeUpload(VideoProject $video, UploadedFile $file, string $name): string
    {
        $extension = $file->guessExtension() ?: $file->getClientOriginalExtension();
        $path = $file->storePubliclyAs($video->storageDirectory(), "{$name}.{$extension}", [
            'disk' => config('filesystems.media_disk'),
        ]);

        if ($path === false) {
            throw new \RuntimeException('Could not store the upload on the media disk.');
        }

        return url($this->disk()->url($path));
    }

    /**
     * @return array{path: string, url: string}
     */
    private function storeRecording(VideoProject $video, UploadedFile $file): array
    {
        $extension = $file->guessExtension() ?: $file->getClientOriginalExtension();
        $name = (string) Str::uuid();
        $path = $file->storePubliclyAs($video->storageDirectory(), "recording-{$name}.{$extension}", [
            'disk' => config('filesystems.media_disk'),
        ]);

        if ($path === false) {
            throw new \RuntimeException('Could not store the recording on the media disk.');
        }

        return [
            'path' => $path,
            'url' => url($this->disk()->url($path)),
        ];
    }

    private function disk(): Filesystem
    {
        return Storage::disk(config('filesystems.media_disk'));
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }

    private function authorizeWorkspace(Request $request, int $workspaceId): void
    {
        $workspaceIds = Workspace::where('owner_id', $request->user()->id)->pluck('id');

        abort_unless($workspaceIds->contains($workspaceId), 403);
    }
}
