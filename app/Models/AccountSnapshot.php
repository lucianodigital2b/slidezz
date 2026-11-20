<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'social_account_id',
        'snapshot_date',
        'followers',
        'following',
        'posts_count',
        'total_likes',
    ];

    protected $casts = [
        'snapshot_date' => 'date',
    ];

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }
}
