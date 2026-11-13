<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProfileAnalysis extends Model
{
    protected $fillable = [
        'workspace_id',
        'user_id',
        'status',
        'language',
        'links',
        'posts',
        'report',
        'error',
        'completed_at',
    ];

    protected $casts = [
        'links' => 'array',
        'posts' => 'array',
        'report' => 'array',
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
