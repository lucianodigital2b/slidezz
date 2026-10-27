<?php

namespace App\Enums;

enum CampaignStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Ended = 'ended';
}
