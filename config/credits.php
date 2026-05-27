<?php

return [

    'packs' => [
        [
            'key' => 'pack_10',
            'credits' => 10,
            'label' => 'Starter Pack',
            'price' => '$4.99',
            'price_id' => env('STRIPE_PRICE_CREDITS_10'),
        ],
        [
            'key' => 'pack_30',
            'credits' => 30,
            'label' => 'Basic Pack',
            'price' => '$13.99',
            'price_id' => env('STRIPE_PRICE_CREDITS_30'),
            'badge' => 'MAIS POPULAR',
        ],
        [
            'key' => 'pack_70',
            'credits' => 70,
            'label' => 'Plus Pack',
            'price' => '$29.99',
            'price_id' => env('STRIPE_PRICE_CREDITS_70'),
            'badge' => 'MELHOR VALOR',
        ],
        [
            'key' => 'pack_150',
            'credits' => 150,
            'label' => 'Pro Pack',
            'price' => '$59.99',
            'price_id' => env('STRIPE_PRICE_CREDITS_150'),
        ],
    ],

];
