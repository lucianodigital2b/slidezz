<?php

namespace App\Services\Agent;

use App\Enums\SlideTextPreset;
use App\Models\AgentAsset;
use App\Models\AgentConversation;
use App\Models\AgentPublishRequest;
use App\Models\ContentProject;
use App\Models\SocialAccount;
use App\Services\Images\ImageSourceFactory;
use App\Services\Images\PinterestImageSource;
use App\Services\Rendering\SlideshowRenderer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Process\Process;

class AgentToolbox
{
    /**
     * JSON-schema tool definitions. Not strict: the schemas use limits (maxItems, minimum) strict mode rejects; execute() validates inputs.
     *
     * @return list<array<string, mixed>>
     */
    public static function definitions(): array
    {
        return [
            [
                'name' => 'fetch_tiktok',
                'description' => 'Download a TikTok post (photo carousel or video) and store its media as source assets.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'url' => ['type' => 'string', 'description' => 'TikTok post URL (tiktok.com domain).'],
                    ],
                    'required' => ['url'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'view_assets',
                'description' => 'Return the images of the given assets so you can look at them.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'asset_ids' => [
                            'type' => 'array',
                            'items' => ['type' => 'integer'],
                            'maxItems' => 12,
                            'description' => 'Agent asset IDs to view.',
                        ],
                    ],
                    'required' => ['asset_ids'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'search_images',
                'description' => 'Search Pinterest for vertical photos and store the chosen ones as search assets.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Search query.'],
                        'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 8],
                    ],
                    'required' => ['query'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'generate_image',
                'description' => 'Generate a single new 9:16 image with Gemini (BYOK).',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'prompt' => ['type' => 'string', 'description' => 'Scene description for the image.'],
                    ],
                    'required' => ['prompt'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'build_slideshow',
                'description' => 'Create or update a ContentProject slideshow and render each slide to JPEG.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'title' => ['type' => 'string'],
                        'preset' => ['type' => 'string', 'enum' => SlideTextPreset::values()],
                        'text_position' => ['type' => 'string', 'enum' => ['top', 'center', 'bottom']],
                        'caption' => ['type' => 'string'],
                        'slides' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'text' => ['type' => 'string'],
                                    'asset_id' => ['type' => 'integer'],
                                ],
                                'required' => ['text', 'asset_id'],
                                'additionalProperties' => false,
                            ],
                            'minItems' => 2,
                            'maxItems' => 10,
                        ],
                    ],
                    'required' => ['title', 'preset', 'text_position', 'slides'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_social_accounts',
                'description' => 'List the social accounts connected to the workspace.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => (object) [],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'request_publish',
                'description' => 'Create a pending publish request; the user must press Confirm to actually schedule it.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'social_account_id' => ['type' => 'integer'],
                        'publish_at' => ['type' => 'string', 'description' => 'ISO 8601 date-time in the future.'],
                        'caption' => ['type' => 'string'],
                    ],
                    'required' => ['social_account_id', 'publish_at', 'caption'],
                    'additionalProperties' => false,
                ],
            ],
        ];
    }

    /**
     * Execute a tool and return its tool_result content as an array of blocks.
     *
     * @return list<array<string, mixed>>
     */
    public function execute(AgentConversation $conversation, string $name, array $input): array
    {
        return match ($name) {
            'fetch_tiktok' => $this->fetchTiktok($conversation, $input),
            'view_assets' => $this->viewAssets($conversation, $input),
            'search_images' => $this->searchImages($conversation, $input),
            'generate_image' => $this->generateImage($conversation, $input),
            'build_slideshow' => $this->buildSlideshow($conversation, $input),
            'list_social_accounts' => $this->listSocialAccounts($conversation),
            'request_publish' => $this->requestPublish($conversation, $input),
            default => throw new InvalidArgumentException("Unknown agent tool: {$name}"),
        };
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function fetchTiktok(AgentConversation $conversation, array $input): array
    {
        $url = trim((string) ($input['url'] ?? ''));

        if ($url === '' || ! $this->isTikTokUrl($url)) {
            throw new InvalidArgumentException('Provide a valid tiktok.com URL.');
        }

        $response = Http::timeout(30)->asForm()->post('https://www.tikwm.com/api/', [
            'url' => $url,
            'hd' => 1,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('TikTok download failed with HTTP '.$response->status().'.');
        }

        $data = $response->json('data');

        if (! is_array($data)) {
            throw new RuntimeException('TikTok download did not return post data.');
        }

        $type = ! empty($data['images']) ? 'photo' : 'video';
        $assetIds = [];

        if ($type === 'photo') {
            foreach (($data['images'] ?? []) as $index => $imageUrl) {
                if (! is_string($imageUrl) || $imageUrl === '') {
                    continue;
                }

                $binary = Http::timeout(30)->get($imageUrl)->body();
                $path = $this->storeImage($conversation, $binary, 'source-'.($index + 1).'.jpg');

                $asset = AgentAsset::create([
                    'agent_conversation_id' => $conversation->id,
                    'kind' => 'source',
                    'url' => $imageUrl,
                    'path' => $path,
                    'meta' => ['tiktok_url' => $url, 'index' => $index],
                ]);
                $assetIds[] = $asset->id;
            }
        } else {
            $videoUrl = $data['play'] ?? null;

            if (! is_string($videoUrl) || $videoUrl === '') {
                throw new RuntimeException('Could not find a downloadable video URL.');
            }

            $videoBinary = Http::timeout(60)->get($videoUrl)->body();
            $tempVideo = tempnam(sys_get_temp_dir(), 'slidezz-agent-video-');
            file_put_contents($tempVideo, $videoBinary);

            try {
                $frames = $this->extractVideoFrames($tempVideo, 6);
            } finally {
                unlink($tempVideo);
            }

            foreach ($frames as $index => $frameBinary) {
                $path = $this->storeImage($conversation, $frameBinary, 'frame-'.($index + 1).'.jpg');
                $asset = AgentAsset::create([
                    'agent_conversation_id' => $conversation->id,
                    'kind' => 'source',
                    'url' => $videoUrl,
                    'path' => $path,
                    'meta' => ['tiktok_url' => $url, 'frame_index' => $index],
                ]);
                $assetIds[] = $asset->id;
            }
        }

        $text = json_encode([
            'type' => $type,
            'caption' => isset($data['title']) && is_string($data['title']) ? $data['title'] : '',
            'author' => isset($data['author']['nickname']) && is_string($data['author']['nickname']) ? $data['author']['nickname'] : '',
            'music_title' => isset($data['music']['title']) && is_string($data['music']['title']) ? $data['music']['title'] : '',
            'play_count' => (int) ($data['play_count'] ?? 0),
            'digg_count' => (int) ($data['digg_count'] ?? 0),
            'asset_ids' => $assetIds,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return [['type' => 'text', 'text' => $text]];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function viewAssets(AgentConversation $conversation, array $input): array
    {
        $ids = array_values(array_unique(array_map(
            fn (mixed $id): int => (int) $id,
            (array) ($input['asset_ids'] ?? []),
        )));

        if ($ids === [] || count($ids) > 12) {
            throw new InvalidArgumentException('asset_ids must contain at most 12 asset IDs.');
        }

        $assets = AgentAsset::where('agent_conversation_id', $conversation->id)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $blocks = [];

        foreach ($ids as $id) {
            $asset = $assets->get($id);

            if (! $asset) {
                continue;
            }

            $blocks[] = ['type' => 'text', 'text' => "asset {$asset->id}"];
            $blocks[] = $this->imageBlockFromAsset($asset);
        }

        return $blocks;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function searchImages(AgentConversation $conversation, array $input): array
    {
        $query = trim((string) ($input['query'] ?? ''));

        if ($query === '') {
            throw new InvalidArgumentException('query is required.');
        }

        $limit = (int) ($input['limit'] ?? 4);
        $limit = min(8, max(1, $limit));

        $results = app(PinterestImageSource::class)->search($query, $limit, []);

        $assets = collect();
        $ids = [];

        foreach ($results as $result) {
            $asset = AgentAsset::create([
                'agent_conversation_id' => $conversation->id,
                'kind' => 'search',
                'url' => $result['url'],
                'meta' => [
                    'source_id' => $result['source_id'],
                    'width' => $result['width'],
                    'height' => $result['height'],
                    'query' => $query,
                ],
            ]);
            $assets->push($asset);
            $ids[] = $asset->id;
        }

        $blocks = [['type' => 'text', 'text' => json_encode(['asset_ids' => $ids])]];

        foreach ($assets as $asset) {
            $blocks[] = $this->imageBlockFromAsset($asset);
        }

        return $blocks;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function generateImage(AgentConversation $conversation, array $input): array
    {
        $prompt = trim((string) ($input['prompt'] ?? ''));

        if ($prompt === '') {
            throw new InvalidArgumentException('prompt is required.');
        }

        $ownerKey = $conversation->workspace->owner?->byokGeminiKey();
        $source = ImageSourceFactory::make('ai', $ownerKey);
        $result = $source->search($prompt, 1)[0] ?? null;

        if ($result === null) {
            throw new RuntimeException('Image generation did not return an image.');
        }

        $asset = AgentAsset::create([
            'agent_conversation_id' => $conversation->id,
            'kind' => 'generated',
            'url' => $result['url'],
            'meta' => [
                'width' => $result['width'],
                'height' => $result['height'],
                'prompt' => $prompt,
            ],
        ]);

        return [
            ['type' => 'text', 'text' => json_encode(['asset_id' => $asset->id])],
            $this->imageBlockFromAsset($asset),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function buildSlideshow(AgentConversation $conversation, array $input): array
    {
        $title = trim((string) ($input['title'] ?? ''));
        $textPosition = (string) ($input['text_position'] ?? 'center');
        $caption = trim((string) ($input['caption'] ?? ''));
        $presetValue = (string) ($input['preset'] ?? '');
        $preset = SlideTextPreset::tryFrom($presetValue);

        if ($title === '') {
            throw new InvalidArgumentException('title is required.');
        }

        if ($preset === null) {
            throw new InvalidArgumentException('preset must be one of '.implode(', ', SlideTextPreset::values()).'.');
        }

        if (! in_array($textPosition, ['top', 'center', 'bottom'], true)) {
            throw new InvalidArgumentException('text_position must be top, center, or bottom.');
        }

        $slidesInput = $input['slides'] ?? [];

        if (! is_array($slidesInput) || count($slidesInput) < 2 || count($slidesInput) > 10) {
            throw new InvalidArgumentException('slides must contain 2 to 10 slides.');
        }

        $validatedSlides = [];

        foreach ($slidesInput as $index => $slide) {
            $text = trim((string) ($slide['text'] ?? ''));
            $assetId = (int) ($slide['asset_id'] ?? 0);

            if ($text === '') {
                throw new InvalidArgumentException('Slide '.($index + 1).' text is required.');
            }

            if ($assetId <= 0) {
                throw new InvalidArgumentException('Slide '.($index + 1).' asset_id is required.');
            }

            $asset = AgentAsset::where('agent_conversation_id', $conversation->id)->find($assetId);

            if (! $asset) {
                throw new InvalidArgumentException("Asset {$assetId} not found in this conversation.");
            }

            if ($asset->kind === 'source') {
                throw new InvalidArgumentException('Source assets cannot be used in a rebuilt slideshow.');
            }

            $validatedSlides[] = ['text' => $text, 'asset' => $asset];
        }

        $renderer = app(SlideshowRenderer::class);
        $disk = Storage::disk(config('filesystems.media_disk'));
        // A new folder per build, so previews never show a cached older render.
        $directory = "agent/{$conversation->id}/render/".now()->format('YmdHisv');
        $rendered = [];

        foreach ($validatedSlides as $index => $slide) {
            $asset = $slide['asset'];
            $imageSource = $asset->path
                ? $disk->url($asset->path)
                : $asset->url;

            $jpeg = $renderer->render($imageSource, $slide['text'], $textPosition, $preset);
            $path = sprintf('%s/%02d.jpg', $directory, $index + 1);

            $disk->put($path, $jpeg, 'public');

            $rendered[] = [
                'index' => $index,
                'text' => $slide['text'],
                'path' => $path,
                'url' => url($disk->url($path)),
                'source_url' => $imageSource,
            ];

            AgentAsset::create([
                'agent_conversation_id' => $conversation->id,
                'kind' => 'render',
                'url' => url($disk->url($path)),
                'path' => $path,
                'meta' => ['slide_index' => $index],
            ]);
        }

        $project = $conversation->contentProject;

        if ($project) {
            $project->update([
                'title' => $title,
                'status' => 'ready',
                'script_data' => [
                    'title' => $title,
                    'caption' => $caption,
                    'preset' => $preset->value,
                    'text_position' => $textPosition,
                    'slides' => $rendered,
                    'image_urls' => array_column($rendered, 'url'),
                    'agent_conversation_id' => $conversation->id,
                ],
            ]);
        } else {
            $project = ContentProject::create([
                'workspace_id' => $conversation->workspace_id,
                'title' => $title,
                'type' => 'slideshow',
                'status' => 'ready',
                'script_data' => [
                    'title' => $title,
                    'caption' => $caption,
                    'preset' => $preset->value,
                    'text_position' => $textPosition,
                    'slides' => $rendered,
                    'image_urls' => array_column($rendered, 'url'),
                    'agent_conversation_id' => $conversation->id,
                ],
            ]);
        }

        $conversation->update(['content_project_id' => $project->id]);

        $blocks = [['type' => 'text', 'text' => "Built slideshow content_project_id={$project->id}"]];

        foreach ($rendered as $slide) {
            $renderAsset = AgentAsset::where('agent_conversation_id', $conversation->id)
                ->where('kind', 'render')
                ->where('path', $slide['path'])
                ->latest('id')
                ->first();

            if ($renderAsset) {
                $blocks[] = $this->imageBlockFromAsset($renderAsset);
            }
        }

        return $blocks;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listSocialAccounts(AgentConversation $conversation): array
    {
        $accounts = SocialAccount::where('workspace_id', $conversation->workspace_id)
            ->get(['id', 'provider', 'handle'])
            ->map(fn (SocialAccount $account): array => [
                'id' => $account->id,
                'provider' => $account->provider,
                'name' => $account->handle ?? $account->provider,
            ])
            ->all();

        return [['type' => 'text', 'text' => json_encode($accounts)]];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    private function requestPublish(AgentConversation $conversation, array $input): array
    {
        $accountId = (int) ($input['social_account_id'] ?? 0);
        $publishAtText = trim((string) ($input['publish_at'] ?? ''));
        $caption = trim((string) ($input['caption'] ?? ''));

        if ($accountId <= 0) {
            throw new InvalidArgumentException('social_account_id is required.');
        }

        if ($publishAtText === '') {
            throw new InvalidArgumentException('publish_at is required.');
        }

        $account = SocialAccount::where('workspace_id', $conversation->workspace_id)
            ->where('id', $accountId)
            ->first();

        if (! $account) {
            throw new InvalidArgumentException('The social account does not belong to this workspace.');
        }

        $project = $conversation->contentProject;

        if (! $project) {
            throw new InvalidArgumentException('No slideshow has been built yet.');
        }

        $publishAt = Carbon::parse($publishAtText);

        if (! $publishAt->isFuture()) {
            throw new InvalidArgumentException('publish_at must be in the future.');
        }

        AgentPublishRequest::create([
            'agent_conversation_id' => $conversation->id,
            'content_project_id' => $project->id,
            'social_account_id' => $account->id,
            'publish_at' => $publishAt,
            'caption' => $caption,
            'status' => 'pending',
        ]);

        return [['type' => 'text', 'text' => 'Waiting for the user to press Confirm.']];
    }

    private function isTikTokUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && str_ends_with(strtolower($host), 'tiktok.com');
    }

    private function storeImage(AgentConversation $conversation, string $binary, string $filename): string
    {
        $path = sprintf('agent/%d/source/%s', $conversation->id, $filename);

        Storage::disk(config('filesystems.media_disk'))->put($path, $binary, 'public');

        return $path;
    }

    /**
     * @return list<string>
     */
    private function extractVideoFrames(string $videoPath, int $count): array
    {
        $ffmpeg = config('services.ffmpeg.binary');

        $duration = $this->videoDuration($videoPath, $ffmpeg);

        if ($duration === null || $duration <= 0) {
            $duration = 10;
        }

        $interval = $duration / ($count + 1);
        $dir = sys_get_temp_dir().'/slidezz-agent-frames-'.uniqid();
        mkdir($dir, 0777, true);

        $pattern = $dir.'/frame-%02d.jpg';
        $process = new Process([
            $ffmpeg,
            '-i', $videoPath,
            '-vf', 'fps=1/'.$interval,
            '-frames:v', (string) $count,
            '-q:v', '2',
            $pattern,
        ]);
        $process->setTimeout(120);
        $process->run();

        $frames = [];

        for ($i = 1; $i <= $count; $i++) {
            $file = sprintf($dir.'/frame-%02d.jpg', $i);

            if (is_file($file)) {
                $frames[] = file_get_contents($file);
                unlink($file);
            }
        }

        rmdir($dir);

        return $frames;
    }

    private function videoDuration(string $videoPath, string $ffmpeg): ?float
    {
        $process = new Process([$ffmpeg, '-i', $videoPath, '-f', 'null', '-']);
        $process->setTimeout(30);
        $process->run();

        $error = $process->getErrorOutput();

        if (preg_match('/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/', $error, $m)) {
            return ((int) $m[1]) * 3600 + ((int) $m[2]) * 60 + (float) $m[3];
        }

        return null;
    }

    private function imageBlockFromAsset(AgentAsset $asset): array
    {
        $binary = $this->assetBinary($asset);

        if ($binary === '' || $binary === '0') {
            throw new RuntimeException("Asset {$asset->id} could not be loaded.");
        }

        $data = $this->downscaleJpeg($binary);

        return [
            'type' => 'image',
            'source' => [
                'type' => 'base64',
                'media_type' => 'image/jpeg',
                'data' => $data,
            ],
        ];
    }

    private function assetBinary(AgentAsset $asset): string
    {
        if ($asset->path) {
            $disk = Storage::disk(config('filesystems.media_disk'));

            if ($disk->exists($asset->path)) {
                return (string) $disk->get($asset->path);
            }
        }

        $url = $asset->url;

        if (str_starts_with($url, 'data:')) {
            $comma = strpos($url, ',');

            if ($comma !== false) {
                return (string) base64_decode(substr($url, $comma + 1), true);
            }

            return '';
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return '';
        }

        return (string) Http::timeout(30)
            ->withHeaders(['User-Agent' => config('services.pinterest.user_agent')])
            ->get($url)
            ->body();
    }

    private function downscaleJpeg(string $binary): string
    {
        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            throw new RuntimeException('Image could not be decoded.');
        }

        $width = imagesx($image);
        $height = imagesy($image);

        if ($width > 768) {
            $newWidth = 768;
            $newHeight = (int) round($height * ($newWidth / $width));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        ob_start();
        imagejpeg($image, null, 80);
        $jpeg = (string) ob_get_clean();
        imagedestroy($image);

        return base64_encode($jpeg);
    }
}
