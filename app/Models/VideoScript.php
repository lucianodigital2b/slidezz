<?php

namespace App\Models;

use Database\Factories\VideoScriptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VideoScript extends Model
{
    /** @use HasFactory<VideoScriptFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'user_id',
        'status',
        'topic',
        'reference_url',
        'source_url',
        'language',
        'target_seconds',
        'reference',
        'result',
        'error',
        'completed_at',
    ];

    protected $casts = [
        'reference' => 'array',
        'result' => 'array',
        'target_seconds' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
