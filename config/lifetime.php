<?php

/*
 * Launch offer: one-time payment that unlocks the AI generator forever.
 * Stripe Prices must be one-time (mode: payment), not recurring.
 */

return [

    'prices' => [
        'usd' => [
            'price_label' => env('STRIPE_PRICE_LIFETIME_LABEL', '$149'),
            'price_id' => env('STRIPE_PRICE_LIFETIME'),
        ],
        'brl' => [
            'price_label' => env('STRIPE_PRICE_LIFETIME_BRL_LABEL', 'R$149'),
            'price_id' => env('STRIPE_PRICE_LIFETIME_BRL'),
        ],
    ],

];
