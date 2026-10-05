import { useRef, useState } from 'react';
import AppScreenshotController from '@/actions/App/Http/Controllers/AppScreenshotController';
import { loadGoogleFont } from '@/utils/google-fonts';
import type { ScreenshotCaption, ScreenshotLayout } from '../appStore';
import {
    buildScreenshotSlide,
    imageAspect,
    resolveTheme,
} from '../appStore';
import type { Slide, StoreFormat } from '../types';
import { storeOf } from '../types';

/** The brief the wizard hands the editor to build a store screenshot set. */
export interface ScreenshotConfig {
    appName: string;
    pitch: string;
    format: StoreFormat;
    theme: string;
    layout: ScreenshotLayout;
    screenCount: number;
    language: string;
    tone: string;
    screenLabels: string[];
    locales: string[];
    aiCopy: boolean;
    deviceFrame: string;
}

/** sessionStorage key the wizard parks the uploaded device shots under. */
export const SCREENSHOT_UPLOADS_KEY = 'appScreenshotUploads';

export function readUploadedScreenshots(): string[] {
    try {
        const raw = sessionStorage.getItem(SCREENSHOT_UPLOADS_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown;

        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

interface CaptionsResponse {
    captions?: { headline: string; subheadline: string; highlight?: string }[];
}

/**
 * Builds a full set of store screenshots from the wizard brief: AI captions
 * over the uploaded device shots, composed on the selected theme.
 */
export function useScreenshotGeneration(brand: { color: string | null; accent: string | null }) {
    const [status, setStatus] = useState<'idle' | 'writing' | 'building' | 'error'>('idle');
    const [error, setError] = useState('');
    const runningRef = useRef(false);

    async function fetchCaptions(config: ScreenshotConfig, count: number): Promise<ScreenshotCaption[]> {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        const response = await fetch(AppScreenshotController.captions().url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
            body: JSON.stringify({
                app_name: config.appName,
                pitch: config.pitch,
                count,
                language: config.language,
                store: storeOf(config.format) ?? 'appstore',
                tone: config.tone || undefined,
                screen_labels: config.screenLabels,
            }),
        });

        if (!response.ok) {
            throw new Error(response.status === 402 ? 'premium_required' : 'server_error');
        }

        const data = await response.json() as CaptionsResponse;

        return (data.captions ?? []).map((caption) => ({
            headline: caption.headline,
            subheadline: caption.subheadline,
            highlight: caption.highlight,
        }));
    }

    /**
     * Generate the screenshot deck. Returns the built slides so the caller can
     * persist them, or null when the run failed.
     */
    async function generate(config: ScreenshotConfig, uploads: string[]): Promise<Slide[] | null> {
        if (runningRef.current) {
            return null;
        }

        runningRef.current = true;
        setError('');

        const count = Math.max(1, Math.min(config.screenCount, Math.max(uploads.length, 1)));

        let captions: ScreenshotCaption[] = [];

        if (config.aiCopy) {
            setStatus('writing');

            try {
                captions = await fetchCaptions(config, count);
            } catch (e) {
                runningRef.current = false;
                setStatus('error');
                setError(e instanceof Error ? e.message : 'server_error');
                // The deck is still worth building — the user can write the copy by hand.
                captions = [];
            }
        }

        setStatus('building');

        // Placeholder copy keeps every screenshot editable when the AI step is off
        // or failed, instead of rendering an empty canvas.
        const resolvedCaptions: ScreenshotCaption[] = Array.from({ length: count }, (_, index) => captions[index] ?? {
            headline: config.appName,
            subheadline: config.pitch.slice(0, 60),
            highlight: '',
        });

        await loadGoogleFont('Inter');

        const theme = resolveTheme(config.theme, brand);
        const aspects = await Promise.all(
            resolvedCaptions.map((_, index) => (uploads[index] ? imageAspect(uploads[index]) : Promise.resolve(2.1666))),
        );

        const slides = resolvedCaptions.map((caption, index) => buildScreenshotSlide(
            caption,
            uploads[index] ?? null,
            aspects[index],
            index,
            { format: config.format, theme, layout: config.layout, deviceFrame: config.deviceFrame },
        ));

        runningRef.current = false;
        setStatus('idle');

        return slides;
    }

    return { generate, status, error, setError };
}
