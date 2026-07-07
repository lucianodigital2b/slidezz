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
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];

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

/**
 * Apply the effective language after hydration: the user's explicit stored choice
 * wins; otherwise auto-detect from the browser (pt-br stays the fallback).
 *
 * i18n is intentionally initialized with {@link DEFAULT_LANGUAGE} so the first
 * client render matches the server-rendered (SSR) HTML. Reading localStorage or the
 * browser language at init time would make the client start in a different language
 * than the server, causing a hydration mismatch that breaks the Inertia router. Call
 * this once from a post-mount effect instead.
 */
export function syncStoredLanguage(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const target = SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)
        ? (stored as SupportedLanguage)
        : detectBrowserLanguage();

    if (target !== i18n.language) {
        void i18n.changeLanguage(target);
    }
}

i18n.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
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
