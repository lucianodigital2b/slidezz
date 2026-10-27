<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UgcCreator extends Model
{
    protected $fillable = [
        'workspace_id',
        'name',
        'handle',
        'avatar',
        'platform',
        'contact',
        'notes',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function videos(): HasMany
    {
        return $this->hasMany(TrackedVideo::class);
    }
}
