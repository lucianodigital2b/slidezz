<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'stripe_product_id',
        'price_monthly',
        'price_yearly',
        'discount_badge',
        'is_popular',
        'features',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'price_yearly' => 'decimal:2',
        'is_popular' => 'boolean',
        'features' => 'array',
    ];
}
