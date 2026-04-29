<?php

namespace App\Models;

use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'type',
        'url',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
