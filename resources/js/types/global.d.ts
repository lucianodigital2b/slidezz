import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth & { credits: number; on_trial: boolean; trial_ends_at: string | null; onboarding_complete: boolean };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
