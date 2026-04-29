<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SlideProject extends Model
{
    protected $fillable = [
        'workspace_id',
        'title',
        'format',
        'slides',
        'prompt',
        'template',
    ];

    protected $casts = [
        'slides' => 'array',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
