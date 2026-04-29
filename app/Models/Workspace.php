<?php

namespace App\Models;

use Database\Factories\WorkspaceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Workspace extends Model
{
    /** @use HasFactory<WorkspaceFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'owner_id',
        'industry',
        'vibe',
        'brand_color',
        'logo_path',
        'goal',
        'target_audience',
        'tone_of_voice',
        'profile',
    ];

    protected $casts = [
        'profile' => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function socialAccounts()
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function contentProjects()
    {
        return $this->hasMany(ContentProject::class);
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }
}
