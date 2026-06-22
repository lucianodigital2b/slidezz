import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import { Slide, SlideEl, TextEl, ImageEl, GradientEl, RichSpan, Format, FORMATS, SLIDE_W } from '../types';
import { uid, SHADOW_DEFAULTS, fitTextFontSize, resolveAccessibleHighlightColor, getSafeAreaBounds } from '../utils';
import { loadGoogleFont } from '@/utils/google-fonts';
import { SLIDE_TEMPLATES, SlideTemplate } from '../templates';
import { LayoutType, LAYOUT_DEFINITIONS, generateLayoutSequence } from '../layouts';

export type ImageMode = 'none' | 'background' | 'grid' | 'alternate';

export interface SlideData {
    title: string;
    description: string;
    imagePrompt: string;
    highlightWords?: string[];
    highlightColor?: string;
    highlightGradient?: string[];
    stat?: string;
    ctaPill?: string;
}

export function useAiGeneration(
    slides: Slide[],
    setSlides: React.Dispatch<React.SetStateAction<Slide[]>>,
    setCurrentIdx: (idx: number) => void,
    setSelectedId: (id: string | null) => void,
    format: Format
) {
    const { t } = useTranslation();
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiStyle, setAiStyle] = useState('');
    const [aiSlideCount, setAiSlideCount] = useState(5);
    const [aiImageMode, setAiImageMode] = useState<ImageMode>('background');
    const [aiWordHighlight, setAiWordHighlight] = useState(true);
    const [aiTemplateId, setAiTemplateId] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'imaging' | 'done' | 'error'>('idle');
    const [aiProgress, setAiProgress] = useState<string[]>([]);
    const [aiError, setAiError] = useState('');
    const esRef = useRef<EventSource | null>(null);
    const isGeneratingRef = useRef(false);

    function openAiModal() {
        setAiModalOpen(true);
        setAiStatus('idle');
        setAiProgress([]);
        setAiError('');
    }

    function closeAiModal() {
        esRef.current?.close();
        esRef.current = null;
        setAiModalOpen(false);
        setAiStatus('idle');
    }

    function buildRichText(text: string, highlightWords: string[], normalColor: string, highlightColor: string, highlightGradient?: string[]): RichSpan[] {
        if (!highlightWords.length) return [{ text, color: normalColor }];
        const escaped = highlightWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
        const gradient = highlightGradient && highlightGradient.length >= 2 ? highlightGradient : undefined;
        const spans: RichSpan[] = [];
        let lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
            if (match.index! > lastIndex) spans.push({ text: text.slice(lastIndex, match.index), color: normalColor });
            spans.push({ text: match[0], color: highlightColor, ...(gradient ? { gradient } : {}) });
            lastIndex = match.index! + match[0].length;
        }
        if (lastIndex < text.length) spans.push({ text: text.slice(lastIndex), color: normalColor });
        return spans.length > 0 ? spans : [{ text, color: normalColor }];
    }

    function resolveAccessibleGradient(gradient: string[] | undefined, background: string): string[] | undefined {
        if (!gradient || gradient.length < 2) return undefined;
        return gradient.map((stop) => resolveAccessibleHighlightColor(stop, background));
    }

    function pickSingleHighlightWord(title: string, highlightWords: string[] | undefined): string[] {
        if (!highlightWords?.length) return [];

        for (const candidate of highlightWords) {
            const parts = candidate
                .split(/\s+/)
                .map((part) => part.trim())
                .filter(Boolean);

            for (const part of parts) {
                const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp(`\\b${escaped}\\b`, 'i').test(title)) return [part];
            }
        }

        return [];
    }

    function buildSlideFromData(
        data: SlideData,
        bgBase64: string | null,
        template: SlideTemplate | null,
        layoutType: LayoutType,
        slideIndex: number,
        totalSlides: number,
        imageMode: ImageMode = 'background',
    ): Slide {
        const slideH = FORMATS[format].h;
        const layout = LAYOUT_DEFINITIONS[layoutType];

        const effectiveMode: 'background' | 'grid' =
            imageMode === 'alternate' ? (slideIndex % 2 === 0 ? 'background' : 'grid') :
            imageMode === 'none' ? 'background' : // won't reach here — guarded upstream
            imageMode as 'background' | 'grid';

        if (template?.buildSceneFromLayout) {
            const content = {
                eyebrow: '',
                title: data.title,
                subtitle: '',
                caption: data.description,
                description: data.description,
                stat: data.stat,
                ctaPill: data.ctaPill,
            };

            const scene = template.buildSceneFromLayout(content, layout, slideH, slideIndex, totalSlides);

            const highlightColor = resolveAccessibleHighlightColor(data.highlightColor, scene.background);
            const highlightGradient = resolveAccessibleGradient(data.highlightGradient, scene.background);
            const highlightWords = pickSingleHighlightWord(data.title, data.highlightWords);

            if (highlightWords.length > 0) {
                const titleEl = scene.elements.find(
                    (el): el is TextEl => el.type === 'text' && el.text === data.title,
                );
                if (titleEl) {
                    titleEl.richText = buildRichText(data.title, highlightWords, titleEl.fill, highlightColor, highlightGradient);
                }
            }

            if (bgBase64 && layout.backgroundPreference !== 'solid') {
                if (effectiveMode === 'background') {
                    const overlayColor = template?.background ?? '#000000';
                    const overlayPreset =
                        layout.gradientIntensity >= 0.75 ? 'gradient_strong' :
                        layout.gradientIntensity >= 0.5  ? 'gradient' :
                        layout.gradientIntensity >= 0.25 ? 'base' : 'none';

                    // Remove standalone gradient elements — the image overlay replaces them
                    scene.elements = scene.elements.filter(el => el.type !== 'gradient');

                    scene.elements.unshift({
                        id: uid(), type: 'image', src: bgBase64,
                        x: 0, y: 0, width: SLIDE_W, height: slideH,
                        rotation: 0, opacity: 1,
                        brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                        hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                        red: 255, green: 255, blue: 255,
                        overlayEnabled: overlayPreset !== 'none',
                        overlayColor,
                        overlayOpacity: 1,
                        overlayPreset,
                        isBackground: true, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                        ...SHADOW_DEFAULTS,
                    } as ImageEl);
                } else {
                    // Grid: image as a contained card, position driven by layout
                    const cardPad = 80;
                    const cardH = Math.round(slideH * (layout.type === 'hook_hero' ? 0.50 : 0.40));
                    const cardY = layout.imageCardPosition === 'bottom'
                        ? slideH - cardPad - cardH
                        : cardPad;
                    scene.elements.unshift({
                        id: uid(), type: 'image', src: bgBase64,
                        x: cardPad, y: cardY,
                        width: SLIDE_W - cardPad * 2, height: cardH,
                        cornerRadius: 40,
                        rotation: 0, opacity: 1,
                        brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                        hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                        red: 255, green: 255, blue: 255,
                        overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
                        isBackground: false, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                        ...SHADOW_DEFAULTS,
                    } as ImageEl);
                }
            }

            return { id: uid(), background: scene.background, elements: scene.elements };
        }

        // Fallback: legacy layout-agnostic rendering (background images only; grid slides get no image)
        return buildSlideFromDataLegacy(data, effectiveMode === 'background' ? bgBase64 : null, template, slideH);
    }

    function buildSlideFromDataLegacy(
        data: SlideData,
        bgBase64: string | null,
        template: SlideTemplate | null,
        slideH: number,
    ): Slide {
        const safeBounds = getSafeAreaBounds(format);
        const horizontalInset = 80;
        const descriptionInset = 20;
        const topInset = Math.round(safeBounds.height * 0.18);
        const bottomInset = Math.round(safeBounds.height * 0.08);
        const contentX = safeBounds.x + horizontalInset;
        const contentWidth = Math.max(320, safeBounds.width - horizontalInset * 2);
        const titleY = safeBounds.y + topInset;
        const titleHeight = Math.min(format === 'stories' ? 280 : 240, Math.round(safeBounds.height * 0.24));
        const descY = titleY + titleHeight + 24;
        const safeBottomY = safeBounds.y + safeBounds.height - bottomInset;
        const descriptionX = contentX + descriptionInset;
        const descriptionWidth = Math.max(280, contentWidth - descriptionInset * 2);
        const descMaxHeight = Math.max(116, safeBottomY - descY);

        const backgroundColor = template?.background ?? '#1a1a2e';
        const titleFont = template?.font ?? 'Space Mono';
        const bodyFont = template ? (template.fonts[1] ?? template.fonts[0]) : 'Inter';
        const titleFontStyle = template?.fontStyle ?? 'bold';
        const textColor = template?.textColor ?? '#ffffff';
        const textAlign = template?.align ?? 'center';
        const titleLetterSpacing = template?.letterSpacing ?? -1;

        const highlightColor = resolveAccessibleHighlightColor(data.highlightColor, backgroundColor);
        const highlightGradient = resolveAccessibleGradient(data.highlightGradient, backgroundColor);
        const highlightWords = pickSingleHighlightWord(data.title, data.highlightWords);
        const titlePadding = 28;
        const descriptionPadding = 16;
        const titleRichText = highlightWords.length > 0
            ? buildRichText(data.title, highlightWords, textColor, highlightColor, highlightGradient)
            : undefined;

        const titleFontSize = fitTextFontSize(data.title, titleFont, titleFontStyle, 80, 1.15, titleLetterSpacing, contentWidth, titleHeight, titlePadding);
        const titleEl: TextEl = {
            id: uid(), type: 'text', x: contentX, y: titleY,
            width: contentWidth, height: titleHeight, rotation: 0, opacity: 1,
            text: data.title, fontSize: titleFontSize, fontFamily: titleFont, fill: textColor,
            fontStyle: titleFontStyle, align: textAlign, verticalAlign: 'top',
            lineHeight: 1.15, letterSpacing: titleLetterSpacing, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: titlePadding, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS, shadowEnabled: true, shadowBlur: 20, shadowOpacity: 0.6,
            ...(titleRichText ? { richText: titleRichText } : {}),
        };

        const descFontSize = fitTextFontSize(data.description, bodyFont, '', 32, 1.5, 0, descriptionWidth, descMaxHeight, descriptionPadding);
        const descEl: TextEl = {
            id: uid(), type: 'text', x: descriptionX, y: descY,
            width: descriptionWidth, height: descMaxHeight, rotation: 0, opacity: 1,
            text: data.description, fontSize: descFontSize, fontFamily: bodyFont, fill: textColor === '#ffffff' ? '#d8d8d8' : textColor,
            fontStyle: '', align: textAlign, verticalAlign: 'top',
            lineHeight: 1.5, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: descriptionPadding, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        };

        const gradientEl: GradientEl = {
            id: uid(), type: 'gradient',
            x: 0, y: Math.max(0, safeBounds.y - 80),
            width: SLIDE_W, height: slideH - Math.max(0, safeBounds.y - 80),
            rotation: 0, opacity: 1,
            color: '#000000', direction: 'bottom',
            ...SHADOW_DEFAULTS,
        };

        const elements: SlideEl[] = [gradientEl, titleEl, descEl];

        if (bgBase64) {
            const bgEl: ImageEl = {
                id: uid(), type: 'image', src: bgBase64,
                x: 0, y: 0, width: SLIDE_W, height: slideH,
                rotation: 0, opacity: 1,
                brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                red: 255, green: 255, blue: 255,
                overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
                isBackground: true, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            };
            elements.unshift(bgEl);
        }

        return { id: uid(), background: backgroundColor, elements };
    }

    async function generateCarousel(topicOverride?: string, styleOverride?: string, slideCountOverride?: number, imageModeOverride?: ImageMode, wordHighlightOverride?: boolean, replaceSlides?: boolean) {
        if (isGeneratingRef.current) return;
        const topic = topicOverride ?? aiTopic;
        const style = styleOverride ?? aiStyle;
        const slideCount = slideCountOverride ?? aiSlideCount;
        const imageMode: ImageMode = imageModeOverride ?? aiImageMode;
        const wordHighlight = wordHighlightOverride ?? aiWordHighlight;
        const shouldGenerateImages = imageMode !== 'none';
        if (!topic.trim()) return;
        isGeneratingRef.current = true;
        const newSlideStartIdx = replaceSlides ? 0 : slides.length;
        setAiStatus('generating');
        setAiProgress([]);
        setAiError('');

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        let response: Response;
        try {
            response = await fetch(CarouselGenerationController.generate().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ topic, style: style || undefined, slide_count: slideCount, word_highlight: wordHighlight }),
            });
        } catch {
            isGeneratingRef.current = false;
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorNetwork'));
            return;
        }

        if (!response.ok || !response.body) {
            isGeneratingRef.current = false;
            setAiStatus('error');
            if (response.status === 402) {
                setAiError(t('slideEditor.ai.errorNoCredits'));
            } else {
                setAiError(t('slideEditor.ai.errorServer'));
            }
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let assembled = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });

            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const payload = JSON.parse(line.slice(6)) as { delta?: string; text?: string };
                    const chunk = payload.delta ?? payload.text ?? '';
                    if (chunk) assembled += chunk;
                } catch { /* ignore malformed SSE lines */ }
            }
        }

        setAiStatus('imaging');

        const parsedSlides: SlideData[] = [];
        for (const rawLine of assembled.split('\n')) {
            const trimmed = rawLine.trim();
            if (!trimmed.startsWith('{')) continue;
            try {
                const slide = JSON.parse(trimmed) as SlideData;
                if (slide.title && slide.imagePrompt) parsedSlides.push(slide);
            } catch { /* skip malformed lines */ }
        }

        if (parsedSlides.length === 0) {
            isGeneratingRef.current = false;
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorParsing'));
            return;
        }

        const hasStats = parsedSlides.some(s => Boolean(s.stat));
        const layoutSequence = generateLayoutSequence(parsedSlides.length, hasStats);

        let imageResults: PromiseSettledResult<string | null>[] = [];

        const aspectRatio = format === 'stories' ? '9:16' : '4:5';

        if (shouldGenerateImages) {
            imageResults = await Promise.allSettled(
                parsedSlides.map(async (s) => {
                    setAiProgress((prev) => [...prev, s.title]);
                    try {
                        const r = await fetch(CarouselGenerationController.generateImage().url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                            body: JSON.stringify({ prompt: s.imagePrompt, aspect_ratio: aspectRatio }),
                        });
                        if (!r.ok) return null;
                        const data = await r.json() as { base64?: string };
                        return data.base64 ?? null;
                    } catch {
                        return null;
                    }
                }),
            );
        }

        const template = aiTemplateId ? SLIDE_TEMPLATES.find(t => t.id === aiTemplateId) ?? null : null;
        await Promise.all((template ? [...new Set(template.fonts)] : ['Space Mono', 'Inter']).map(f => loadGoogleFont(f)));

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = shouldGenerateImages ? imageResults[i] : null;
            const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(s, base64, template, layoutSequence[i], i, parsedSlides.length, imageMode);
        });

        if (replaceSlides) {
            setSlides(newSlides);
        } else {
            setSlides((prev) => [...prev, ...newSlides]);
        }
        setCurrentIdx(newSlideStartIdx);
        setSelectedId(null);
        setAiModalOpen(false);
        setAiStatus('idle');
        isGeneratingRef.current = false;

        return newSlides;
    }

    return {
        aiModalOpen,
        setAiModalOpen,
        aiTopic,
        setAiTopic,
        aiStyle,
        setAiStyle,
        aiSlideCount,
        setAiSlideCount,
        aiImageMode,
        setAiImageMode,
        aiWordHighlight,
        setAiWordHighlight,
        aiTemplateId,
        setAiTemplateId,
        aiStatus,
        setAiStatus,
        aiProgress,
        aiError,
        openAiModal,
        closeAiModal,
        generateCarousel,
    };
}
