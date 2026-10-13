<?php

namespace App\Models;

use Database\Factories\VideoProjectFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * A short-form video assembled from a timeline of image and video clips plus an
 * optional music track, previewed in the browser and rendered to MP4 by Remotion.
 *
 * The timeline shape is defined in resources/js/remotion/timeline.ts.
 */
class VideoProject extends Model
{
    /** @use HasFactory<VideoProjectFactory> */
    use HasFactory;

    public const FORMATS = ['stories', 'post'];

    public const TRANSITIONS = ['none', 'fade', 'slide', 'wipe'];

    public const TEXT_POSITIONS = ['top', 'center', 'bottom'];

    protected $fillable = [
        'workspace_id',
        'slide_project_id',
        'title',
        'format',
        'timeline',
        'status',
        'render_progress',
        'video_path',
        'render_error',
        'rendered_at',
    ];

    protected $attributes = [
        'timeline' => '{"clips":[],"audio":null}',
    ];

    protected $casts = [
        'timeline' => 'array',
        'render_progress' => 'integer',
        'rendered_at' => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function slideProject()
    {
        return $this->belongsTo(SlideProject::class);
    }

    public function isRendering(): bool
    {
        return $this->status === 'rendering';
    }

    public function videoUrl(): ?string
    {
        return $this->video_path
            ? url(Storage::disk(config('filesystems.media_disk'))->url($this->video_path))
            : null;
    }

    /**
     * Where this project's uploads and renders live on the media disk.
     */
    public function storageDirectory(): string
    {
        return "videos/{$this->workspace_id}/{$this->id}";
    }
}
