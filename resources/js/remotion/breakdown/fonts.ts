import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

export const SANS =
    "'BreakdownSans', 'Inter', 'Helvetica Neue', Arial, sans-serif";
export const MONO =
    "'BreakdownMono', 'JetBrains Mono', ui-monospace, Menlo, monospace";

/** One load per page: every frame waits on the same promise, so none renders with a fallback font. */
let fontsReady: Promise<void> | null = null;

function loadFonts(fontBaseUrl: string): Promise<void> {
    if (!fontsReady) {
        const base = fontBaseUrl.replace(/\/$/, '');
        const sans = new FontFace(
            'BreakdownSans',
            `url(${base}/Inter.woff2) format('woff2')`,
            { weight: '500 900' },
        );
        const mono = new FontFace(
            'BreakdownMono',
            `url(${base}/JetBrainsMono.woff2) format('woff2')`,
            { weight: '400 700' },
        );

        fontsReady = Promise.all([sans.load(), mono.load()])
            .then(([loadedSans, loadedMono]) => {
                document.fonts.add(loadedSans);
                document.fonts.add(loadedMono);
            })
            .catch((error: unknown) => {
                console.error('Failed to load breakdown fonts:', error);
            });
    }

    return fontsReady;
}

export function useBreakdownFonts(fontBaseUrl: string): void {
    const [handle] = useState(() => delayRender('breakdown-fonts'));

    useEffect(() => {
        loadFonts(fontBaseUrl).then(() => continueRender(handle));
    }, [fontBaseUrl, handle]);
}
