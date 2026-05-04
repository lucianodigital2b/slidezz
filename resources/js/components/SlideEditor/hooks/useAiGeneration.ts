import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import { Slide, SlideEl, TextEl, ImageEl, GradientEl, RichSpan, Format, FORMATS, SLIDE_W } from '../types';
import { uid, SHADOW_DEFAULTS, fitTextFontSize } from '../utils';
import { loadGoogleFont } from '@/utils/google-fonts';

export interface SlideData {
    title: string;
    subtitle: string;
    description: string;
    imagePrompt: string;
    highlightWords?: string[];
    highlightColor?: string;
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
    const [aiGenerateImages, setAiGenerateImages] = useState(true);
    const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'imaging' | 'done' | 'error'>('idle');
    const [aiProgress, setAiProgress] = useState<string[]>([]);
    const [aiError, setAiError] = useState('');
    const esRef = useRef<EventSource | null>(null);

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

    function buildRichText(text: string, highlightWords: string[], normalColor: string, highlightColor: string): RichSpan[] {
        if (!highlightWords.length) return [{ text, color: normalColor }];
        const escaped = highlightWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
        const spans: RichSpan[] = [];
        let lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
            if (match.index! > lastIndex) spans.push({ text: text.slice(lastIndex, match.index), color: normalColor });
            spans.push({ text: match[0], color: highlightColor });
            lastIndex = match.index! + match[0].length;
        }
        if (lastIndex < text.length) spans.push({ text: text.slice(lastIndex), color: normalColor });
        return spans.length > 0 ? spans : [{ text, color: normalColor }];
    }

    function buildSlideFromData(data: SlideData, bgBase64: string | null): Slide {
        const slideH = FORMATS[format].h;
        const textY = Math.round(slideH * 0.5);
        const highlightColor = data.highlightColor ?? '#E8440A';
        const highlightWords = data.highlightWords ?? [];
        const titleRichText = highlightWords.length > 0
            ? buildRichText(data.title, highlightWords, '#ffffff', highlightColor)
            : undefined;

        const titleFontSize = fitTextFontSize(data.title, 'Poppins', 'bold', 80, 1.15, -1, SLIDE_W - 160, 200);
        const titleEl: TextEl = {
            id: uid(), type: 'text', x: 80, y: textY,
            width: SLIDE_W - 160, height: 200, rotation: 0, opacity: 1,
            text: data.title, fontSize: titleFontSize, fontFamily: 'Poppins', fill: '#ffffff',
            fontStyle: 'bold', align: 'center', verticalAlign: 'top',
            lineHeight: 1.15, letterSpacing: -1, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS, shadowEnabled: true, shadowBlur: 20, shadowOpacity: 0.6,
            ...(titleRichText ? { richText: titleRichText } : {}),
        };

        const subtitleFontSize = fitTextFontSize(data.subtitle, 'Poppins', '', 44, 1.3, 0, SLIDE_W - 160, 120);
        const subtitleEl: TextEl = {
            id: uid(), type: 'text', x: 80, y: textY + 200,
            width: SLIDE_W - 160, height: 120, rotation: 0, opacity: 1,
            text: data.subtitle, fontSize: subtitleFontSize, fontFamily: 'Poppins', fill: '#f0f0f0',
            fontStyle: '', align: 'center', verticalAlign: 'top',
            lineHeight: 1.3, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS, shadowEnabled: true, shadowBlur: 12, shadowOpacity: 0.5,
        };

        const descMaxHeight = Math.max(100, slideH - (textY + 340) - 40);
        const descFontSize = fitTextFontSize(data.description, 'Poppins', '', 32, 1.5, 0, SLIDE_W - 200, descMaxHeight);
        const descEl: TextEl = {
            id: uid(), type: 'text', x: 100, y: textY + 340,
            width: SLIDE_W - 200, height: descMaxHeight, rotation: 0, opacity: 1,
            text: data.description, fontSize: descFontSize, fontFamily: 'Poppins', fill: '#e0e0e0',
            fontStyle: '', align: 'center', verticalAlign: 'top',
            lineHeight: 1.5, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        };

        const gradientEl: GradientEl = {
            id: uid(), type: 'gradient',
            x: 0, y: Math.round(slideH * 0.35),
            width: SLIDE_W, height: Math.round(slideH * 0.65),
            rotation: 0, opacity: 1,
            color: '#000000', direction: 'bottom',
            ...SHADOW_DEFAULTS,
        };

        const elements: SlideEl[] = [gradientEl, titleEl, subtitleEl, descEl];

        if (bgBase64) {
            const bgEl: ImageEl = {
                id: uid(), type: 'image', src: bgBase64,
                x: 0, y: 0, width: SLIDE_W, height: slideH,
                rotation: 0, opacity: 1,
                brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                red: 255, green: 255, blue: 255,
                overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 0,
                isBackground: true, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            };
            elements.unshift(bgEl);
        }

        return { id: uid(), background: '#1a1a2e', elements };
    }

    async function generateCarousel(topicOverride?: string, styleOverride?: string, slideCountOverride?: number, generateImagesOverride?: boolean) {
        const topic = topicOverride ?? aiTopic;
        const style = styleOverride ?? aiStyle;
        const slideCount = slideCountOverride ?? aiSlideCount;
        const shouldGenerateImages = generateImagesOverride !== undefined ? generateImagesOverride : aiGenerateImages;
        if (!topic.trim()) return;
        const newSlideStartIdx = slides.length;
        setAiStatus('generating');
        setAiProgress([]);
        setAiError('');

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        // POST to get an SSE stream; we use fetch + ReadableStream to handle POST+SSE
        let response: Response;
        try {
            response = await fetch(CarouselGenerationController.generate().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ topic, style: style || undefined, slide_count: slideCount }),
            });
        } catch {
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorNetwork'));
            return;
        }

        if (!response.ok || !response.body) {
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorServer'));
            return;
        }

        // Consume SSE stream, collecting all text_delta chunks into one string
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

        // Parse assembled NDJSON — one JSON object per line
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
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorParsing'));
            return;
        }

        let imageResults: PromiseSettledResult<string | null>[] = [];

        if (shouldGenerateImages) {
            // Generate images in parallel
            imageResults = await Promise.allSettled(
                parsedSlides.map(async (s) => {
                    setAiProgress((prev) => [...prev, s.title]);
                    try {
                        const r = await fetch(CarouselGenerationController.generateImage().url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                            body: JSON.stringify({ prompt: s.imagePrompt }),
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

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = shouldGenerateImages ? imageResults[i] : null;
            const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(s, base64);
        });

        await loadGoogleFont('Poppins');
        setSlides((prev) => [...prev, ...newSlides]);
        setCurrentIdx(newSlideStartIdx);
        setSelectedId(null);
        setAiModalOpen(false);
        setAiStatus('idle');
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
        aiGenerateImages,
        setAiGenerateImages,
        aiStatus,
        setAiStatus,
        aiProgress,
        aiError,
        openAiModal,
        closeAiModal,
        generateCarousel,
    };
}
