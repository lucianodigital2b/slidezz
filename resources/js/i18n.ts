import type { Page } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import pt from '@/locales/pt.json';

export const SUPPORTED_LANGUAGES = ['pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'slidezz:lang';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'pt';

/**
 * Detect a supported language from the browser's preferred languages. Returns the
 * first match; anything Portuguese maps to 'pt', everything else falls back to 'en'
 * (English) so international visitors don't get a Portuguese UI by default.
 */
function detectBrowserLanguage(): SupportedLanguage {
    const candidates = navigator.languages?.length
        ? navigator.languages
        : [navigator.language];

    for (const lang of candidates) {
        const base = lang?.toLowerCase().split('-')[0];

        if (base === 'pt') {
            return 'pt';
        }

        if (base === 'en') {
            return 'en';
        }
    }

    // No pt/en preference expressed → assume an international visitor wants English.
    return 'en';
}

function isSupported(lang: unknown): lang is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/** The language saved on the logged-in account (settings), if any. */
function accountLanguageOf(
    page: Page | null | undefined,
): SupportedLanguage | null {
    const locale = (
        page?.props as
            | { auth?: { user?: { locale?: unknown } | null } }
            | undefined
    )?.auth?.user?.locale;

    return isSupported(locale) ? locale : null;
}

/** The first page Laravel embedded in the HTML (same JSON Inertia boots from). */
function initialPage(): Page | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const json = document.querySelector(
            'script[data-page="app"][type="application/json"]',
        )?.textContent;

        return json ? (JSON.parse(json) as Page) : null;
    } catch {
        return null;
    }
}

let accountLanguage = accountLanguageOf(initialPage());

function rememberLanguage(lang: SupportedLanguage): void {
    try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
        // Storage blocked: the account (or the browser language) still decides.
    }
}

/**
 * Apply the effective language after mount: the language saved on the account
 * wins, then the explicit choice stored in this browser, then the browser language.
 *
 * The account language is known to the server, so i18n starts in it right away
 * (no flash, and an SSR render would match). Without one, i18n starts in
 * {@link DEFAULT_LANGUAGE} and only switches here, post-mount: reading localStorage
 * or the browser language at init time would make the client start in a different
 * language than a server render, causing a hydration mismatch that breaks the
 * Inertia router. Call this once from a post-mount effect.
 */
export function syncStoredLanguage(): void {
    if (typeof window === 'undefined') {
        return;
    }

    let stored: string | null = null;

    try {
        stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
        // Storage blocked: fall through to the browser language.
    }

    const target =
        accountLanguage ??
        (isSupported(stored) ? stored : detectBrowserLanguage());

    if (accountLanguage) {
        // Keeps the login/register pages in the account language after logout.
        rememberLanguage(accountLanguage);
    }

    if (target !== i18n.language) {
        void i18n.changeLanguage(target);
    }
}

/** Switch the UI now and remember the choice in this browser (the caller saves it on the account). */
export function setLanguage(lang: SupportedLanguage): void {
    rememberLanguage(lang);

    if (lang !== i18n.language) {
        void i18n.changeLanguage(lang);
    }
}

// Logging in (or saving the setting) brings a new account language without a full reload.
if (typeof window !== 'undefined') {
    router.on('navigate', (event) => {
        const lang = accountLanguageOf(event.detail.page);
        accountLanguage = lang;

        if (lang) {
            rememberLanguage(lang);

            if (lang !== i18n.language) {
                void i18n.changeLanguage(lang);
            }
        }
    });
}

i18n.use(initReactI18next).init({
    lng: accountLanguage ?? DEFAULT_LANGUAGE,
    fallbackLng: 'pt',
    defaultNS: 'translation',
    resources: {
        en: { translation: en },
        pt: { translation: pt },
    },
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
