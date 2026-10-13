<?php

/*
 * Pricing lever — every pricing value here is env-overridable (see .env.example),
 * with the current published prices as defaults:
 *   - PLAN_*_CREDITS         → managed AI-image allowance per billing cycle.
 *   - STRIPE_PRICE_*_LABEL   → the price shown on the pricing UI (display only).
 *   - STRIPE_PRICE_*         → the real Stripe Price id that is actually charged.
 *
 * LAUNCH OFFER: images are BYOK on every plan (each user connects their own
 * Gemini key), so image generation carries no platform COGS right now. The
 * credit structure below stays fully wired — balances keep accruing silently —
 * so managed images can be re-enabled later by flipping `byok_enabled` back to
 * false on the lower tiers and unhiding the credits UI.
 */

$starterCredits = (int) env('PLAN_STARTER_CREDITS', 60);
$proCredits = (int) env('PLAN_PRO_CREDITS', 150);
$agencyCredits = (int) env('PLAN_AGENCY_CREDITS', 400);

return [

    'starter' => [
        'name' => 'Starter',
        'description' => 'Para criadores individuais',
        'credits_per_cycle' => $starterCredits,
        'byok_enabled' => true,
        'features' => [
            'Carrosséis ilimitados',
            'Imagens ilimitadas com sua chave Gemini',
            'Todos os templates',
            'Suporte por e-mail',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_STARTER_MONTHLY_LABEL', '$29/mo'), 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY')],
                'annual' => ['price_label' => env('STRIPE_PRICE_STARTER_ANNUAL_LABEL', '$19/mo'), 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_STARTER_MONTHLY_BRL_LABEL', 'R$67/mês'), 'price_id' => env('STRIPE_PRICE_STARTER_MONTHLY_BRL')],
                'annual' => ['price_label' => env('STRIPE_PRICE_STARTER_ANNUAL_BRL_LABEL', 'R$47/mês'), 'price_id' => env('STRIPE_PRICE_STARTER_ANNUAL_BRL')],
            ],
        ],
    ],

    'pro' => [
        'name' => 'Pro',
        'description' => 'Para criadores em volume',
        'credits_per_cycle' => $proCredits,
        'byok_enabled' => true,
        'features' => [
            'Carrosséis ilimitados',
            'Imagens ilimitadas com sua chave Gemini',
            'Todos os templates',
            'Suporte prioritário',
            'Acesso antecipado',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_PRO_MONTHLY_LABEL', '$59/mo'), 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY')],
                'annual' => ['price_label' => env('STRIPE_PRICE_PRO_ANNUAL_LABEL', '$39/mo'), 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_PRO_MONTHLY_BRL_LABEL', 'R$127/mês'), 'price_id' => env('STRIPE_PRICE_PRO_MONTHLY_BRL')],
                'annual' => ['price_label' => env('STRIPE_PRICE_PRO_ANNUAL_BRL_LABEL', 'R$87/mês'), 'price_id' => env('STRIPE_PRICE_PRO_ANNUAL_BRL')],
            ],
        ],
    ],

    'agency' => [
        'name' => 'Agency',
        'description' => 'Para times e agências',
        'credits_per_cycle' => $agencyCredits,
        'byok_enabled' => true,
        'features' => [
            'Carrosséis ilimitados',
            'Imagens ilimitadas com sua chave Gemini',
            'Todos os templates',
            'Múltiplos projetos',
            'Suporte prioritário',
        ],
        'prices' => [
            'usd' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_AGENCY_MONTHLY_LABEL', '$129/mo'), 'price_id' => env('STRIPE_PRICE_AGENCY_MONTHLY')],
                'annual' => ['price_label' => env('STRIPE_PRICE_AGENCY_ANNUAL_LABEL', '$99/mo'), 'price_id' => env('STRIPE_PRICE_AGENCY_ANNUAL')],
            ],
            'brl' => [
                'monthly' => ['price_label' => env('STRIPE_PRICE_AGENCY_MONTHLY_BRL_LABEL', 'R$247/mês'), 'price_id' => env('STRIPE_PRICE_AGENCY_MONTHLY_BRL')],
                'annual' => ['price_label' => env('STRIPE_PRICE_AGENCY_ANNUAL_BRL_LABEL', 'R$177/mês'), 'price_id' => env('STRIPE_PRICE_AGENCY_ANNUAL_BRL')],
            ],
        ],
    ],

];
