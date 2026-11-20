<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViralBreakdown extends Model
{
    protected $fillable = [
        'workspace_id',
        'user_id',
        'status',
        'progress',
        'source_url',
        'language',
        'source',
        'transcript',
        'result',
        'slides',
        'caption',
        'error',
        'completed_at',
    ];

    protected $casts = [
        'source' => 'array',
        'transcript' => 'array',
        'result' => 'array',
        'slides' => 'array',
        'progress' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function storageDirectory(): string
    {
        return "breakdowns/{$this->workspace_id}/{$this->id}";
    }

    public function isFinished(): bool
    {
        return in_array($this->status, ['done', 'failed'], true);
    }
}
