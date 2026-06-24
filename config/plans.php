<?php

return [

    'starter' => [
        'name' => 'Starter',
        'description' => 'Para criadores individuais',
        'credits_per_cycle' => 30,
        // BYOK (bring-your-own Gemini key) is reserved for paid mid/top tiers so
        // the entry plan can't be used as an "unlimited images" backdoor.
        'byok_enabled' => false,
        'features' => [
            '30 carrosséis por mês',
            'Todos os templates',
            'Imagens IA incluídas',
            'Suporte por e-mail',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => '$29/mo', 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY')],
                'annual' => ['price_label' => '$19/mo', 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => 'R$67/mês', 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY_BRL')],
                'annual' => ['price_label' => 'R$47/mês', 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL_BRL')],
            ],
        ],
    ],

    'pro' => [
        'name' => 'Pro',
        'description' => 'Para criadores em volume',
        'credits_per_cycle' => 100,
        'byok_enabled' => true,
        'features' => [
            '100 carrosséis por mês',
            'Todos os templates',
            'Imagens IA ilimitadas com sua chave Gemini (BYOK)',
            'Suporte prioritário',
            'Acesso antecipado',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => '$59/mo', 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY')],
                'annual' => ['price_label' => '$39/mo', 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => 'R$127/mês', 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY_BRL')],
                'annual' => ['price_label' => 'R$87/mês', 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL_BRL')],
            ],
        ],
    ],

    'agency' => [
        'name' => 'Agency',
        'description' => 'Para times e agências',
        'credits_per_cycle' => 300,
        'byok_enabled' => true,
        'features' => [
            '300 carrosséis por mês',
            'Todos os templates',
            'Imagens IA ilimitadas com sua chave Gemini (BYOK)',
            'Múltiplos projetos',
            'Suporte prioritário',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => '$129/mo', 'price_id' => env('STRIPE_PRICE_AGENCY_MONTHLY')],
                'annual' => ['price_label' => '$99/mo', 'price_id' => env('STRIPE_PRICE_AGENCY_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => 'R$247/mês', 'price_id' => env('STRIPE_PRICE_AGENCY_MONTHLY_BRL')],
                'annual' => ['price_label' => 'R$177/mês', 'price_id' => env('STRIPE_PRICE_AGENCY_ANNUAL_BRL')],
            ],
        ],
    ],

];
