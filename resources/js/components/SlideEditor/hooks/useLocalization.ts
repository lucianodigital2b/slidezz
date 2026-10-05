import { useCallback, useState } from 'react';
import AppScreenshotController from '@/actions/App/Http/Controllers/AppScreenshotController';
import { loadGoogleFont } from '@/utils/google-fonts';
import type {
    Localizations } from '../appStore';
import {
    buildRichText,
    collectTranslatableText,
    findLocale,
} from '../appStore';
import type { Slide } from '../types';

interface TranslateResponse {
    translations?: { id: string; text: string; highlight?: string }[];
}

/**
 * Per-locale copy for a store screenshot project: which locales the listing
 * ships in, their translated captions, and the AI translation runs that fill
 * them. The source slides are never mutated — a locale is an overlay applied at
 * render time (see applyLocale in ../appStore).
 */
export function useLocalization(initial: Localizations, appName: string, accentColor: string) {
    const [localizations, setLocalizations] = useState<Localizations>(initial);
    const [activeLocale, setActiveLocaleState] = useState<string | null>(null);
    /** Locale currently being translated, for the panel's progress state. */
    const [translating, setTranslating] = useState<string | null>(null);
    const [error, setError] = useState('');

    /** Locales the project ships in — a locale exists as soon as it is added. */
    const locales = Object.keys(localizations);

    const setActiveLocale = useCallback(async (code: string | null) => {
        if (code) {
            const font = findLocale(code)?.font;

            if (font) {
                await loadGoogleFont(font);
            }
        }

        setActiveLocaleState(code);
    }, []);

    function addLocale(code: string) {
        setLocalizations((prev) => (prev[code] ? prev : { ...prev, [code]: {} }));
    }

    function removeLocale(code: string) {
        setLocalizations((prev) => {
            const next = { ...prev };
            delete next[code];

            return next;
        });
        setActiveLocaleState((current) => (current === code ? null : current));
    }

    /** Edit one translated string by hand (from the panel or the canvas). */
    function setLocalizedText(code: string, elementId: string, text: string, highlight?: string) {
        setLocalizations((prev) => {
            // Keep the accent on the same fragment when the edit left it intact;
            // drop it when the words it highlighted are gone.
            const previousHighlight = prev[code]?.[elementId]?.richText
                ?.find((span) => span.color || span.highlight)?.text ?? '';
            const fragment = highlight ?? previousHighlight;

            return {
                ...prev,
                [code]: {
                    ...(prev[code] ?? {}),
                    [elementId]: {
                        text,
                        richText: buildRichText(text, fragment, accentColor),
                    },
                },
            };
        });
    }

    /**
     * Translate every caption of the deck into one locale. Returns false when the
     * run failed so the caller can stop a "translate all" sweep early.
     */
    async function translateLocale(code: string, slides: Slide[]): Promise<boolean> {
        const locale = findLocale(code);

        if (!locale) {
            return false;
        }

        const items = collectTranslatableText(slides);

        if (items.length === 0) {
            return true;
        }

        setTranslating(code);
        setError('');

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        try {
            const response = await fetch(AppScreenshotController.translate().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
                body: JSON.stringify({
                    language: locale.language,
                    app_name: appName,
                    items: items.map((item) => ({
                        id: item.id,
                        text: item.text,
                        highlight: item.highlight || undefined,
                        // The source length is the layout budget the caption was fitted to.
                        max_chars: Math.max(24, Math.round(item.text.length * 1.25)),
                    })),
                }),
            });

            if (!response.ok) {
                setError(response.status === 402 ? 'premium_required' : 'server_error');

                return false;
            }

            const data = await response.json() as TranslateResponse;
            const translations = data.translations ?? [];

            if (locale.font) {
                await loadGoogleFont(locale.font);
            }

            setLocalizations((prev) => {
                const entries = { ...(prev[code] ?? {}) };

                for (const translation of translations) {
                    entries[translation.id] = {
                        text: translation.text,
                        richText: buildRichText(translation.text, translation.highlight ?? '', accentColor),
                    };
                }

                return { ...prev, [code]: entries };
            });

            return true;
        } catch {
            setError('network_error');

            return false;
        } finally {
            setTranslating(null);
        }
    }

    /** Translate every locale the project ships in, one after another. */
    async function translateAll(slides: Slide[], codes?: string[]): Promise<void> {
        for (const code of codes ?? locales) {
            const ok = await translateLocale(code, slides);

            if (!ok) {
                return;
            }
        }
    }

    /** How many of the deck's strings a locale already has. */
    function translatedCount(code: string): number {
        return Object.keys(localizations[code] ?? {}).length;
    }

    return {
        localizations,
        setLocalizations,
        locales,
        activeLocale,
        setActiveLocale,
        addLocale,
        removeLocale,
        setLocalizedText,
        translateLocale,
        translateAll,
        translatedCount,
        translating,
        error,
        setError,
    };
}
