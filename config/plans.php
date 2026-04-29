<?php

return [

    'pro' => [
        'name' => 'Pro',
        'description' => 'Para criadores individuais',
        'price_label' => 'R$ 49/mês',
        'price_id' => env('STRIPE_PRICE_PRO'),
        'features' => [
            '5 contas TikTok',
            '100 agendamentos por mês',
            'Analytics básico',
            'Suporte por e-mail',
        ],
    ],

    'business' => [
        'name' => 'Business',
        'description' => 'Para agências e equipes',
        'price_label' => 'R$ 149/mês',
        'price_id' => env('STRIPE_PRICE_BUSINESS'),
        'features' => [
            '20 contas TikTok',
            'Agendamentos ilimitados',
            'Analytics avançado',
            'Suporte prioritário',
            'Acesso antecipado a novidades',
        ],
    ],

];
