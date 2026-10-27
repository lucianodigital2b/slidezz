<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackedVideoSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'tracked_video_id',
        'views',
        'likes',
        'comments',
        'shares',
        'bookmarks',
        'captured_at',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'views' => 'integer',
        'likes' => 'integer',
        'comments' => 'integer',
        'shares' => 'integer',
        'bookmarks' => 'integer',
    ];

    public function video(): BelongsTo
    {
        return $this->belongsTo(TrackedVideo::class, 'tracked_video_id');
    }
}
