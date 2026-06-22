<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SlideTemplate extends Model
{
    protected $fillable = [
        'workspace_id',
        'title',
        'format',
        'slides',
        'thumbnail',
    ];

    protected $casts = [
        'slides' => 'array',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
