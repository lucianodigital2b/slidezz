<?php

namespace App\Models;

use Database\Factories\SocialAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SocialAccount extends Model
{
    /** @use HasFactory<SocialAccountFactory> */
    use HasFactory;

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

    /**
     * Resolve the connected account for an incoming platform event (webhook
     * routing), keyed by the provider's own account id. This is what maps an
     * event to the right workspace when many workspaces connect many different
     * accounts across providers.
     */
    public static function locate(string $provider, string $providerId): ?self
    {
        return static::query()
            ->where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
