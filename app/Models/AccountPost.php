<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'social_account_id',
        'platform_post_id',
        'media_type',
        'caption',
        'permalink',
        'thumbnail_url',
        'posted_at',
        'views',
        'likes',
        'comments',
        'shares',
        'saves',
        'last_synced_at',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }
}
