import type { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';

export function hexToRgba(hex: string, alpha: number): string {
    let parsed = hex.replace('#', '');

    if (parsed.length === 3) {
        parsed = parsed
            .split('')
            .map((c) => c + c)
            .join('');
    }

    const num = parseInt(parsed, 16);

    if (isNaN(num)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Backdrop({
    accent,
    style,
}: {
    accent: string;
    style?: CSSProperties;
}) {
    const topGlow = `radial-gradient(ellipse 90% 55% at 50% 0%, ${hexToRgba(accent, 0.22)}, transparent 70%)`;
    const bottomGlow = `radial-gradient(ellipse 80% 40% at 50% 100%, ${hexToRgba(accent, 0.1)}, transparent 70%)`;
    const vignette = `radial-gradient(transparent 55%, rgba(0, 0, 0, 0.55))`;

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#060807',
                backgroundImage: `${topGlow}, ${bottomGlow}, ${vignette}`,
                ...style,
            }}
        />
    );
}
