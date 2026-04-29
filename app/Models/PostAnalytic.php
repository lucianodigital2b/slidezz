<?php

namespace App\Models;

use Database\Factories\PostAnalyticFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostAnalytic extends Model
{
    /** @use HasFactory<PostAnalyticFactory> */
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'views',
        'likes',
        'comments',
        'shares',
        'bookmarks',
        'last_synced_at',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }
}
