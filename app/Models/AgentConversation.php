<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgentConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workspace_id',
        'title',
        'status',
        'error',
        'content_project_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function contentProject(): BelongsTo
    {
        return $this->belongsTo(ContentProject::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AgentMessage::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(AgentAsset::class);
    }

    public function publishRequests(): HasMany
    {
        return $this->hasMany(AgentPublishRequest::class);
    }
}
