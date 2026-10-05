<?php

namespace App\Models;

use Database\Factories\AutomationRunFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One execution of an {@see Automation}. Kept as history so a failing cron is
 * debuggable and the UI can show what an automation actually produced.
 */
class AutomationRun extends Model
{
    /** @use HasFactory<AutomationRunFactory> */
    use HasFactory;

    protected $fillable = [
        'automation_id',
        'content_project_id',
        'status',
        'error',
        'ran_at',
    ];

    protected $casts = [
        'ran_at' => 'datetime',
    ];

    public function automation()
    {
        return $this->belongsTo(Automation::class);
    }

    public function contentProject()
    {
        return $this->belongsTo(ContentProject::class);
    }
}
