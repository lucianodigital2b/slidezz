<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_conversation_id',
        'role',
        'content',
        'usage',
    ];

    protected $casts = [
        'content' => 'array',
        'usage' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AgentConversation::class, 'agent_conversation_id');
    }
}
