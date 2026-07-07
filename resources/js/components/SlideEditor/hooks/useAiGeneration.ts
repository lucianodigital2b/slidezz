import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import { Slide, Format, FORMATS } from '../types';
import { fitTextFontSize } from '../utils';
import { loadGoogleFont } from '@/utils/google-fonts';
import { SLIDE_TEMPLATES, resolveTemplateForBrand } from '../templates';
import { generateLayoutSequenceFromContent, pickLayoutForSlide, slotToBox, TitleFitter } from '../layouts';
import {
    ImageMode,
    SlideData,
    BuildContext,
    buildImageSlide,
    buildSlideFromData,
    loadImageAspect,
} from '../slideBuilders';

// Re-exported for existing consumers that import these from the hook.
export type { ImageMode, SlideData } from '../slideBuilders';

export function useAiGeneration(
    slides: Slide[],
    setSlides: React.Dispatch<React.SetStateAction<Slide[]>>,
    setCurrentIdx: (idx: number) => void,
    setSelectedId: (id: string | null) => void,
    format: Format,
    badgeIdentity: { handle: string; photoUrl: string } = { handle: '', photoUrl: '' },
    brand: { color: string | null; accent: string | null; logoUrl: string | null } = { color: null, accent: null, logoUrl: null },
) {
    const { t } = useTranslation();
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiStyle, setAiStyle] = useState('');
    const [aiSlideCount, setAiSlideCount] = useState(5);
    const [aiImageMode, setAiImageMode] = useState<ImageMode>('mixed');
    const [aiWordHighlight, setAiWordHighlight] = useState(true);
    const [aiLanguage, setAiLanguage] = useState('Portuguese (Brazil)');
    // Free-text refinement appended to every generated image prompt (e.g. "preto e
    // branco, cinematográfico, grão de filme"). Empty = no refinement.
    const [aiImageStyle, setAiImageStyle] = useState('');
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

    async function generateCarousel(topicOverride?: string, styleOverride?: string, slideCountOverride?: number, imageModeOverride?: ImageMode, wordHighlightOverride?: boolean, replaceSlides?: boolean, templateIdOverride?: string | null, languageOverride?: string, imageStyleOverride?: string, ctaImageOverride?: string | null) {
        if (isGeneratingRef.current) return;
        const topic = topicOverride ?? aiTopic;
        const style = styleOverride ?? aiStyle;
        const totalSlideCount = slideCountOverride ?? aiSlideCount;
        const imageMode: ImageMode = imageModeOverride ?? aiImageMode;
        const wordHighlight = wordHighlightOverride ?? aiWordHighlight;
        const language = languageOverride ?? aiLanguage;
        const imageStyle = (imageStyleOverride ?? aiImageStyle).trim();
        const templateId = templateIdOverride !== undefined ? templateIdOverride : aiTemplateId;
        // A user-supplied CTA image becomes the final slide, so the model writes one
        // fewer slide and skips the CTA copy.
        const ctaImage = ctaImageOverride ?? null;
        const slideCount = ctaImage ? Math.max(1, totalSlideCount - 1) : totalSlideCount;
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
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                body: JSON.stringify({ topic, style: style || undefined, slide_count: slideCount, word_highlight: wordHighlight, language, template: templateId || undefined, image_style: imageStyle || undefined, handle: badgeIdentity.handle || undefined, cta_slide: ctaImage ? false : undefined }),
            });
        } catch {
            isGeneratingRef.current = false;
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorNetwork'));
            return;
        }

        if (!response.ok) {
            isGeneratingRef.current = false;
            setAiStatus('error');
            if (response.status === 402) {
                // Soft paywall: the generator needs the lifetime launch offer
                // (or an active subscription).
                setAiError(t('slideEditor.ai.errorPremiumRequired'));
            } else {
                setAiError(t('slideEditor.ai.errorServer'));
            }
            return;
        }

        let assembled = '';
        try {
            const data = await response.json() as { ndjson?: string };
            assembled = data.ndjson ?? '';
        } catch {
            isGeneratingRef.current = false;
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorParsing'));
            return;
        }

        setAiStatus('imaging');

        const parsedSlides: SlideData[] = [];
        for (const rawLine of assembled.split('\n')) {
            const trimmed = rawLine.trim();
            if (!trimmed.startsWith('{')) continue;
            try {
                const slide = JSON.parse(trimmed) as SlideData;
                // A slide with copy but no imagePrompt is still a slide — render it
                // without an image rather than silently shrinking the deck.
                if (slide.title) parsedSlides.push(slide);
            } catch { /* skip malformed lines */ }
        }

        if (parsedSlides.length === 0) {
            isGeneratingRef.current = false;
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorParsing'));
            return;
        }

        const slideH = FORMATS[format].h;
        const rawTemplate = templateId ? SLIDE_TEMPLATES.find(t => t.id === templateId) ?? null : null;
        const template = rawTemplate ? resolveTemplateForBrand(rawTemplate, brand.accent, brand.color) : null;

        // Load the template fonts before measuring so the title fit reflects real
        // glyph metrics rather than the canvas fallback font.
        await Promise.all((template ? [...new Set(template.fonts)] : ['Space Mono', 'Inter']).map(f => loadGoogleFont(f)));

        const titleFont = template?.font ?? 'Inter';
        const fitTitle: TitleFitter = (text, slot, slideIndex) => {
            const box = slotToBox(slot, slideH, slideIndex);
            const style = slot.fontStyleHint === 'normal' ? '' : slot.fontStyleHint === 'black' ? '900' : slot.fontStyleHint;

            return fitTextFontSize(text.toUpperCase(), titleFont, style, slot.maxFontSize, slot.lineHeight, slot.letterSpacing, box.width, box.height, 28);
        };

        const layoutSequence = generateLayoutSequenceFromContent(
            parsedSlides.map(s => ({ title: s.title, description: s.description, hasStat: Boolean(s.stat), hasImage: shouldGenerateImages })),
            fitTitle,
        );

        // With a user CTA image, no generated slide is a call-to-action — re-pick the
        // last slide as a regular middle layout so it doesn't render the centered
        // CTA-closing composition.
        if (ctaImage && layoutSequence.length > 0) {
            const lastIdx = layoutSequence.length - 1;
            const s = parsedSlides[lastIdx];
            layoutSequence[lastIdx] = pickLayoutForSlide(
                { title: s.title, description: s.description, hasStat: Boolean(s.stat), hasImage: shouldGenerateImages },
                'middle',
            );
        }

        let imageResults: PromiseSettledResult<string | null>[] = [];
        // Images are BYOK-only: a 402 from the server means the user has no Gemini
        // key connected yet. Track it so we can point them to the settings page.
        let missingGeminiKey = false;

        const aspectRatio = format === 'stories' ? '9:16' : '4:5';

        if (shouldGenerateImages) {
            imageResults = await Promise.allSettled(
                parsedSlides.map(async (s) => {
                    setAiProgress((prev) => [...prev, s.title]);
                    if (!s.imagePrompt) return null;
                    try {
                        const r = await fetch(CarouselGenerationController.generateImage().url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                            // imageStyle is already folded into imagePrompt server-side (it
                            // overrides the template aesthetics during composition).
                            body: JSON.stringify({ prompt: s.imagePrompt, aspect_ratio: aspectRatio }),
                        });
                        if (r.status === 402) { missingGeminiKey = true; return null; }
                        if (!r.ok) return null;
                        const data = await r.json() as { base64?: string };
                        return data.base64 ?? null;
                    } catch {
                        return null;
                    }
                }),
            );
        }

        // The Ticket template renders the workspace logo in the corner — preload it once
        // to get its aspect so the corner box isn't stretched.
        let logo: { url: string; aspect: number } | null = null;
        if (template?.id === 'ticket' && brand.logoUrl) {
            try {
                logo = { url: brand.logoUrl, aspect: await loadImageAspect(brand.logoUrl) };
            } catch {
                logo = null;
            }
        }

        const ctx: BuildContext = { format, badgeIdentity, brand };

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = shouldGenerateImages ? imageResults[i] : null;
            const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(ctx, s, base64, template, layoutSequence[i], i, parsedSlides.length, imageMode, topic, logo);
        });

        // Append the user's CTA image as the final full-bleed slide.
        if (ctaImage) {
            newSlides.push(buildImageSlide(ctaImage, slideH));
        }

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

        // The deck still generated (text is free) — only the images were skipped
        // because no Gemini key is connected. Point the user to the settings page.
        if (missingGeminiKey) {
            window.alert(t('slideEditor.ai.errorMissingGeminiKey'));
        }

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
        aiLanguage,
        setAiLanguage,
        aiImageStyle,
        setAiImageStyle,
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
