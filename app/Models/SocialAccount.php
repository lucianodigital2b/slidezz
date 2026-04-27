<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialAccount extends Model
{
    protected $fillable = [
        'workspace_id',
        'provider',
        'provider_id',
        'handle',
        'avatar',
        'access_token',
        'refresh_token',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
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
