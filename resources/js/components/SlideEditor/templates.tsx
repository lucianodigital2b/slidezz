import React from 'react';
import { useTranslation } from 'react-i18next';

import { Align, BadgeStyle, GradientEl, PathEl, ShapeEl, SLIDE_W, SlideCorners, SlideEl, TextEl } from './types';
import { SHADOW_DEFAULTS, fitTextFontSize, measuredTextHeight, uid } from './utils';
import { LayoutDefinition, computeSafeArea } from './layouts';

/**
 * An absolute (px) vertical band that generated content must stay within. Used to
 * reserve the half of the slide opposite a grid image card so title/body copy never
 * sits under the image. When omitted, content fills the whole content safe area.
 */
export interface ContentBand {
    top: number;
    bottom: number;
}

export interface TemplateContent {
    eyebrow: string;
    title: string;
    subtitle: string;
    caption: string;
    description?: string;
}

export interface TemplateScene {
    background: string;
    elements: SlideEl[];
    badgeX?: number;
    badgeY?: number;
    badgeStyle?: BadgeStyle;
}

export interface SlideTemplate {
    id: string;
    name: string;
    background: string;
    backgroundAlt?: string;
    textColor: string;
    textColorAlt?: string;
    accentColor: string;
    font: string;
    bodyFont: string;
    captionFont: string;
    fontStyle: string;
    letterSpacing: number;
    align: Align;
    fonts: string[];
    description?: string;
    buildSceneFromLayout: (
        content: TemplateContent & { stat?: string; ctaPill?: string },
        layout: LayoutDefinition,
        slideH: number,
        slideIndex: number,
        totalSlides: number,
        contentBand?: ContentBand,
    ) => TemplateScene;
    buildScene: (content: TemplateContent, slideH: number) => TemplateScene;
    /** When set, generated slides ship an active ProfileBadge above the title in this style. */
    defaultBadgeStyle?: BadgeStyle;
    /** Defaults to true (ALL-CAPS titles). Set false to render titles in their original case. */
    uppercaseTitle?: boolean;
}

