<?php

/*
 * The 3 cycle plans (structure copied from MyPostFlow):
 *   - weekly:  one-time payment (Checkout mode=payment) → 7 days of access + 20 AI images.
 *   - monthly: recurring monthly subscription → 50 AI images per month.
 *   - annual:  recurring yearly subscription → 150 AI images per month
 *              (topped up monthly by `credits:refresh-annual`).
 *
 * Every price value is env-overridable (see .env.example):
 *   - PLAN_*_CREDITS         → managed AI-image allowance per cycle (1 credit = 1 image).
 *   - STRIPE_PRICE_*_LABEL   → the price shown on the pricing UI (display only).
 *   - STRIPE_PRICE_*         → the real Stripe Price id that is actually charged.
 *
 * Display text is keyed by locale (pt/en) and per_day by currency (brl/usd);
 * BillingCatalog picks the strings from the customer's currency (brl → pt).
 * Connecting a BYOK Gemini key stays optional and gives unlimited images.
 */

$features = [
    'pt' => [
        'Carrosséis ilimitados',
        'Imagens com IA no seu estilo',
        'IA pra textos e legendas',
        'Editor slide a slide',
        'PNG, PDF pro LinkedIn e vídeo MP4',
        'Imagens ilimitadas com sua chave Gemini (opcional)',
    ],
    'en' => [
        'Unlimited carousels',
        'AI images in your style',
        'AI for copy and captions',
        'Slide-by-slide editor',
        'PNG, LinkedIn PDF and MP4 video',
        'Unlimited images with your own Gemini key (optional)',
    ],
];

return [

    'weekly' => [
        'mode' => 'pass',
        'pass_days' => 7,
        'credits_per_cycle' => (int) env('PLAN_WEEKLY_CREDITS', 20),
        'highlighted' => false,
        'name' => ['pt' => 'Semanal', 'en' => 'Weekly'],
        'billing_note' => ['pt' => 'Pagamento único · Acesso por 7 dias', 'en' => 'One-time payment · 7 days of access'],
        'per_day' => ['brl' => '~R$6,84/dia', 'usd' => '~$1.41/day'],
        'credits_note' => ['pt' => '20 imagens com IA nos 7 dias', 'en' => '20 AI images for 7 days'],
        'features' => $features,
        'prices' => [
            'brl' => ['price_label' => env('STRIPE_PRICE_WEEKLY_BRL_LABEL', 'R$47,90'), 'price_id' => env('STRIPE_PRICE_WEEKLY_BRL')],
            'usd' => ['price_label' => env('STRIPE_PRICE_WEEKLY_LABEL', '$9.90'), 'price_id' => env('STRIPE_PRICE_WEEKLY')],
        ],
    ],

    'monthly' => [
        'mode' => 'subscription',
        'credits_per_cycle' => (int) env('PLAN_MONTHLY_CREDITS', 50),
        'highlighted' => false,
        'name' => ['pt' => 'Mensal', 'en' => 'Monthly'],
        'billing_note' => ['pt' => 'Cobrado mensalmente · Sem fidelidade', 'en' => 'Billed monthly · Cancel anytime'],
        'per_day' => ['brl' => '~R$3,26/dia', 'usd' => '~$0.66/day'],
        'credits_note' => ['pt' => '50 imagens com IA por mês', 'en' => '50 AI images per month'],
        'features' => $features,
        'prices' => [
            'brl' => ['price_label' => env('STRIPE_PRICE_MONTHLY_BRL_LABEL', 'R$97,90'), 'price_id' => env('STRIPE_PRICE_MONTHLY_BRL')],
            'usd' => ['price_label' => env('STRIPE_PRICE_MONTHLY_LABEL', '$19.90'), 'price_id' => env('STRIPE_PRICE_MONTHLY')],
        ],
    ],

    'annual' => [
        'mode' => 'subscription',
        'credits_per_cycle' => (int) env('PLAN_ANNUAL_CREDITS', 150),
        'highlighted' => true,
        'name' => ['pt' => 'Anual', 'en' => 'Annual'],
        'billing_note' => ['pt' => 'Cobrado anualmente · Sem fidelidade', 'en' => 'Billed yearly · Cancel anytime'],
        'per_day' => ['brl' => '~R$0,82/dia', 'usd' => '~$0.16/day'],
        'credits_note' => ['pt' => '150 imagens com IA por mês', 'en' => '150 AI images per month'],
        'features' => $features,
        'prices' => [
            'brl' => ['price_label' => env('STRIPE_PRICE_ANNUAL_BRL_LABEL', 'R$297,90'), 'price_id' => env('STRIPE_PRICE_ANNUAL_BRL'), 'compare_at' => 'R$1.174,80', 'save' => '75%'],
            'usd' => ['price_label' => env('STRIPE_PRICE_ANNUAL_LABEL', '$59.90'), 'price_id' => env('STRIPE_PRICE_ANNUAL'), 'compare_at' => '$238.80', 'save' => '75%'],
        ],
    ],

];
