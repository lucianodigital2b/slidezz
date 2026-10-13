<?php

namespace App\Models;

use App\Services\Media\MediaEmbeddings;
use App\Services\Media\MediaMatcher;
use Database\Factories\MediaLibraryItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * One saved photo in a workspace's media library.
 *
 * The workspace owns the file, not a link to someone else's server, and carries
 * the descriptive metadata {@see MediaMatcher} scores a hook against.
 */
class MediaLibraryItem extends Model
{
    /** @use HasFactory<MediaLibraryItemFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'disk',
        'path',
        'checksum',
        'mime',
        'bytes',
        'width',
        'height',
        'orientation',
        'source',
        'source_id',
        'source_url',
        'description',
        'keywords',
        'colors',
        'mood',
        'described_at',
        'embedding',
        'embedding_model',
        'used_count',
        'last_used_at',
    ];

    protected $casts = [
        'keywords' => 'array',
        'colors' => 'array',
        'described_at' => 'datetime',
        'last_used_at' => 'datetime',
        'bytes' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'used_count' => 'integer',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * @param  Builder<MediaLibraryItem>  $query
     * @return Builder<MediaLibraryItem>
     */
    public function scopeForWorkspace(Builder $query, int $workspaceId): Builder
    {
        return $query->where('workspace_id', $workspaceId);
    }

    public function publicUrl(): string
    {
        return url(Storage::disk($this->disk)->url($this->path));
    }

    /**
     * The stored bytes as a data URI, which is what {@see SlideshowRenderer} wants.
     * Reading the file beats making the app fetch its own public URL over HTTP.
     */
    public function dataUri(): string
    {
        $binary = Storage::disk($this->disk)->get($this->path);

        return 'data:'.($this->mime ?: 'image/jpeg').';base64,'.base64_encode((string) $binary);
    }

    /**
     * Everything the matcher reads, lowercased into one haystack.
     */
    public function searchableText(): string
    {
        return mb_strtolower(implode(' ', array_filter([
            $this->description,
            implode(' ', (array) $this->keywords),
            $this->mood,
        ])));
    }

    /**
     * The stored vector, or null while the describer has not caught up yet.
     *
     * @return list<float>|null
     */
    public function embeddingVector(): ?array
    {
        return MediaEmbeddings::unpack($this->embedding);
    }

    public function markUsed(): void
    {
        $this->forceFill([
            'used_count' => $this->used_count + 1,
            'last_used_at' => now(),
        ])->save();
    }
}
