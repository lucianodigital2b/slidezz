import { Slide, ShadowProps, GradientEl, BorderStyle } from './types';

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function makeSlide(background = '#ffffff'): Slide { return { id: uid(), background, elements: [] }; }

export const SHADOW_DEFAULTS: ShadowProps = {
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 0.5,
};

export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function normalizeHexColor(color: string | undefined | null): string | null {
    if (!color) return null;
    const value = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
        const [, r, g, b] = value;
        return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return null;
}

function channelToLinear(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return 0;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);

    return (
        (0.2126 * channelToLinear(r)) +
        (0.7152 * channelToLinear(g)) +
        (0.0722 * channelToLinear(b))
    );
}

export function contrastRatio(foreground: string, background: string): number {
    const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
    const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
    return (lighter + 0.05) / (darker + 0.05);
}

export function resolveAccessibleHighlightColor(
    preferredColor: string | undefined | null,
    backgroundColor: string,
    fallbackColors: string[] = ['#FFD84D', '#FF5A36', '#39FF14', '#E8440A']
): string {
    const minContrast = 4.5;
    const normalizedBackground = normalizeHexColor(backgroundColor) ?? '#000000';
    const normalizedPreferred = normalizeHexColor(preferredColor);
    const candidates = [
        normalizedPreferred,
        ...fallbackColors.map((color) => normalizeHexColor(color)),
    ].filter((color): color is string => Boolean(color));

    for (const color of candidates) {
        if (contrastRatio(color, normalizedBackground) >= minContrast) return color;
    }

    return candidates
        .sort((a, b) => contrastRatio(b, normalizedBackground) - contrastRatio(a, normalizedBackground))[0] ?? '#FFD84D';
}

export function gradientLinearProps(el: GradientEl) {
    const solid = hexToRgba(el.color, 1);
    const clear = hexToRgba(el.color, 0);
    switch (el.direction) {
        case 'bottom': return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, clear, 1, solid] };
        case 'top':    return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, solid, 1, clear] };
        case 'left':   return { start: { x: 0, y: 0 },       end: { x: el.width, y: 0 },  stops: [0, solid, 1, clear] };
        case 'right':  return { start: { x: el.width, y: 0 }, end: { x: 0, y: 0 },         stops: [0, solid, 1, clear] };
    }
}

export function borderStyleToDash(style: BorderStyle, width: number): number[] {
    if (style === 'dashed') return [width * 4, width * 2];
    if (style === 'dotted') return [width, width];
    return [];
}

let _measureCanvas: HTMLCanvasElement | null = null;
export function getMeasureCtx(): CanvasRenderingContext2D {
    if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
    return _measureCanvas.getContext('2d')!;
}

export function fitTextFontSize(
    text: string,
    fontFamily: string,
    fontStyle: string,
    initialFontSize: number,
    lineHeight: number,
    letterSpacing: number,
    maxWidth: number,
    maxHeight: number
): number {
    const ctx = getMeasureCtx();
    let fontSize = initialFontSize;
    const minFontSize = 10;

    while (fontSize >= minFontSize) {
        ctx.font = `${fontStyle ? fontStyle + ' ' : ''}${fontSize}px "${fontFamily}"`;
        
        const words = text.split(/(\s+)/);
        let lines = 1;
        let currentLineWidth = 0;
        
        for (const word of words) {
            if (word === '\n') {
                lines++;
                currentLineWidth = 0;
                continue;
            }
            
            const wordWidth = ctx.measureText(word).width + (word.length * letterSpacing);
            
            if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                lines++;
                if (/^\s+$/.test(word)) {
                    currentLineWidth = 0;
                } else {
                    currentLineWidth = wordWidth;
                }
            } else {
                currentLineWidth += wordWidth;
            }
        }
        
        const totalHeight = lines * (fontSize * lineHeight);
        
        if (totalHeight <= maxHeight) {
            break;
        }
        
        fontSize -= 2;
    }
    
    return fontSize;
}
