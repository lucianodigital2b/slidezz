import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import { Slide, SlideEl, TextEl, ImageEl, GradientEl, ProfileBadge, RichSpan, Format, FORMATS, SLIDE_W } from '../types';
import { uid, SHADOW_DEFAULTS, fitTextFontSize, resolveAccessibleHighlightColor, getSafeAreaBounds } from '../utils';
import { loadGoogleFont } from '@/utils/google-fonts';
import { SLIDE_TEMPLATES, SlideTemplate, ContentBand, createTicketShape, ticketRect, buildTicketCorners, buildEditorialHeaderElements, resolveTemplateForBrand } from '../templates';
import { LayoutType, LAYOUT_DEFINITIONS, generateLayoutSequenceFromContent, pickLayoutForSlide, slotToBox, computeSafeArea, TitleFitter } from '../layouts';

export type ImageMode = 'none' | 'background' | 'grid' | 'alternate' | 'mixed';

// 'mixed' mode: an inner slide switches from a full-bleed photo to a contained image
// card once its body copy passes this length — a short slide reads as a punchy
// full-bleed hero, a text-heavy one gets a card so the body has room to breathe.
const MIXED_CARD_MIN_DESC = 90;

// Above this body length, an image card slide shrinks its card to leave a taller text
// band so the long copy fits the reserved area instead of overflowing onto the photo.
const GRID_CARD_LONG_DESC = 160;

