import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import pt from '@/locales/pt.json';

export const SUPPORTED_LANGUAGES = ['pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'slidezz:lang';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'pt';

/**
 * Read the user's stored language preference and apply it after hydration.
 *
 * i18n is intentionally initialized with {@link DEFAULT_LANGUAGE} so the first
 * client render matches the server-rendered (SSR) HTML. Reading localStorage at
 * init time would make the client start in a different language than the server,
 * causing a hydration mismatch that breaks the Inertia router. Call this once
 * from a post-mount effect instead.
 */
export function syncStoredLanguage(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (
        SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage) &&
        stored !== i18n.language
    ) {
        void i18n.changeLanguage(stored as SupportedLanguage);
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
