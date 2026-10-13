import '@/i18n';
import { createInertiaApp, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { syncStoredLanguage } from '@/i18n';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { trackPageView } from '@/lib/meta';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/**
 * Applies the stored language preference after hydration. Runs in an effect
 * (client-only, post-mount) so the initial render stays in sync with the SSR
 * HTML and no hydration mismatch is triggered.
 */
function LanguageSync() {
    useEffect(() => {
        syncStoredLanguage();
    }, []);

    return null;
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'Onboarding':
            case name === 'LandingEn':
            case name === 'SlideEditor':
            case name === 'VideoEditor':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <LanguageSync />
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Fire a Meta Pixel PageView on every Inertia (SPA) navigation. The initial
// page load is already tracked by the base code in app.blade.php.
router.on('navigate', () => trackPageView());

// This will set light / dark mode on load...
initializeTheme();

// The server reads the browser's timezone from this cookie to build the
// calendar days (ScheduleController::viewerTimezone).
try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
        document.cookie = `tz=${encodeURIComponent(timezone)};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    }
} catch {
    // Without the cookie the calendar falls back to the app timezone.
}
