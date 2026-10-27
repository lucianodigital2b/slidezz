<?php

namespace App\Enums;

enum PayoutModel: string
{
    case Cpm = 'cpm';                 // pay per 1000 views
    case Flat = 'flat';               // fixed fee per video
    case CpmPlusFlat = 'cpm_plus_flat'; // base fee + per-1000-views bonus
}
