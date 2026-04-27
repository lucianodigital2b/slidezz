<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentProject extends Model
{
    protected $fillable = [
        'workspace_id',
        'title',
        'type',
        'status',
        'script_data',
        'video_url',
    ];

    protected $casts = [
        'script_data' => 'array',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
