import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import pt from '@/locales/pt.json';

export const SUPPORTED_LANGUAGES = ['pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'slidezz:lang';

function getInitialLanguage(): SupportedLanguage {
    if (typeof window === 'undefined') {
        return 'pt';
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    return SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)
        ? (stored as SupportedLanguage)
        : 'pt';
}

i18n.use(initReactI18next).init({
    lng: getInitialLanguage(),
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