/** A full-bleed slide whose only content is a user-supplied image (the final CTA). */
function buildImageSlide(src: string, slideH: number): Slide {
    return {
        id: uid(),
        background: '#000000',
        elements: [{
            id: uid(), type: 'image', src,
            x: 0, y: 0, width: SLIDE_W, height: slideH,
            rotation: 0, opacity: 1,
            brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
            hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
            red: 255, green: 255, blue: 255,
            overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
            isBackground: true, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
            ...SHADOW_DEFAULTS,
        } as ImageEl],
    };
}

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
    highlightBody?: string[];
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

    function buildRichText(text: string, highlightWords: string[], normalColor: string, highlightColor: string, highlightGradient?: string[]): RichSpan[] {
        if (!highlightWords.length) return [{ text, color: normalColor }];
        const escaped = highlightWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
        const gradient = highlightGradient && highlightGradient.length >= 2 ? highlightGradient : undefined;
        const spans: RichSpan[] = [];
        let lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
            if (match.index! > lastIndex) spans.push({ text: text.slice(lastIndex, match.index), color: normalColor });
            // Highlighted words render bold (min 700) so they stand out even when the
            // surrounding copy is a lighter body weight.
            spans.push({ text: match[0], color: highlightColor, bold: true, ...(gradient ? { gradient } : {}) });
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

        // 'mixed' (hero cover + varied inner layouts): the cover is always a full-bleed
        // hero; inner slides pick their image placement from the copy so the deck has
        // variety without a blind index rotation — a short slide is a full-bleed photo,
        // a text-heavy one is a contained card.
        const mixedPlacement = (): 'background' | 'grid' => {
            if (slideIndex === 0) return 'background';

            return (data.description ?? '').trim().length >= MIXED_CARD_MIN_DESC ? 'grid' : 'background';
        };

        let effectiveMode: 'background' | 'grid' =
            imageMode === 'mixed' ? mixedPlacement() :
            imageMode === 'alternate' ? (slideIndex % 2 === 0 ? 'background' : 'grid') :
            imageMode === 'none' ? 'background' : // won't reach here — guarded upstream
            imageMode as 'background' | 'grid';

        // The oversized stat callout only reads over a full-bleed photo, never as a
        // small grid card — force background placement regardless of the alternation.
        if (layout.type === 'stat_callout') {
            effectiveMode = 'background';
        }

        // A grid image card occupies the top or bottom of the slide. Compute its box up
        // front so we can (a) reserve the opposite band for the text content and (b) place
        // the card itself further down, from the same geometry.
        const willPlaceGridCard = Boolean(bgBase64) && effectiveMode === 'grid' && layout.backgroundPreference !== 'solid';
        const GRID_CARD_PAD = 80;
        // Breathing room reserved between the image card and the text band so copy never
        // reads glued to the photo.
        const GRID_CARD_GAP = 72;
        // 'mixed' mode alternates the card between top and bottom across inner slides so
        // consecutive photo-card slides don't read the same; other modes keep the
        // layout's own preferred position. The content band is reserved on the opposite
        // side (see contentBand below) so copy never overlaps the card wherever it lands.
        const cardPosition: 'top' | 'bottom' =
            // A tweet's media always sits below the copy, and its profile header is pinned
            // to the top — so keep the card at the bottom to stay authentic and clear of
            // the badge that now renders on every Twitter/X slide.
            template?.id === 'twitter-x' ? 'bottom' :
            imageMode === 'mixed' ? (slideIndex % 2 === 0 ? 'top' : 'bottom') :
            layout.imageCardPosition;

        // A text-heavy slide needs a taller text band, so shrink the card — otherwise the
        // long body can't fit the reserved band and overflows onto the card despite the
        // gap. The hero cover keeps its large card; other slides shrink once the body is long.
        const isTextHeavyCard = (data.description ?? '').trim().length >= GRID_CARD_LONG_DESC;
        const gridCardH = Math.round(slideH * (
            layout.type === 'hook_hero' ? 0.50 :
            isTextHeavyCard ? 0.32 :
            0.40
        ));
        const gridCardY = cardPosition === 'bottom'
            ? slideH - GRID_CARD_PAD - gridCardH
            : GRID_CARD_PAD;
        const safeArea = computeSafeArea(slideH, slideIndex);
        const contentBand: ContentBand | undefined = willPlaceGridCard
            ? (cardPosition === 'bottom'
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

            // A stat callout over a full-bleed photo must sit LOW, over the bottom
            // gradient — not centered over the subject's face. Pack the caption, stat
            // and body into the lower half only when there's a background image; on a
            // solid background the layout stays centered.
            const layoutForScene = (bgBase64 && layout.type === 'stat_callout' && layout.stat)
                ? {
                    ...layout,
                    title: { ...layout.title, y: 0.46, height: 0.07 },
                    stat: { ...layout.stat, y: 0.53, height: 0.20 },
                    description: { ...layout.description, y: 0.74, height: 0.24 },
                }
                : layout;

            const scene = template.buildSceneFromLayout(content, layoutForScene, slideH, slideIndex, totalSlides, contentBand);

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

            // Body highlight: emphasize key phrases inside the description (accent color +
            // bold), mirroring the title. Prefer the LLM's `highlightBody` picks; on middle
            // slides fall back to any title terms that also appear in the body. The hook and
            // CTA keep an un-highlighted body unless the model explicitly picks a phrase.
            const isMiddleSlide = slideIndex > 0 && slideIndex < totalSlides - 1;
            const bodyPicks = data.highlightBody ?? (isMiddleSlide ? data.highlightWords : undefined);
            const bodyTerms = pickHighlightTerms(data.description, bodyPicks);

            if (bodyTerms.length > 0) {
                const descEl = scene.elements.find(
                    (el): el is TextEl => el.type === 'text' && el.text === data.description,
                );
                if (descEl) {
                    descEl.richText = buildRichText(descEl.text, bodyTerms, descEl.fill, highlightColor, highlightGradient);
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

            // Editorial Press runs a fixed top header on every slide (source credit ·
            // @handle · month year). It's pushed last so it sits above any full-bleed
            // photo; the ink is forced white on photographic slides (dark overlay).
            if (template?.id === 'editorial-press') {
                const now = new Date();
                const month = now.toLocaleString('pt-BR', { month: 'long' });
                const dateLabel = `${month.charAt(0).toUpperCase()}${month.slice(1)} ${now.getFullYear()}`;
                scene.elements.push(...buildEditorialHeaderElements({
                    handle: badgeIdentity.handle || '',
                    dateLabel,
                    background: isPhotographic ? '#000000' : scene.background,
                }));
            }

            // Templates can ship an active ProfileBadge by default: tweet-style decks read
            // like a real Twitter/X post, and any template with a defaultBadgeStyle gets a
            // handle chip above the title. Placeholder name/handle/photo are edited in the
            // badge panel.
            // The Twitter/X template is a real tweet on every slide, so its profile header
            // (avatar · name · @handle) renders on all slides. Other templates only chip the
            // handle on the hero (cover) slide.
            const isTweet = scene.badgeStyle === 'tweet';
            const wantsBadge = isTweet || (slideIndex === 0 && Boolean(template?.defaultBadgeStyle));
            const profileBadge: ProfileBadge | undefined = wantsBadge && scene.badgeStyle
                ? {
                    enabled: true,
                    style: scene.badgeStyle,
                    name: scene.badgeStyle === 'tweet' ? 'Your name' : '',
                    handle: badgeIdentity.handle || '',
                    photoUrl: badgeIdentity.photoUrl,
                    size: 64,
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

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = shouldGenerateImages ? imageResults[i] : null;
            const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(s, base64, template, layoutSequence[i], i, parsedSlides.length, imageMode, topic, logo);
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
