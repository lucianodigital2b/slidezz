import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import { Slide, SlideEl, TextEl, ImageEl, GradientEl, ProfileBadge, RichSpan, Format, FORMATS, SLIDE_W } from '../types';
import { uid, SHADOW_DEFAULTS, fitTextFontSize, resolveAccessibleHighlightColor, getSafeAreaBounds } from '../utils';
import { loadGoogleFont } from '@/utils/google-fonts';
import { SLIDE_TEMPLATES, SlideTemplate, ContentBand, createTicketShape, ticketRect, buildTicketCorners, resolveTemplateForBrand } from '../templates';
import { LayoutType, LAYOUT_DEFINITIONS, generateLayoutSequenceFromContent, slotToBox, computeSafeArea, TitleFitter } from '../layouts';

export type ImageMode = 'none' | 'background' | 'grid' | 'alternate';

/** Loads an image just to read its natural width/height aspect (w / h). */
function loadImageAspect(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        if (!url.startsWith('data:')) {
            img.crossOrigin = 'Anonymous';
        }
        img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1);
        img.onerror = reject;
        img.src = url;
    });
}

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
    format: Format,
    badgeIdentity: { handle: string; photoUrl: string } = { handle: '', photoUrl: '' },
    brand: { color: string | null; accent: string | null; logoUrl: string | null } = { color: null, accent: null, logoUrl: null },
) {
    const { t } = useTranslation();
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiStyle, setAiStyle] = useState('');
    const [aiSlideCount, setAiSlideCount] = useState(5);
    const [aiImageMode, setAiImageMode] = useState<ImageMode>('background');
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

    /**
     * Keep the highlight terms (words or multi-word phrases) that actually appear
     * in the title, in the order given, deduped and capped. Multiple terms are
     * allowed — `buildRichText` emphasizes every matching term.
     */
    function pickHighlightTerms(title: string, highlightWords: string[] | undefined): string[] {
        if (!highlightWords?.length) return [];

        const terms: string[] = [];
        const seen = new Set<string>();

        for (const candidate of highlightWords) {
            const term = candidate.trim();
            if (!term) continue;
            const key = term.toLowerCase();
            if (seen.has(key)) continue;
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(escaped, 'i').test(title)) {
                terms.push(term);
                seen.add(key);
            }
        }

        return terms.slice(0, 4);
    }

    function buildSlideFromData(
        data: SlideData,
        bgBase64: string | null,
        template: SlideTemplate | null,
        layoutType: LayoutType,
        slideIndex: number,
        totalSlides: number,
        imageMode: ImageMode = 'background',
        topic: string = '',
        logo: { url: string; aspect: number } | null = null,
    ): Slide {
        const slideH = FORMATS[format].h;
        const layout = LAYOUT_DEFINITIONS[layoutType];

        const effectiveMode: 'background' | 'grid' =
            imageMode === 'alternate' ? (slideIndex % 2 === 0 ? 'background' : 'grid') :
            imageMode === 'none' ? 'background' : // won't reach here — guarded upstream
            imageMode as 'background' | 'grid';

        // A grid image card occupies the top or bottom of the slide. Compute its box up
        // front so we can (a) reserve the opposite band for the text content and (b) place
        // the card itself further down, from the same geometry.
        const willPlaceGridCard = Boolean(bgBase64) && effectiveMode === 'grid' && layout.backgroundPreference !== 'solid';
        const GRID_CARD_PAD = 80;
        const GRID_CARD_GAP = 48;
        const gridCardH = Math.round(slideH * (layout.type === 'hook_hero' ? 0.50 : 0.40));
        const gridCardY = layout.imageCardPosition === 'bottom'
            ? slideH - GRID_CARD_PAD - gridCardH
            : GRID_CARD_PAD;
        const safeArea = computeSafeArea(slideH, slideIndex);
        const contentBand: ContentBand | undefined = willPlaceGridCard
            ? (layout.imageCardPosition === 'bottom'
                ? { top: safeArea.y, bottom: gridCardY - GRID_CARD_GAP }
                : { top: gridCardY + gridCardH + GRID_CARD_GAP, bottom: safeArea.y + safeArea.height })
            : undefined;

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

            const scene = template.buildSceneFromLayout(content, layout, slideH, slideIndex, totalSlides, contentBand);

            // Ticket template: the serif title/body is already laid out. Drop a ticket-shaped
            // surface behind it (workspace brand color on the cover, white on inner slides),
            // the workspace logo in the bottom-right, and the corner chrome (deck title, slide
            // number, handle). No images, badge or word-highlight — the ticket stays flat.
            if (template.id === 'ticket') {
                const ticketColor = slideIndex === 0 && brand.color ? brand.color : '#ffffff';
                scene.elements.unshift(createTicketShape(slideH, ticketColor));

                if (logo) {
                    const logoH = 52;
                    const logoW = Math.max(logoH, Math.min(240, Math.round(logoH * logo.aspect)));
                    const r = ticketRect(slideH);
                    scene.elements.push({
                        id: uid(), type: 'image', src: logo.url,
                        x: r.x + r.width - logoW - 50, y: r.y + r.height - logoH - 50,
                        width: logoW, height: logoH,
                        rotation: 0, opacity: 1,
                        brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                        hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                        red: 255, green: 255, blue: 255,
                        overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
                        isBackground: false, bgSize: 'contain', bgPositionX: 50, bgPositionY: 50,
                        ...SHADOW_DEFAULTS,
                    } as ImageEl);
                }

                const corners = buildTicketCorners({ topic, handle: badgeIdentity.handle || '', slideIndex });
                return { id: uid(), background: scene.background, elements: scene.elements, corners };
            }

            // Full-bleed photographic slides get a cinematic dark treatment regardless of
            // the template's palette: a dark overlay (so the photo stays vivid instead of
            // being washed out by a light editorial background) and white content text (so
            // it reads against the photo). Only the title/description are recolored —
            // decorative elements (badges, pills, accent bars) keep their own colors.
            const isPhotographic = Boolean(bgBase64) && effectiveMode === 'background' && layout.backgroundPreference !== 'solid';
            const colorReference = isPhotographic ? '#0a0a0a' : scene.background;

            if (isPhotographic) {
                const contentTexts = new Set(
                    [data.title, data.title.toUpperCase(), data.description, data.description?.toUpperCase()].filter(Boolean),
                );
                for (const el of scene.elements) {
                    if (el.type === 'text' && contentTexts.has(el.text)) {
                        el.fill = '#ffffff';
                    }
                }
            }

            // Use the template's accent color for the highlighted word (solid, no
            // gradient) so the highlight is consistent across the deck. Falls back to
            // the LLM-chosen color only when there is no template accent.
            const accent = template.accentColor;
            const highlightColor = resolveAccessibleHighlightColor(accent ?? data.highlightColor, colorReference);
            const highlightGradient = accent ? undefined : resolveAccessibleGradient(data.highlightGradient, colorReference);
            const highlightWords = pickHighlightTerms(data.title, data.highlightWords);

            if (highlightWords.length > 0) {
                // Match case-insensitively: some layouts (hook_hero, stat_callout) render the
                // title uppercased, so build the rich text from the element's displayed text
                // to preserve its casing.
                const titleEl = scene.elements.find(
                    (el): el is TextEl => el.type === 'text' && el.text.toUpperCase() === data.title.toUpperCase(),
                );
                if (titleEl) {
                    titleEl.richText = buildRichText(titleEl.text, highlightWords, titleEl.fill, highlightColor, highlightGradient);
                }
            }

            if (bgBase64 && layout.backgroundPreference !== 'solid') {
                if (effectiveMode === 'background') {
                    const overlayColor = isPhotographic ? '#000000' : (template?.background ?? '#000000');
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
                    // Grid: image as a contained card, position driven by layout. The text
                    // content was already confined to the opposite band via contentBand.
                    scene.elements.unshift({
                        id: uid(), type: 'image', src: bgBase64,
                        x: GRID_CARD_PAD, y: gridCardY,
                        width: SLIDE_W - GRID_CARD_PAD * 2, height: gridCardH,
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

            // Templates can ship an active ProfileBadge by default: tweet-style decks read
            // like a real Twitter/X post, and any template with a defaultBadgeStyle gets a
            // handle chip above the title. Placeholder name/handle/photo are edited in the
            // badge panel.
            // Profile badge only on the hero (cover) slide — never on inner/closing slides.
            const wantsBadge = slideIndex === 0 && (scene.badgeStyle === 'tweet' || Boolean(template?.defaultBadgeStyle));
            const profileBadge: ProfileBadge | undefined = wantsBadge && scene.badgeStyle
                ? {
                    enabled: true,
                    style: scene.badgeStyle,
                    name: scene.badgeStyle === 'tweet' ? 'Your name' : '',
                    handle: badgeIdentity.handle || '',
                    photoUrl: badgeIdentity.photoUrl,
                    size: 48,
                    verified: scene.badgeStyle === 'tweet',
                    x: scene.badgeX,
                    y: scene.badgeY,
                }
                : undefined;

            return { id: uid(), background: scene.background, elements: scene.elements, ...(profileBadge ? { profileBadge } : {}) };
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

        const accent = template?.accentColor;
        const highlightColor = resolveAccessibleHighlightColor(accent ?? data.highlightColor, backgroundColor);
        const highlightGradient = accent ? undefined : resolveAccessibleGradient(data.highlightGradient, backgroundColor);
        const highlightWords = pickHighlightTerms(data.title, data.highlightWords);
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
            accentEnabled: false, accentColor: '#FFE156', accentThickness: 6, accentSide: 'left', accentGap: 12,
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
            accentEnabled: false, accentColor: '#FFE156', accentThickness: 6, accentSide: 'left', accentGap: 12,
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

    async function generateCarousel(topicOverride?: string, styleOverride?: string, slideCountOverride?: number, imageModeOverride?: ImageMode, wordHighlightOverride?: boolean, replaceSlides?: boolean, templateIdOverride?: string | null, languageOverride?: string, imageStyleOverride?: string) {
        if (isGeneratingRef.current) return;
        const topic = topicOverride ?? aiTopic;
        const style = styleOverride ?? aiStyle;
        const slideCount = slideCountOverride ?? aiSlideCount;
        const imageMode: ImageMode = imageModeOverride ?? aiImageMode;
        const wordHighlight = wordHighlightOverride ?? aiWordHighlight;
        const language = languageOverride ?? aiLanguage;
        const imageStyle = (imageStyleOverride ?? aiImageStyle).trim();
        const templateId = templateIdOverride !== undefined ? templateIdOverride : aiTemplateId;
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
                body: JSON.stringify({ topic, style: style || undefined, slide_count: slideCount, word_highlight: wordHighlight, language, template: templateId || undefined, image_style: imageStyle || undefined }),
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
                setAiError(t('slideEditor.ai.errorNoCredits'));
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
                if (slide.title && slide.imagePrompt) parsedSlides.push(slide);
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
        const template = rawTemplate ? resolveTemplateForBrand(rawTemplate, brand.accent) : null;

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

        let imageResults: PromiseSettledResult<string | null>[] = [];
        // Each managed (non-BYOK) image costs one credit server-side; track when the
        // balance runs out so we can tell the user some slides came back without an image.
        let ranOutOfImageCredits = false;

        const aspectRatio = format === 'stories' ? '9:16' : '4:5';

        if (shouldGenerateImages) {
            imageResults = await Promise.allSettled(
                parsedSlides.map(async (s) => {
                    setAiProgress((prev) => [...prev, s.title]);
                    try {
                        const r = await fetch(CarouselGenerationController.generateImage().url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                            // imageStyle is already folded into imagePrompt server-side (it
                            // overrides the template aesthetics during composition).
                            body: JSON.stringify({ prompt: s.imagePrompt, aspect_ratio: aspectRatio }),
                        });
                        if (r.status === 402) { ranOutOfImageCredits = true; return null; }
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

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = shouldGenerateImages ? imageResults[i] : null;
            const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(s, base64, template, layoutSequence[i], i, parsedSlides.length, imageMode, topic, logo);
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

        // The deck still generated (text is free) — only some images were skipped for
        // lack of image credits. Surface it without blocking the result.
        if (ranOutOfImageCredits) {
            window.alert(t('slideEditor.ai.errorNoImageCredits'));
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
