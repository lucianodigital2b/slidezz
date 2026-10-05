<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SlideProject extends Model
{
    protected $fillable = [
        'workspace_id',
        'title',
        'caption',
        'format',
        'slides',
        'localizations',
        'prompt',
        'template',
    ];

    protected $casts = [
        'slides' => 'array',
        'localizations' => 'array',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
