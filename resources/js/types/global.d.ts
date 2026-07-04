import type { Auth } from '@/types/auth';

export interface PricingPlan {
    name: string;
    description: string;
    credits_per_cycle: number;
    features: string[];
    currency: string;
    price_label: string | null;
    price_id: string | null;
    monthly: { price_label: string | null; price_id: string | null } | null;
    annual: { price_label: string | null; price_id: string | null } | null;
}

export interface PricingPack {
    key: string;
    credits: number;
    label: string;
    price: string | null;
    badge: string | null;
}

export interface PricingLifetime {
    price_label: string | null;
    price_id: string | null;
}

export interface Pricing {
    currency: string;
    plans: Record<string, PricingPlan>;
    packs: PricingPack[];
    lifetime: PricingLifetime | null;
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth & { credits: number; on_trial: boolean; trial_ends_at: string | null; onboarding_complete: boolean; premium_access: boolean; lifetime_access: boolean };
            pricing: Pricing | null;
            igEnabled: boolean;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
