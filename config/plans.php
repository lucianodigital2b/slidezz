<?php

return [

    'starter' => [
        'name' => 'Starter',
        'description' => 'Para criadores individuais',
        'credits_per_cycle' => 10,
        'monthly' => [
            'price_label' => '$36/mo',
            'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY'),
        ],
        'annual' => [
            'price_label' => '$21.60/mo',
            'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL'),
        ],
        'features' => [
            '10 carousels por mês',
            'Todos os templates',
            'Suporte por e-mail',
        ],
    ],

    'pro' => [
        'name' => 'Pro',
        'description' => 'Para times e agências',
        'credits_per_cycle' => 30,
        'monthly' => [
            'price_label' => '$120/mo',
            'price_id' => env('STRIPE_PRICE_PRO_MONTHLY'),
        ],
        'annual' => [
            'price_label' => '$72/mo',
            'price_id' => env('STRIPE_PRICE_PRO_ANNUAL'),
        ],
        'features' => [
            '30 carousels por mês',
            'Todos os templates',
            'Suporte prioritário',
            'Acesso antecipado',
        ],
    ],

];
