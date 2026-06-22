<?php

return [

    'starter' => [
        'name' => 'Starter',
        'description' => 'Para criadores individuais',
        'credits_per_cycle' => 10,
        'features' => [
            '10 carousels por mês',
            'Todos os templates',
            'Suporte por e-mail',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => '$36/mo', 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY')],
                'annual' => ['price_label' => '$29/mo', 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL')],
            ],
            'brl' => [
                // TODO: confirmar os valores reais em BRL criados no Stripe.
                'monthly' => ['price_label' => 'R$199/mês', 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY_BRL')],
                'annual' => ['price_label' => 'R$119/mês', 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL_BRL')],
            ],
        ],
    ],

    'pro' => [
        'name' => 'Pro',
        'description' => 'Para times e agências',
        'credits_per_cycle' => 30,
        'features' => [
            '30 carousels por mês',
            'Todos os templates',
            'Suporte prioritário',
            'Acesso antecipado',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => '$120/mo', 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY')],
                'annual' => ['price_label' => '$79/mo', 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL')],
            ],
            'brl' => [
                // TODO: confirmar os valores reais em BRL criados no Stripe.
                'monthly' => ['price_label' => 'R$649/mês', 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY_BRL')],
                'annual' => ['price_label' => 'R$389/mês', 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL_BRL')],
            ],
        ],
    ],

];
