import { Slide, ShadowProps, GradientEl, BorderStyle, RichSpan, Format, FORMATS, SLIDE_W } from './types';

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

function normalizeColorForCompare(color: string | undefined | null): string | null {
    const normalizedHex = normalizeHexColor(color);
    if (normalizedHex) return normalizedHex;
    return color?.trim().toLowerCase() ?? null;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWordToken(word: string): string {
    return word
        .trim()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
        .toLocaleLowerCase();
}

function tokenizeWords(text: string): Array<{ word: string; start: number; end: number; index: number; normalized: string }> {
    const tokens: Array<{ word: string; start: number; end: number; index: number; normalized: string }> = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            word: match[0],
            start: match.index,
            end: match.index + match[0].length,
            index,
            normalized: normalizeWordToken(match[0]),
        });
        index++;
    }

    return tokens;
}

function buildRichTextWithHighlightRange(text: string, start: number, end: number, normalColor: string, highlightColor: string): RichSpan[] | undefined {
    if (start >= end || start < 0 || end > text.length) return undefined;

    const spans: RichSpan[] = [];

    if (start > 0) spans.push({ text: text.slice(0, start), color: normalColor });
    spans.push({ text: text.slice(start, end), color: highlightColor });
    if (end < text.length) spans.push({ text: text.slice(end), color: normalColor });

    return spans;
}

export function extractSingleHighlightWord(text: string, richText: RichSpan[] | undefined, baseColor: string): { word: string; color: string; wordIndex: number; normalizedWord: string } | null {
    if (!richText?.length) return null;

    const normalizedBaseColor = normalizeColorForCompare(baseColor);
    const words = tokenizeWords(text);

    let searchStartIndex = 0;
    for (const span of richText) {
        const candidateColor = normalizeColorForCompare(span.color);
        if (!span.text.trim() || !candidateColor || candidateColor === normalizedBaseColor) continue;

        const spanWords = tokenizeWords(span.text);
        if (!spanWords.length) continue;

        for (const spanWord of spanWords) {
            const foundIndex = words.findIndex((word, idx) => idx >= searchStartIndex && word.word === spanWord.word);
            if (foundIndex !== -1) {
                return {
                    word: words[foundIndex].word,
                    color: span.color!,
                    wordIndex: words[foundIndex].index,
                    normalizedWord: words[foundIndex].normalized,
                };
            }

            const normalizedIndex = words.findIndex((word, idx) => idx >= searchStartIndex && word.normalized && word.normalized === spanWord.normalized);
            if (normalizedIndex !== -1) {
                return {
                    word: words[normalizedIndex].word,
                    color: span.color!,
                    wordIndex: words[normalizedIndex].index,
                    normalizedWord: words[normalizedIndex].normalized,
                };
            }
        }

        searchStartIndex += spanWords.length;
    }

    return null;
}

export function buildRichTextWithSingleHighlight(
    text: string,
    highlightWord: string | undefined,
    normalColor: string,
    highlightColor: string
): RichSpan[] | undefined {
    const word = highlightWord?.trim();
    if (!word) return undefined;

    const match = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').exec(text);
    if (!match || match.index === undefined) return undefined;

    const spans: RichSpan[] = [];
    const start = match.index;
    const end = start + match[0].length;

    if (start > 0) spans.push({ text: text.slice(0, start), color: normalColor });
    spans.push({ text: text.slice(start, end), color: highlightColor });
    if (end < text.length) spans.push({ text: text.slice(end), color: normalColor });

    return spans;
}

export function preserveSingleHighlightRichText(
    previousText: string,
    nextText: string,
    richText: RichSpan[] | undefined,
    normalColor: string
): RichSpan[] | undefined {
    const existingHighlight = extractSingleHighlightWord(previousText, richText, normalColor);
    if (!existingHighlight) return undefined;

    const nextWords = tokenizeWords(nextText);
    if (nextWords.length === 0) return undefined;

    const sameWordMatches = nextWords.filter((word) => word.normalized && word.normalized === existingHighlight.normalizedWord);
    const targetWord = sameWordMatches.length > 0
        ? sameWordMatches.sort((a, b) => Math.abs(a.index - existingHighlight.wordIndex) - Math.abs(b.index - existingHighlight.wordIndex))[0]
        : nextWords[Math.max(0, Math.min(existingHighlight.wordIndex, nextWords.length - 1))];

    return buildRichTextWithHighlightRange(nextText, targetWord.start, targetWord.end, normalColor, existingHighlight.color);
}

export function measureTextWidthWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    letterSpacing: number,
    includeTrailingSpacing = false,
): number {
    if (!text) return 0;

    const baseWidth = ctx.measureText(text).width;
    const spacingCount = Math.max(0, text.length - 1) + (includeTrailingSpacing ? 1 : 0);

    return baseWidth + spacingCount * letterSpacing;
}

export function drawTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    letterSpacing: number,
): void {
    if (!text) return;
    if (text.length === 1 || letterSpacing === 0) {
        ctx.fillText(text, x, y);
        return;
    }

    let cursorX = x;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        ctx.fillText(char, cursorX, y);
        cursorX += ctx.measureText(char).width;
        if (index < text.length - 1) cursorX += letterSpacing;
    }
}

export function strokeTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    letterSpacing: number,
): void {
    if (!text) return;
    if (text.length === 1 || letterSpacing === 0) {
        ctx.strokeText(text, x, y);
        return;
    }

    let cursorX = x;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        ctx.strokeText(char, cursorX, y);
        cursorX += ctx.measureText(char).width;
        if (index < text.length - 1) cursorX += letterSpacing;
    }
}

export interface SafeAreaPadding {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export type SafeAreaFormat = Format | 'carousel';

export const SAFE_AREA_PADDINGS: Record<SafeAreaFormat, SafeAreaPadding> = {
    carousel: {
        top: 180,
        right: 0,
        bottom: 180,
        left: 0,
    },
    post: {
        top: 180,
        right: 0,
        bottom: 180,
        left: 0,
    },
    stories: {
        top: 250,
        right: 0,
        bottom: 250,
        left: 0,
    },
};

export function getSafeAreaPadding(format: SafeAreaFormat): SafeAreaPadding {
    return SAFE_AREA_PADDINGS[format];
}

export function getSafeAreaBounds(format: SafeAreaFormat): { x: number; y: number; width: number; height: number } {
    const baseFormat = format === 'carousel' ? 'post' : format;
    const { w, h } = FORMATS[baseFormat];
    const { top, right, bottom, left } = getSafeAreaPadding(format);

    return {
        x: left,
        y: top,
        width: Math.max(0, Math.min(SLIDE_W, w) - left - right),
        height: Math.max(0, h - top - bottom),
    };
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
    maxHeight: number,
    boxPadding = 0,
): number {
    const ctx = getMeasureCtx();
    let fontSize = initialFontSize;
    const minFontSize = 10;
    const innerMaxWidth = Math.max(10, maxWidth - boxPadding * 2);
    const innerMaxHeight = Math.max(10, maxHeight - boxPadding * 2);

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

            const wordWidth = measureTextWidthWithLetterSpacing(ctx, word, letterSpacing, true);
            
            if (currentLineWidth + wordWidth > innerMaxWidth && currentLineWidth > 0) {
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
        
        if (totalHeight <= innerMaxHeight) {
            break;
        }
        
        fontSize -= 2;
    }
    
    return fontSize;
}
