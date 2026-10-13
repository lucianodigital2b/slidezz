<?php

return [

    'packs' => [
        [
            'key' => 'pack_10',
            'credits' => 10,
            'label' => 'Starter Pack',
            'price' => ['usd' => '$15', 'brl' => 'R$79'],
            'price_id' => [
                'usd' => env('STRIPE_PRICE_CREDITS_10_USD'),
                'brl' => env('STRIPE_PRICE_CREDITS_10_BRL'),
            ],
        ],
        [
            'key' => 'pack_30',
            'credits' => 30,
            'label' => 'Basic Pack',
            'price' => ['usd' => '$39', 'brl' => 'R$199'],
            'price_id' => [
                'usd' => env('STRIPE_PRICE_CREDITS_30_USD'),
                'brl' => env('STRIPE_PRICE_CREDITS_30_BRL'),
            ],
            'badge' => 'MAIS POPULAR',
        ],
        [
            'key' => 'pack_70',
            'credits' => 70,
            'label' => 'Plus Pack',
            'price' => ['usd' => '$79', 'brl' => 'R$399'],
            'price_id' => [
                'usd' => env('STRIPE_PRICE_CREDITS_70_USD'),
                'brl' => env('STRIPE_PRICE_CREDITS_70_BRL'),
            ],
            'badge' => 'MELHOR VALOR',
        ],
        [
            'key' => 'pack_150',
            'credits' => 150,
            'label' => 'Pro Pack',
            'price' => ['usd' => '$149', 'brl' => 'R$749'],
            'price_id' => [
                'usd' => env('STRIPE_PRICE_CREDITS_150_USD'),
                'brl' => env('STRIPE_PRICE_CREDITS_150_BRL'),
            ],
        ],
    ],

];