function createText(overrides: Partial<TextEl> & Pick<TextEl, 'text' | 'x' | 'y' | 'width' | 'height'>): TextEl {
    return {
        id: uid(),
        type: 'text',
        rotation: 0,
        opacity: 1,
        fontSize: 48,
        fontFamily: 'Inter',
        fill: '#111111',
        fontStyle: '',
        align: 'left',
        verticalAlign: 'top',
        lineHeight: 1.05,
        letterSpacing: 0,
        textDecoration: '',
        stroke: '#000000',
        strokeWidth: 0,
        padding: 0,
        wrap: 'word',
        accentEnabled: false,
        accentColor: '#E8440A',
        accentThickness: 6,
        accentSide: 'left',
        accentGap: 12,
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

function createRect(overrides: Partial<ShapeEl> & Pick<ShapeEl, 'type' | 'x' | 'y' | 'width' | 'height'>): ShapeEl {
    return {
        id: uid(),
        rotation: 0,
        opacity: 1,
        fill: '#111111',
        stroke: '#000000',
        strokeWidth: 0,
        cornerRadius: 0,
        borderStyle: 'solid',
        dashEnabled: false,
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

function createGradient(overrides: Partial<GradientEl> & Pick<GradientEl, 'x' | 'y' | 'width' | 'height'>): GradientEl {
    return {
        id: uid(),
        type: 'gradient',
        rotation: 0,
        opacity: 1,
        color: '#000000',
        direction: 'bottom',
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

// ─── Ticket shape ────────────────────────────────────────────────────────────
// The Ticket template's colored/white surface is an actual ticket: a rounded
// rectangle with a concave semicircular notch punched out of the top and bottom
// centre. It sits on the black canvas so the notches reveal the dark background.

/** Inset of the ticket from the canvas edges, and its notch / corner radii. */
export const TICKET_MARGIN = 28;
const TICKET_NOTCH_R = 56;
const TICKET_CORNER_R = 44;

/** The ticket's absolute box for a slide of height `slideH`. */
export function ticketRect(slideH: number): { x: number; y: number; width: number; height: number } {
    return {
        x: TICKET_MARGIN,
        y: TICKET_MARGIN,
        width: SLIDE_W - TICKET_MARGIN * 2,
        height: slideH - TICKET_MARGIN * 2,
    };
}

/** SVG path for a `w`×`h` ticket: rounded corners + top/bottom centre notches. */
function ticketPath(w: number, h: number, r: number, nr: number): string {
    const cx = w / 2;

    return [
        `M ${r} 0`,
        `L ${cx - nr} 0`,
        `A ${nr} ${nr} 0 0 0 ${cx + nr} 0`,      // top centre notch (dips into the ticket)
        `L ${w - r} 0`,
        `A ${r} ${r} 0 0 1 ${w} ${r}`,            // top-right corner
        `L ${w} ${h - r}`,
        `A ${r} ${r} 0 0 1 ${w - r} ${h}`,        // bottom-right corner
        `L ${cx + nr} ${h}`,
        `A ${nr} ${nr} 0 0 0 ${cx - nr} ${h}`,    // bottom centre notch
        `L ${r} ${h}`,
        `A ${r} ${r} 0 0 1 0 ${h - r}`,           // bottom-left corner
        `L 0 ${r}`,
        `A ${r} ${r} 0 0 1 ${r} 0`,               // top-left corner
        'Z',
    ].join(' ');
}

/** A filled ticket-shaped PathEl covering the slide (minus the canvas margin). */
export function createTicketShape(slideH: number, fill: string): PathEl {
    const rect = ticketRect(slideH);

    return {
        id: uid(),
        type: 'path',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        opacity: 1,
        data: ticketPath(rect.width, rect.height, TICKET_CORNER_R, TICKET_NOTCH_R),
        dataW: rect.width,
        dataH: rect.height,
        fill,
        stroke: '#000000',
        strokeWidth: 0,
        borderStyle: 'solid',
        dashEnabled: false,
        ...SHADOW_DEFAULTS,
    };
}

/**
 * The Ticket template's corner chrome: deck title (top-left), slide number
 * (top-right, inner slides only), and handle (bottom-left). The bottom-right is
 * left for the workspace logo image, attached separately by the generator.
 */
export function buildTicketCorners(opts: { topic: string; handle: string; slideIndex: number }): SlideCorners {
    const dark = '#111111';
    const isInner = opts.slideIndex > 0;
    const number = isInner ? String(opts.slideIndex + 1) : '';
    const handleText = opts.handle ? `Post by @${opts.handle}` : '';
    // The deck-title header sits only on inner tickets — the cover leads with its headline.
    const deckTitle = isInner ? opts.topic : '';

    // Push the top corners below the ticket's top-centre notch so the deck title and
    // number clear the cutout instead of being sliced by it.
    const topOffset = 58;

    return {
        topLeft: { text: deckTitle, enabled: Boolean(deckTitle), color: dark, fontFamily: 'Space Mono', fontSize: 22, letterSpacing: 0, offsetY: topOffset },
        topRight: { text: number, enabled: Boolean(number), color: dark, fontFamily: 'Fraunces', fontSize: 40, fontStyle: '600', offsetY: topOffset },
        bottomLeft: { text: handleText, enabled: Boolean(handleText), color: dark, fontFamily: 'Space Mono', fontSize: 22, letterSpacing: 0 },
        bottomRight: { text: '', enabled: false, color: dark },
        show: true,
        showDots: false,
        bottomRightIcon: 'none',
    };
}

function fontStyleHintToStyle(hint: LayoutDefinition['title']['fontStyleHint']): string {
    if (hint === 'normal') return '';
    if (hint === 'black') return '900';
    return hint; // 'bold' | 'italic'
}

// Horizontal inset used when BOTH fitting and rendering display titles. Konva
// insets text by its `padding`, so the value passed to fitTextFontSize must equal
// the rendered `padding` or the measured size won't match what is drawn. Kept
// small so headlines fill the box edge-to-edge like the reference competitor cover.
const TITLE_BOX_PADDING = 8;
// Same fit/render-consistency inset for body copy, also used to measure the body's
// real height so bottom-anchored layouts translate the group by the correct amount.
const BODY_BOX_PADDING = 16;

export function buildSceneFromLayoutGeneric(
    template: SlideTemplate,
    content: TemplateContent & { stat?: string; ctaPill?: string },
    layout: LayoutDefinition,
    slideH: number,
    slideIndex: number,
    contentBand?: ContentBand,
): TemplateScene {
    // Keep all content inside the Instagram profile-grid crop. The grid shows a
    // 1:1 centre square of the post, so the top/bottom (slideH - SLIDE_W) / 2 of a
    // portrait slide is cut off there. Anchor the content band to that square
    // (plus a small inner margin) so generated titles/bodies stay visible in the
    // grid. For 4:5 posts this resolves to ~180 (unchanged); for taller formats
    // it tightens so content no longer lands in the cropped bands.
    const safe = computeSafeArea(slideH, slideIndex);
    const { x: safeX } = safe;
    // Content (title/subtitle/description/stat) is mapped into this vertical band.
    // It defaults to the full content safe area, but a grid image card narrows it to
    // the opposite half so copy never overlaps the image.
    const contentTop = contentBand?.top ?? safe.y;
    const contentBottom = contentBand?.bottom ?? (safe.y + safe.height);
    const contentH = Math.max(1, contentBottom - contentTop);

    const useAlt = slideIndex % 2 === 1 && Boolean(template.backgroundAlt);
    const bg = useAlt ? template.backgroundAlt! : template.background;
    const textColor = useAlt && template.textColorAlt ? template.textColorAlt : template.textColor;

    const elements: SlideEl[] = [];

    function fontForRole(role: 'display' | 'body' | 'caption'): string {
        if (role === 'display') return template.font;
        if (role === 'body') return template.bodyFont;
        return template.captionFont;
    }

    // Map a slot's fractional rect into the (possibly reserved) content band. With no
    // reservation this is identical to slotToBox over the full safe area.
    function slotToRect(slot: LayoutDefinition['title']) {
        return {
            x: Math.round(safe.x + slot.x * safe.width),
            y: Math.round(contentTop + slot.y * contentH),
            width: Math.round(slot.width * safe.width),
            height: Math.round(slot.height * contentH),
        };
    }

    if (layout.gradientIntensity > 0.2) {
        elements.push(createGradient({
            x: 0,
            y: Math.round(slideH * 0.35),
            width: SLIDE_W,
            height: Math.round(slideH * 0.65),
            color: bg,
            opacity: layout.gradientIntensity,
        }));
    }

    if (layout.stat?.visible && content.stat) {
        const rect = slotToRect(layout.stat);
        const fontSize = fitTextFontSize(
            content.stat,
            fontForRole('display'),
            '900',
            layout.stat.maxFontSize,
            layout.stat.lineHeight,
            layout.stat.letterSpacing,
            rect.width,
            rect.height,
            0,
        );
        elements.push(createText({
            ...rect,
            text: content.stat,
            fontFamily: fontForRole(layout.stat.fontRole),
            fontSize,
            fontStyle: '900',
            fill: template.accentColor,
            align: layout.stat.align,
            verticalAlign: layout.stat.verticalAlign,
            lineHeight: layout.stat.lineHeight,
            letterSpacing: layout.stat.letterSpacing,
            opacity: layout.stat.opacity,
        }));
    }

    // When the title is top-anchored, the body copy is re-stacked flush under the
    // title's REAL (measured) height instead of sitting at its fixed slot Y — so a
    // short headline doesn't leave a big hole before the text. Centered/bottom
    // compositions (hook_hero, stat_callout, cta_closing) keep their slot positions.
    const stackGap = Math.round(slideH * 0.02);
    const safeBottom = contentBottom;
    let stackCursorY: number | null = null;
    // First index of the title+body group, so it can be translated as a block when
    // the layout anchors content to the bottom (gradient/stat pushed before stay put).
    const groupStart = elements.length;
    // Captured for badge placement: the rendered title element and its measured text
    // height, so the badge anchors to where the title actually draws (after any shift).
    let titleEl: TextEl | null = null;
    let titleMeasuredH = 0;

    if (layout.title.visible) {
        const rect = slotToRect(layout.title);
        // Display titles are uppercased for a consistent impact look across the deck
        // (highlight matching is case-insensitive, so this is safe) — unless the template
        // opts out (e.g. the Ticket template keeps its aesthetic serif in sentence case).
        const titleText = template.uppercaseTitle === false ? content.title : content.title.toUpperCase();
        // Resolve to a valid CSS font-weight ONCE: the raw hint ("black") is not a
        // valid font-weight, so passing it to fitTextFontSize corrupts measurement
        // (the canvas rejects the font string). Fit and render must use the same value.
        const titleFontStyle = fontStyleHintToStyle(layout.title.fontStyleHint);
        const titleFont = fontForRole(layout.title.fontRole);
        const fontSize = fitTextFontSize(
            titleText,
            titleFont,
            titleFontStyle,
            layout.title.maxFontSize,
            layout.title.lineHeight,
            layout.title.letterSpacing,
            rect.width,
            rect.height,
            TITLE_BOX_PADDING,
        );
        elements.push(createText({
            ...rect,
            text: titleText,
            fontFamily: titleFont,
            fontSize,
            fontStyle: titleFontStyle,
            fill: textColor,
            align: layout.title.align,
            verticalAlign: layout.title.verticalAlign,
            lineHeight: layout.title.lineHeight,
            letterSpacing: layout.title.letterSpacing,
            opacity: layout.title.opacity,
            padding: TITLE_BOX_PADDING,
        }));

        titleEl = elements[elements.length - 1] as TextEl;
        titleMeasuredH = measuredTextHeight(titleText, titleFont, titleFontStyle, fontSize, layout.title.lineHeight, layout.title.letterSpacing, rect.width - TITLE_BOX_PADDING * 2);

        if (layout.title.verticalAlign === 'top') {
            stackCursorY = rect.y + titleMeasuredH;
        }
    }

    if (layout.subtitle.visible && content.subtitle) {
        const rect = slotToRect(layout.subtitle);
        const subtitleText = layout.type === 'cta_closing'
            ? content.subtitle.toUpperCase()
            : content.subtitle;
        const subtitleFont = fontForRole(layout.subtitle.fontRole);
        const y = stackCursorY !== null ? stackCursorY + stackGap : rect.y;
        const availH = stackCursorY !== null ? Math.max(40, safeBottom - y) : rect.height;
        const fontSize = fitTextFontSize(
            subtitleText,
            subtitleFont,
            '',
            layout.subtitle.maxFontSize,
            layout.subtitle.lineHeight,
            layout.subtitle.letterSpacing,
            rect.width,
            availH,
            20,
        );
        elements.push(createText({
            ...rect,
            y,
            height: availH,
            text: subtitleText,
            fontFamily: subtitleFont,
            fontSize,
            fill: textColor,
            align: layout.subtitle.align,
            verticalAlign: layout.subtitle.verticalAlign,
            lineHeight: layout.subtitle.lineHeight,
            letterSpacing: layout.subtitle.letterSpacing,
            opacity: layout.subtitle.opacity,
        }));

        if (stackCursorY !== null) {
            const subMeasuredH = measuredTextHeight(subtitleText, subtitleFont, '', fontSize, layout.subtitle.lineHeight, layout.subtitle.letterSpacing, rect.width);
            stackCursorY = y + subMeasuredH;
        }
    }

    const descriptionText = content.description ?? content.caption;
    if (layout.description.visible && descriptionText) {
        const rect = slotToRect(layout.description);
        const descFont = fontForRole(layout.description.fontRole);
        const y = stackCursorY !== null ? stackCursorY + stackGap : rect.y;
        const availH = stackCursorY !== null ? Math.max(60, safeBottom - y) : rect.height;
        const fontSize = fitTextFontSize(
            descriptionText,
            descFont,
            '',
            layout.description.maxFontSize,
            layout.description.lineHeight,
            0,
            rect.width,
            availH,
            BODY_BOX_PADDING,
        );
        elements.push(createText({
            ...rect,
            y,
            height: availH,
            text: descriptionText,
            fontFamily: descFont,
            fontSize,
            fill: textColor,
            align: layout.description.align,
            verticalAlign: layout.description.verticalAlign,
            lineHeight: layout.description.lineHeight,
            opacity: layout.description.opacity,
            padding: BODY_BOX_PADDING,
        }));

        if (stackCursorY !== null) {
            const descMeasuredH = measuredTextHeight(descriptionText, descFont, '', fontSize, layout.description.lineHeight, 0, rect.width - BODY_BOX_PADDING * 2);
            stackCursorY = y + descMeasuredH;
        }
    }

    // Bottom-anchored layouts: the group was built top-down from the title slot;
    // translate the whole block down so its content bottom rests on safeBottom,
    // sitting over the bottom gradient instead of floating high. stackCursorY holds
    // the measured content bottom (set for top-aligned titles, which these layouts use).
    if (layout.contentAnchor === 'bottom' && stackCursorY !== null) {
        const shift = safeBottom - stackCursorY;
        if (shift > 0) {
            for (let i = groupStart; i < elements.length; i++) {
                elements[i].y += shift;
            }
        }
    }

    const isCentered = template.align === 'center';
    // Anchor the badge above the title BOX top (titleEl.y). For top-aligned titles that
    // IS the text top; for bottom-aligned titles (cover) the box top is at/above the text
    // top, so the badge clears the title regardless of line count — robust against canvas
    // line-measurement drift on condensed fonts. Reserve the badge height (size 48 + 2×18
    // pad = 84) plus a gap.
    const BADGE_BLOCK_ABOVE_TITLE = 108;
    const badgeY = titleEl ? Math.max(30, titleEl.y - BADGE_BLOCK_ABOVE_TITLE) : undefined;
    const badgeX = isCentered
        ? Math.round(SLIDE_W * 0.15)
        : (titleEl ? titleEl.x : safeX);
    const badgeStyle: BadgeStyle | undefined = template.defaultBadgeStyle ?? (isCentered ? 'divider' : undefined);

    return { background: bg, elements, badgeX, badgeY, badgeStyle };
}

// ─── Legacy scene builders (unchanged) ──────────────────────────────────────

function buildNoirManifesto(content: TemplateContent, slideH: number): TemplateScene {
    const titleY = slideH > 1400 ? slideH - 640 : slideH - 430;
    const subtitleY = slideH > 1400 ? slideH - 180 : slideH - 110;
    const captionY = slideH > 1400 ? slideH - 110 : slideH - 62;
    const badgeX = 130;
    const badgeY = titleY - 116;

    return {
        background: '#090909',
        badgeX,
        badgeY,
        elements: [
            createRect({
                type: 'circle',
                x: SLIDE_W - 420,
                y: 140,
                width: 360,
                height: 360,
                fill: 'rgba(232,68,10,0.10)',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
            }),
            createGradient({
                x: 0,
                y: Math.round(slideH * 0.42),
                width: SLIDE_W,
                height: Math.round(slideH * 0.58),
                color: '#000000',
                opacity: 0.9,
            }),
            createRect({
                type: 'rect',
                x: 88,
                y: titleY + 20,
                width: 18,
                height: slideH > 1400 ? 280 : 200,
                fill: '#E8440A',
                cornerRadius: 999,
            }),
            createText({
                x: 130,
                y: titleY - 56,
                width: 340,
                height: 36,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 22,
                fontStyle: '600',
                fill: 'rgba(255,255,255,0.62)',
                letterSpacing: 5,
            }),
            createText({
                x: 130,
                y: titleY,
                width: 780,
                height: slideH > 1400 ? 340 : 240,
                text: content.title.toUpperCase(),
                fontFamily: 'Anton',
                fontSize: slideH > 1400 ? 144 : 112,
                fill: '#ffffff',
                letterSpacing: 1.2,
                lineHeight: 0.92,
            }),
            createText({
                x: 130,
                y: subtitleY,
                width: 660,
                height: 72,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 34 : 26,
                fontStyle: '500',
                fill: 'rgba(255,255,255,0.72)',
                lineHeight: 1.25,
            }),
            createText({
                x: 130,
                y: captionY,
                width: 520,
                height: 32,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#E8440A',
                letterSpacing: 3.2,
            }),
        ],
    };
}

function buildDarkCards(content: TemplateContent, slideH: number): TemplateScene {
    const cardY = Math.round(slideH * 0.16);
    const cardH = Math.round(slideH * 0.62);
    const innerY = cardY + 34;
    const badgeX = Math.round(SLIDE_W * 0.15);
    const badgeY = innerY + 82;

    return {
        background: '#000000',
        badgeX,
        badgeY,
        badgeStyle: 'divider' as BadgeStyle,
        elements: [
            createRect({
                type: 'circle',
                x: 180,
                y: cardY + 40,
                width: 720,
                height: 720,
                fill: 'rgba(59,130,246,0.12)',
                shadowEnabled: false,
            }),
            createRect({
                type: 'rect',
                x: 92,
                y: cardY,
                width: 896,
                height: cardH,
                fill: '#111827',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 42,
                shadowEnabled: true,
                shadowColor: '#020617',
                shadowBlur: 26,
                shadowOffsetY: 22,
                shadowOffsetX: 0,
                shadowOpacity: 0.45,
            }),
            createRect({
                type: 'rect',
                x: 124,
                y: innerY,
                width: 832,
                height: 120,
                fill: 'rgba(255,255,255,0.04)',
                cornerRadius: 28,
            }),
            createRect({
                type: 'rect',
                x: 154,
                y: innerY + 34,
                width: 180,
                height: 44,
                fill: '#2563eb',
                cornerRadius: 999,
            }),
            createText({
                x: 182,
                y: innerY + 44,
                width: 120,
                height: 26,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#eff6ff',
                align: 'center',
            }),
            createText({
                x: 148,
                y: innerY + 164,
                width: 784,
                height: 220,
                text: content.title,
                fontFamily: 'Poppins',
                fontSize: slideH > 1400 ? 96 : 78,
                fontStyle: '700',
                fill: '#ffffff',
                align: 'center',
                lineHeight: 1.04,
            }),
            createText({
                x: 184,
                y: innerY + 372,
                width: 712,
                height: 80,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 30 : 24,
                fontStyle: '500',
                fill: 'rgba(255,255,255,0.72)',
                align: 'center',
                lineHeight: 1.3,
            }),
            createRect({
                type: 'rect',
                x: 176,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createRect({
                type: 'rect',
                x: 430,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createRect({
                type: 'rect',
                x: 684,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createText({
                x: 176,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: '01',
                fontFamily: 'Inter',
                fontSize: 34,
                fontStyle: '700',
                fill: '#60a5fa',
                align: 'center',
            }),
            createText({
                x: 430,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: 'FAST',
                fontFamily: 'Inter',
                fontSize: 28,
                fontStyle: '700',
                fill: '#f9fafb',
                align: 'center',
                letterSpacing: 1,
            }),
            createText({
                x: 684,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#94a3b8',
                align: 'center',
                letterSpacing: 2,
            }),
        ],
    };
}

function buildPopMagazine(content: TemplateContent, slideH: number): TemplateScene {
    const footerY = slideH - 120;
    const badgeX = 138;
    const badgeY = 90;

    return {
        background: '#fff8f1',
        badgeX,
        badgeY,
        elements: [
            createRect({
                type: 'rect',
                x: 88,
                y: 86,
                width: 18,
                height: slideH - 172,
                fill: '#E8120A',
                cornerRadius: 999,
            }),
            createRect({
                type: 'circle',
                x: 810,
                y: 88,
                width: 180,
                height: 180,
                fill: '#FFD84D',
                stroke: '#111111',
                strokeWidth: 5,
            }),
            createText({
                x: 832,
                y: 150,
                width: 136,
                height: 60,
                text: 'NEW',
                fontFamily: 'Anton',
                fontSize: 42,
                fill: '#111111',
                align: 'center',
                rotation: -8,
            }),
            createText({
                x: 144,
                y: 120,
                width: 320,
                height: 32,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 20,
                fontStyle: '800',
                fill: '#E8120A',
                letterSpacing: 3,
            }),
            createText({
                x: 138,
                y: 206,
                width: 690,
                height: slideH > 1400 ? 540 : 380,
                text: content.title.toUpperCase(),
                fontFamily: 'Anton',
                fontSize: slideH > 1400 ? 148 : 118,
                fill: '#111111',
                lineHeight: 0.9,
            }),
            createRect({
                type: 'rect',
                x: 142,
                y: slideH > 1400 ? 840 : 700,
                width: 560,
                height: 18,
                fill: '#ff7aa2',
                cornerRadius: 999,
            }),
            createText({
                x: 144,
                y: slideH > 1400 ? 874 : 732,
                width: 700,
                height: 90,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 34 : 28,
                fontStyle: '600',
                fill: '#3f3f46',
                lineHeight: 1.2,
            }),
            createRect({
                type: 'rect',
                x: 126,
                y: footerY,
                width: 828,
                height: 60,
                fill: '#111111',
                cornerRadius: 8,
            }),
            createText({
                x: 152,
                y: footerY + 17,
                width: 780,
                height: 24,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#ffffff',
                letterSpacing: 2.6,
            }),
        ],
    };
}

function buildTwitterX(content: TemplateContent, slideH: number): TemplateScene {
    // Real Twitter/X post look: white background, the profile header rendered by
    // the slide's "tweet"-style ProfileBadge (avatar + name + verified + @handle),
    // then the tweet body, and a media card at the bottom. Content roles map to:
    //   title    → main tweet paragraph(s)   (regular weight, dark)
    //   subtitle → emphasized line            (bold, dark — e.g. "Zero vendas.")
    //   caption  → closing paragraph          (regular weight, dark)
    const pad = 72;
    const contentW = SLIDE_W - pad * 2;
    const dark = '#0f1419';
    const bodyFont = 'Albert Sans';
    const bodySize = Math.max(30, Math.round(slideH * 0.031));
    const lineHeight = 1.45;

    const headerY = Math.round(slideH * 0.065);

    const titleY = Math.round(slideH * 0.185);
    const titleH = Math.round(slideH * 0.185);
    const subtitleY = titleY + titleH;
    const subtitleH = Math.round(slideH * 0.05);
    const captionY = subtitleY + subtitleH + Math.round(slideH * 0.012);
    const captionH = Math.round(slideH * 0.10);

    const imageX = 96;
    const imageW = SLIDE_W - imageX * 2;
    const imageY = captionY + captionH + Math.round(slideH * 0.01);
    const imageH = slideH - imageY - Math.round(slideH * 0.12);

    return {
        background: '#ffffff',
        badgeX: pad,
        badgeY: headerY,
        badgeStyle: 'tweet',
        elements: [
            createText({
                x: pad,
                y: titleY,
                width: contentW,
                height: titleH,
                text: content.title,
                fontFamily: bodyFont,
                fontSize: bodySize,
                fontStyle: '400',
                fill: dark,
                lineHeight,
            }),
            createText({
                x: pad,
                y: subtitleY,
                width: contentW,
                height: subtitleH,
                text: content.subtitle,
                fontFamily: bodyFont,
                fontSize: bodySize,
                fontStyle: '700',
                fill: dark,
                lineHeight,
            }),
            createText({
                x: pad,
                y: captionY,
                width: contentW,
                height: captionH,
                text: content.caption,
                fontFamily: bodyFont,
                fontSize: bodySize,
                fontStyle: '400',
                fill: dark,
                lineHeight,
            }),
            createRect({
                type: 'rect',
                x: imageX,
                y: imageY,
                width: imageW,
                height: imageH,
                fill: '#15131f',
                cornerRadius: 28,
                shadowEnabled: true,
                shadowColor: '#94a3b8',
                shadowBlur: 22,
                shadowOffsetY: 10,
                shadowOffsetX: 0,
                shadowOpacity: 0.25,
            }),
        ],
    };
}

/**
 * Twitter/X scene for AI-generated slides. Renders each slide as a tweet: white
 * background, tweet body copy (no ALL-CAPS), reserving the top band for the
 * "tweet"-style ProfileBadge header (attached by the generator).
 *
 * With no media in the post, the title + description grow to fill the freed space
 * and sit tight together: the title is sized as large as it fits and the
 * description is placed flush below the title's real (measured) height — no big
 * fixed gap.
 */
function buildTwitterXFromLayout(
    content: TemplateContent & { stat?: string; ctaPill?: string },
    slideH: number,
): TemplateScene {
    const pad = 72;
    const contentW = SLIDE_W - pad * 2;
    const dark = '#0f1419';
    const font = 'Albert Sans';

    const headerY = Math.round(slideH * 0.065);
    const bodyTop = Math.round(slideH * 0.185);
    const blockBottom = slideH - Math.round(slideH * 0.09);

    const titleLs = -0.5;
    const titleLh = 1.3;
    const descLh = 1.4;
    const gap = Math.round(slideH * 0.022);

    const desc = content.description ?? content.caption;

    // Title: as large as it fits in up to ~60% of the body band, then measure its
    // real height so the description can sit directly beneath it.
    const titleMaxH = Math.round((blockBottom - bodyTop) * (desc ? 0.6 : 1));
    const titleSize = fitTextFontSize(content.title, font, '700', 84, titleLh, titleLs, contentW, titleMaxH, 0);
    const titleH = measuredTextHeight(content.title, font, '700', titleSize, titleLh, titleLs, contentW);

    const elements: SlideEl[] = [
        createText({
            x: pad,
            y: bodyTop,
            width: contentW,
            height: titleH,
            text: content.title,
            fontFamily: font,
            fontSize: titleSize,
            fontStyle: '700',
            fill: dark,
            lineHeight: titleLh,
            letterSpacing: titleLs,
        }),
    ];

    if (desc) {
        const descY = bodyTop + titleH + gap;
        const descMaxH = Math.max(60, blockBottom - descY);
        const descSize = fitTextFontSize(desc, font, '400', 56, descLh, 0, contentW, descMaxH, 0);
        elements.push(createText({
            x: pad,
            y: descY,
            width: contentW,
            height: descMaxH,
            text: desc,
            fontFamily: font,
            fontSize: descSize,
            fill: dark,
            lineHeight: descLh,
        }));
    }

    return { background: '#ffffff', elements, badgeStyle: 'tweet', badgeX: pad, badgeY: headerY };
}

function buildAcidBrutalist(content: TemplateContent, slideH: number): TemplateScene {
    const titleY = slideH > 1400 ? 360 : 230;
    const badgeX = 90;
    const badgeY = titleY - 116;

    return {
        background: '#050505',
        badgeX,
        badgeY,
        elements: [
            createRect({
                type: 'rect',
                x: 56,
                y: 58,
                width: 968,
                height: slideH - 116,
                fill: 'rgba(0,0,0,0)',
                stroke: '#39FF14',
                strokeWidth: 4,
                cornerRadius: 20,
            }),
            createRect({
                type: 'rect',
                x: 784,
                y: 76,
                width: 180,
                height: 66,
                fill: '#ff5a1f',
                rotation: -4,
            }),
            createText({
                x: 806,
                y: 94,
                width: 138,
                height: 32,
                text: 'RAW',
                fontFamily: 'Montserrat',
                fontSize: 28,
                fontStyle: '800',
                fill: '#050505',
                align: 'center',
                rotation: -4,
            }),
            createText({
                x: 96,
                y: 98,
                width: 440,
                height: 30,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#39FF14',
                letterSpacing: 4,
            }),
            createText({
                x: 90,
                y: titleY,
                width: 860,
                height: slideH > 1400 ? 420 : 280,
                text: content.title.toUpperCase(),
                fontFamily: 'Montserrat',
                fontSize: slideH > 1400 ? 132 : 110,
                fontStyle: '900',
                fill: 'rgba(0,0,0,0)',
                stroke: '#39FF14',
                strokeWidth: 1.5,
                lineHeight: 0.9,
                letterSpacing: -1.8,
            }),
            createText({
                x: 96,
                y: titleY + (slideH > 1400 ? 356 : 236),
                width: 720,
                height: 80,
                text: content.subtitle.toUpperCase(),
                fontFamily: 'Montserrat',
                fontSize: slideH > 1400 ? 38 : 30,
                fontStyle: '800',
                fill: '#f8fafc',
                letterSpacing: 1.2,
            }),
            createRect({
                type: 'rect',
                x: 96,
                y: titleY + (slideH > 1400 ? 438 : 300),
                width: 380,
                height: 20,
                fill: '#39FF14',
            }),
            createText({
                x: 920,
                y: Math.round(slideH * 0.5),
                width: 180,
                height: 30,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 16,
                fontStyle: '700',
                fill: '#ff5a1f',
                rotation: 90,
                align: 'center',
                letterSpacing: 4,
            }),
            createRect({
                type: 'circle',
                x: 702,
                y: slideH - 286,
                width: 210,
                height: 210,
                fill: 'rgba(57,255,20,0.12)',
                stroke: '#39FF14',
                strokeWidth: 3,
            }),
        ],
    };
}

function buildDocumentary(content: TemplateContent, slideH: number): TemplateScene {
    const frameY = Math.round(slideH * 0.18);
    const frameH = Math.round(slideH * 0.56);
    const badgeX = 144;
    const badgeY = frameY - 34;

    return {
        background: '#1a1108',
        badgeX,
        badgeY,
        elements: [
            createRect({
                type: 'rect',
                x: 72,
                y: 72,
                width: 936,
                height: slideH - 144,
                fill: 'rgba(255,255,255,0.02)',
                stroke: 'rgba(240,232,216,0.10)',
                strokeWidth: 2,
                cornerRadius: 12,
            }),
            createText({
                x: 104,
                y: 100,
                width: 380,
                height: 26,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#9a8866',
                letterSpacing: 4,
            }),
            createRect({
                type: 'rect',
                x: 96,
                y: frameY,
                width: 888,
                height: frameH,
                fill: '#24160c',
                stroke: 'rgba(240,232,216,0.18)',
                strokeWidth: 2,
                cornerRadius: 8,
            }),
            createRect({
                type: 'rect',
                x: 132,
                y: frameY + 38,
                width: 816,
                height: frameH - 76,
                fill: 'rgba(240,232,216,0.04)',
                stroke: 'rgba(240,232,216,0.08)',
                strokeWidth: 1,
            }),
            createRect({
                type: 'rect',
                x: 720,
                y: frameY - 26,
                width: 200,
                height: 54,
                fill: 'rgba(0,0,0,0)',
                stroke: '#b45309',
                strokeWidth: 2,
                rotation: -5,
            }),
            createText({
                x: 736,
                y: frameY - 10,
                width: 170,
                height: 24,
                text: 'ARCHIVE',
                fontFamily: 'Inter',
                fontSize: 20,
                fontStyle: '800',
                fill: '#b45309',
                align: 'center',
                rotation: -5,
                letterSpacing: 2,
            }),
            createText({
                x: 144,
                y: frameY + 82,
                width: 690,
                height: slideH > 1400 ? 320 : 220,
                text: content.title,
                fontFamily: 'Playfair Display',
                fontSize: slideH > 1400 ? 102 : 78,
                fontStyle: '700',
                fill: '#f0e8d8',
                lineHeight: 1.04,
            }),
            createText({
                x: 148,
                y: frameY + (slideH > 1400 ? 438 : 316),
                width: 648,
                height: 90,
                text: content.subtitle,
                fontFamily: 'Playfair Display',
                fontSize: slideH > 1400 ? 34 : 27,
                fill: 'rgba(240,232,216,0.72)',
                fontStyle: 'italic',
                lineHeight: 1.3,
            }),
            createRect({
                type: 'rect',
                x: 106,
                y: slideH - 120,
                width: 868,
                height: 2,
                fill: 'rgba(240,232,216,0.14)',
            }),
            createText({
                x: 108,
                y: slideH - 100,
                width: 860,
                height: 26,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 16,
                fontStyle: '600',
                fill: '#9a8866',
                letterSpacing: 3,
            }),
        ],
    };
}

/** Fallback ticket color when no workspace brand color is available. */
export const TICKET_DEFAULT_BRAND = '#F0531C';

function buildTicket(content: TemplateContent, slideH: number): TemplateScene {
    const rect = ticketRect(slideH);
    const innerX = rect.x + 90;
    const innerW = rect.width - 180;
    const titleY = Math.round(slideH * 0.34);
    const titleFontSize = fitTextFontSize(content.title, 'Fraunces', '600', 124, 1.02, -1, innerW, Math.round(slideH * 0.4), 8);

    return {
        background: '#000000',
        elements: [
            createTicketShape(slideH, TICKET_DEFAULT_BRAND),
            createText({
                x: innerX,
                y: titleY,
                width: innerW,
                height: Math.round(slideH * 0.42),
                text: content.title,
                fontFamily: 'Fraunces',
                fontSize: titleFontSize,
                fontStyle: '600',
                fill: '#111111',
                lineHeight: 1.02,
                letterSpacing: -1,
            }),
            createText({
                x: innerX,
                y: titleY + Math.round(slideH * 0.44),
                width: innerW,
                height: 90,
                text: content.subtitle,
                fontFamily: 'Fraunces',
                fontSize: 44,
                fontStyle: '500',
                fill: '#111111',
                lineHeight: 1.2,
            }),
        ],
    };
}

// ─── Template definitions ────────────────────────────────────────────────────

export const SLIDE_TEMPLATES: SlideTemplate[] = [
    {
        id: 'noir-manifesto',
        name: 'Noir Manifesto',
        description: 'Full-bleed dark cover with gradient overlay and ALL CAPS impact title. Inner slides with orange accent bars and bold editorial typography.',
        background: '#090909',
        backgroundAlt: '#0f0f14',
        textColor: '#ffffff',
        accentColor: '#E8440A',
        font: 'Anton',
        bodyFont: 'Inter',
        captionFont: 'Inter',
        fontStyle: '',
        letterSpacing: 1,
        align: 'left',
        fonts: ['Anton', 'Inter'],
        buildScene: buildNoirManifesto,
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // Decorations removed for now — focusing on typography + imaging.
            return buildSceneFromLayoutGeneric(this as SlideTemplate, content, layout, slideH, slideIndex, contentBand);
        },
    },
    {
        id: 'dark-cards',
        name: 'Dark Cards',
        description: 'Full-bleed cover photo with centered title. Inner slides with rounded image cards on a black background.',
        background: '#000000',
        backgroundAlt: '#000000',
        textColor: '#ffffff',
        accentColor: '#2563eb',
        font: 'Poppins',
        bodyFont: 'Inter',
        captionFont: 'Inter',
        fontStyle: 'bold',
        letterSpacing: 0,
        align: 'center',
        fonts: ['Poppins', 'Inter'],
        buildScene: buildDarkCards,
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // For inner-slide layouts, shift the title element down so it doesn't crowd the top edge
            const titleShiftLayouts: string[] = ['standard', 'split_text'];
            const modifiedLayout = titleShiftLayouts.includes(layout.type)
                ? {
                    ...layout,
                    title: {
                        ...layout.title,
                        y: layout.title.y + 0.10,
                        height: Math.max(0.1, layout.title.height - 0.10),
                    },
                }
                : layout;

            // Decorations removed for now — focusing on typography + imaging.
            const scene = buildSceneFromLayoutGeneric(this as SlideTemplate, content, modifiedLayout, slideH, slideIndex, contentBand);
            // Dark Cards sits on a pure black background, so the standalone darkening
            // gradient just paints a visible navy block — drop it. Background-image
            // slides still get their own image overlay from the generator.
            scene.elements = scene.elements.filter((el) => el.type !== 'gradient');
            return scene;
        },
    },
    {
        id: 'pop-magazine',
        name: 'Pop Magazine',
        description: 'Bold magazine cover with giant Anton title and red left bar. Inner slides with oversized typography and pop color accent strips.',
        background: '#fff8f1',
        backgroundAlt: '#fff0e6',
        textColor: '#111111',
        textColorAlt: '#111111',
        accentColor: '#E8120A',
        font: 'Anton',
        bodyFont: 'Inter',
        captionFont: 'Inter',
        fontStyle: '',
        letterSpacing: 0,
        align: 'left',
        fonts: ['Anton', 'Inter'],
        buildScene: buildPopMagazine,
        defaultBadgeStyle: 'solid',
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // Decorations removed for now — focusing on typography + imaging.
            return buildSceneFromLayoutGeneric(this as SlideTemplate, content, layout, slideH, slideIndex, contentBand);
        },
    },
    {
        id: 'twitter-x',
        name: 'Twitter/X Style',
        description: 'Authentic Twitter/X post: white background with a profile header (avatar, name, verified badge, @handle), tweet body copy, and a media card. Uses the Chirp-like Albert Sans typeface.',
        background: '#ffffff',
        backgroundAlt: '#ffffff',
        textColor: '#0f1419',
        textColorAlt: '#0f1419',
        accentColor: '#1d9bf0',
        font: 'Albert Sans',
        bodyFont: 'Albert Sans',
        captionFont: 'Albert Sans',
        fontStyle: 'bold',
        letterSpacing: -0.2,
        align: 'left',
        fonts: ['Albert Sans'],
        buildScene: buildTwitterX,
        buildSceneFromLayout(content, _layout, slideH) {
            // Tweet-specific layout: profile header + body copy (no ALL-CAPS grid).
            return buildTwitterXFromLayout(content, slideH);
        },
    },
    {
        id: 'acid-brutalist',
        name: 'Acid Brutalist',
        description: 'Black cover with neon green outlined title and brutalist border frame. Inner slides with acid-green accents on dark backgrounds.',
        background: '#050505',
        backgroundAlt: '#0a0a0a',
        textColor: '#ffffff',
        accentColor: '#39FF14',
        font: 'Montserrat',
        bodyFont: 'Inter',
        captionFont: 'Inter',
        fontStyle: 'bold',
        letterSpacing: -2,
        align: 'left',
        fonts: ['Montserrat', 'Inter'],
        buildScene: buildAcidBrutalist,
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // Decorations removed for now — focusing on typography + imaging.
            return buildSceneFromLayoutGeneric(this as SlideTemplate, content, layout, slideH, slideIndex, contentBand);
        },
    },
    {
        id: 'documentary',
        name: 'Documentary',
        description: 'Vintage investigative journalism cover with Playfair serif and archive stamp. Inner slides with sepia tones, editorial frames, and caption strips.',
        background: '#1a1108',
        backgroundAlt: '#1a1108',
        textColor: '#f0e8d8',
        textColorAlt: '#f0e8d8',
        accentColor: '#b45309',
        font: 'Playfair Display',
        bodyFont: 'Inter',
        captionFont: 'Inter',
        fontStyle: '',
        letterSpacing: 0,
        align: 'left',
        fonts: ['Playfair Display', 'Inter'],
        buildScene: buildDocumentary,
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // Decorations removed for now — focusing on typography + imaging.
            return buildSceneFromLayoutGeneric(this as SlideTemplate, content, layout, slideH, slideIndex, contentBand);
        },
    },
    {
        id: 'ticket',
        name: 'Ticket',
        description: 'Editorial ticket: an aesthetic serif headline on a die-cut ticket shape. The cover ticket uses your workspace brand color; inner tickets are white. Corners carry the deck title, slide number, handle and logo.',
        // Black canvas — the ticket shape sits on top and its notches reveal this.
        background: '#000000',
        backgroundAlt: '#000000',
        // Headline/body are dark, reading on the brand/white ticket surface.
        textColor: '#111111',
        textColorAlt: '#111111',
        accentColor: TICKET_DEFAULT_BRAND,
        font: 'Fraunces',
        bodyFont: 'Fraunces',
        captionFont: 'Space Mono',
        fontStyle: '600',
        letterSpacing: -1,
        align: 'left',
        fonts: ['Fraunces', 'Space Mono'],
        uppercaseTitle: false,
        buildScene: buildTicket,
        buildSceneFromLayout(content, layout, slideH, slideIndex, _totalSlides, contentBand) {
            // Lay out the serif title/body; the ticket shape, logo and corners are
            // attached by the generator (they depend on the workspace brand + handle).
            const scene = buildSceneFromLayoutGeneric(this as SlideTemplate, content, layout, slideH, slideIndex, contentBand);
            // No darkening gradient — the ticket is a flat surface.
            scene.elements = scene.elements.filter((el) => el.type !== 'gradient');
            return scene;
        },
    },
];

export function TemplatePreview({ id }: { id: string }) {
    const { t } = useTranslation();
    switch (id) {
        case 'noir-manifesto':
            return (
                <div className="relative w-full h-full flex flex-col justify-end p-2"
                    style={{ background: 'linear-gradient(155deg, #1a1a2e 0%, #0d0d0d 60%)' }}>
                    <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 40%, transparent)' }} />
                    <div className="relative z-10 space-y-0.5" style={{ textAlign: 'left' }}>
                        <div className="h-0.5 w-4 rounded mb-1" style={{ background: '#E8440A' }} />
                        <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.title')}</div>
                        <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.subtitle')}</div>
                    </div>
                </div>
            );
        case 'dark-cards':
            return (
                <div className="w-full h-full flex items-center justify-center"
                    style={{ background: '#000000' }}>
                    <div className="rounded-lg overflow-hidden" style={{ width: '80%', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-center" style={{ height: 36, background: 'linear-gradient(135deg, #374151, #1f2937)' }}>
                            <div className="rounded-full px-2 py-0.5" style={{ background: '#2563eb' }}>
                                <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 4.5, fontWeight: 700, color: '#eff6ff', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' }}>
                                    {t('slideEditor.elements.investigation')}
                                </div>
                            </div>
                        </div>
                        <div className="p-1.5" style={{ background: '#1f2937', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Poppins, Arial, sans-serif', fontSize: 8, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }}>
                                {t('slideEditor.elements.title')}
                            </div>
                            <div style={{ fontSize: 4.5, color: 'rgba(255,255,255,0.72)', marginTop: 3, lineHeight: 1.25 }}>
                                {t('slideEditor.elements.subtitle')}
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'pop-magazine':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2 py-2" style={{ background: '#fff' }}>
                    <div className="flex items-stretch gap-1.5">
                        <div className="w-1 rounded-full shrink-0" style={{ background: '#E8120A' }} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.title')}</div>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.big')}</div>
                            <div style={{ fontSize: 5, color: '#666', marginTop: 3 }}>{t('slideEditor.elements.subtitleHere')}</div>
                        </div>
                    </div>
                </div>
            );
        case 'twitter-x':
            return (
                <div className="w-full h-full flex flex-col px-2 py-2" style={{ background: '#fff', textAlign: 'left', fontFamily: 'Albert Sans, Arial, sans-serif' }}>
                    {/* Profile header */}
                    <div className="flex items-center gap-1 mb-1.5">
                        <div className="rounded-full shrink-0" style={{ width: 12, height: 12, background: '#cbd5e1' }} />
                        <div>
                            <div className="flex items-center gap-0.5">
                                <div style={{ fontSize: 5.5, fontWeight: 700, color: '#0f1419', lineHeight: 1 }}>{t('slideEditor.elements.title')}</div>
                                <div className="rounded-full" style={{ width: 4, height: 4, background: '#1d9bf0' }} />
                            </div>
                            <div style={{ fontSize: 4.5, color: '#536471', lineHeight: 1.1 }}>@handle</div>
                        </div>
                    </div>
                    {/* Tweet body */}
                    <div style={{ fontSize: 5, color: '#0f1419', lineHeight: 1.35 }}>{t('slideEditor.elements.largeText')}</div>
                    <div style={{ fontSize: 5, fontWeight: 700, color: '#0f1419', lineHeight: 1.35, margin: '2px 0' }}>{t('slideEditor.elements.cleanHere')}</div>
                    {/* Media card */}
                    <div className="rounded-md mt-auto" style={{ width: '100%', height: '34%', background: '#15131f' }} />
                </div>
            );
        case 'acid-brutalist':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2" style={{ background: '#000', textAlign: 'left' }}>
                    <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 11, fontWeight: 900, color: 'transparent', WebkitTextStroke: '0.5px #39FF14', textTransform: 'uppercase', lineHeight: 1 } as React.CSSProperties}>{t('slideEditor.elements.brutal')}</div>
                    <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 11, fontWeight: 900, color: '#39FF14', textTransform: 'uppercase', lineHeight: 1 }}>{t('slideEditor.elements.style')}</div>
                    <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.subtitle')}</div>
                </div>
            );
        case 'documentary':
            return (
                <div className="relative w-full h-full flex flex-col justify-end px-2 py-2" style={{ background: '#1a1108' }}>
                    <div className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px)' }} />
                    <div className="relative z-10" style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 5, color: '#9a8866', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{t('slideEditor.elements.investigation')}</div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, fontWeight: 700, color: '#f0e8d8', lineHeight: 1.2 }}>{t('slideEditor.elements.slideTitle')}</div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 5, color: 'rgba(240,232,216,0.5)', marginTop: 2, fontStyle: 'italic' }}>{t('slideEditor.elements.subtitle')}</div>
                    </div>
                </div>
            );
        case 'ticket':
            return (
                <div className="relative w-full h-full flex items-center justify-center" style={{ background: '#000' }}>
                    {/* Ticket surface with top/bottom centre notches */}
                    <div className="relative" style={{ width: '84%', height: '88%', background: TICKET_DEFAULT_BRAND, borderRadius: 8 }}>
                        <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#000', top: -6, left: '50%', transform: 'translateX(-50%)' }} />
                        <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#000', bottom: -6, left: '50%', transform: 'translateX(-50%)' }} />
                        <div className="absolute" style={{ left: '12%', top: '24%', right: '12%' }}>
                            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.02, letterSpacing: -0.5 }}>{t('slideEditor.elements.title')}</div>
                        </div>
                    </div>
                </div>
            );
        default:
            return <div className="w-full h-full" style={{ background: '#f3f4f6' }} />;
    }
}
