<?php

namespace App\Services\Media;

use App\Exceptions\MediaLibraryException;
use App\Jobs\DescribeMediaItem;
use App\Models\MediaLibraryItem;
use App\Models\Workspace;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Takes photos into a workspace's media library.
 *
 * Everything that lands here is copied onto the media disk first: a Pinterest URL
 * is somebody else's server and will eventually 404, and TikTok needs a stable
 * public file at publish time. Storing by checksum makes re-importing the same
 * photo a no-op instead of a duplicate.
 */
class MediaLibrary
{
    /**
     * @param  array{source?: string, source_id?: ?string, source_url?: ?string, query?: ?string}  $context
     */
    public function storeFromUrl(Workspace $workspace, string $url, array $context = []): MediaLibraryItem
    {
        $response = Http::timeout(30)
            ->withHeaders(['User-Agent' => config('services.pinterest.user_agent')])
            ->get($url);

        if ($response->failed()) {
            throw new MediaLibraryException("Could not download {$url} (HTTP {$response->status()}).");
        }

        return $this->store($workspace, $response->body(), [
            'source' => 'pinterest',
            'source_url' => $url,
            ...$context,
        ]);
    }

    /**
     * @param  array{source?: string, source_id?: ?string, source_url?: ?string, query?: ?string}  $context
     */
    public function storeFromUpload(Workspace $workspace, UploadedFile $file, array $context = []): MediaLibraryItem
    {
        $binary = file_get_contents($file->getRealPath());

        if ($binary === false) {
            throw new MediaLibraryException('The uploaded file could not be read.');
        }

        return $this->store($workspace, $binary, [
            'source' => 'upload',
            'query' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            ...$context,
        ]);
    }

    /**
     * @param  array{source?: string, source_id?: ?string, source_url?: ?string, query?: ?string}  $context
     */
    public function store(Workspace $workspace, string $binary, array $context = []): MediaLibraryItem
    {
        $dimensions = $this->dimensions($binary);
        $checksum = hash('sha256', $binary);

        $existing = MediaLibraryItem::forWorkspace($workspace->id)->where('checksum', $checksum)->first();

        if ($existing !== null) {
            return $existing;
        }

        $disk = config('filesystems.media_disk');
        $extension = $this->extensionFor($dimensions['mime']);
        $path = "library/{$workspace->id}/{$checksum}.{$extension}";

        // TikTok and Instagram fetch the rendered slides by URL, so the source
        // photos live on the same world-readable disk as everything else.
        Storage::disk($disk)->put($path, $binary, 'public');

        try {
            $item = MediaLibraryItem::create([
                'workspace_id' => $workspace->id,
                'disk' => $disk,
                'path' => $path,
                'checksum' => $checksum,
                'mime' => $dimensions['mime'],
                'bytes' => strlen($binary),
                'width' => $dimensions['width'],
                'height' => $dimensions['height'],
                'orientation' => $this->orientation($dimensions['width'], $dimensions['height']),
                'source' => $context['source'] ?? 'upload',
                'source_id' => $context['source_id'] ?? null,
                'source_url' => $context['source_url'] ?? null,
                // A seed so the item is matchable before the describer has run.
                'keywords' => MediaDescriber::keywordsFromText((string) ($context['query'] ?? '')),
            ]);
        } catch (UniqueConstraintViolationException) {
            // Two automations can source the same pin at the same moment; the
            // unique index settles it and the loser just uses the winner's row.
            return MediaLibraryItem::forWorkspace($workspace->id)->where('checksum', $checksum)->firstOrFail();
        }

        DescribeMediaItem::dispatch($item);

        return $item;
    }

    public function delete(MediaLibraryItem $item): void
    {
        Storage::disk($item->disk)->delete($item->path);
        $item->delete();
    }

    /**
     * @return array{width: int, height: int, mime: string}
     */
    private function dimensions(string $binary): array
    {
        $info = @getimagesizefromstring($binary);

        if ($info === false) {
            throw new MediaLibraryException('The file is not a decodable image.');
        }

        return [
            'width' => (int) $info[0],
            'height' => (int) $info[1],
            'mime' => (string) ($info['mime'] ?? 'image/jpeg'),
        ];
    }

    private function orientation(int $width, int $height): string
    {
        if ($width === 0 || $height === 0) {
            return 'portrait';
        }

        $ratio = $height / $width;

        return match (true) {
            $ratio >= 1.15 => 'portrait',
            $ratio <= 0.87 => 'landscape',
            default => 'square',
        };
    }

    private function extensionFor(string $mime): string
    {
        return match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg',
        };
    }
}
