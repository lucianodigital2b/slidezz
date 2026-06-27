import { SLIDE_W } from './types';

export type LayoutType =
    | 'hook_hero'
    | 'standard'
    | 'stat_callout'
    | 'split_text'
    | 'quote_block'
    | 'cta_closing';

export interface LayoutSlot {
    x: number;
    y: number;
    width: number;
    height: number;
    align: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    maxFontSize: number;
    fontRole: 'display' | 'body' | 'caption';
    fontStyleHint: 'bold' | 'italic' | 'normal' | 'black';
    lineHeight: number;
    letterSpacing: number;
    visible: boolean;
    opacity: number;
}

export interface LayoutDefinition {
    type: LayoutType;
    title: LayoutSlot;
    subtitle: LayoutSlot;
    description: LayoutSlot;
    stat?: LayoutSlot;
    pill?: {
        y: number;
        align: 'left' | 'center' | 'right';
    };
    backgroundPreference: 'image' | 'solid' | 'either';
    gradientIntensity: number;
    imageCardPosition: 'top' | 'bottom';
    /**
     * Where the title+body group sits vertically. 'bottom' anchors the block to the
     * bottom of the safe area (over the bottom gradient) instead of letting it float
     * from the top. Defaults to 'top'.
     */
    contentAnchor?: 'top' | 'bottom';
}

const HOOK_HERO: LayoutDefinition = {
    type: 'hook_hero',
    title: {
        x: 0, y: 0.36, width: 1, height: 0.36,
        align: 'left', verticalAlign: 'bottom',
        maxFontSize: 132, fontRole: 'display', fontStyleHint: 'black',
        lineHeight: 1.0, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0.01, y: 0.73, width: 0.94, height: 0.23,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.35, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'image',
    gradientIntensity: 0.85,
    imageCardPosition: 'top',
};

const STANDARD: LayoutDefinition = {
    type: 'standard',
    contentAnchor: 'bottom',
    title: {
        x: 0, y: 0.12, width: 1, height: 0.28,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 96, fontRole: 'display', fontStyleHint: 'bold',
        lineHeight: 1.15, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0.42, width: 1, height: 0.1,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 36, fontRole: 'body', fontStyleHint: 'bold',
        lineHeight: 1.25, letterSpacing: 0, visible: true, opacity: 0.8,
    },
    description: {
        x: 0.02, y: 0.53, width: 0.92, height: 0.43,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'either',
    gradientIntensity: 0.7,
    imageCardPosition: 'bottom',
};

const STAT_CALLOUT: LayoutDefinition = {
    type: 'stat_callout',
    stat: {
        x: 0, y: 0.2, width: 1, height: 0.35,
        align: 'center', verticalAlign: 'middle',
        maxFontSize: 200, fontRole: 'display', fontStyleHint: 'black',
        lineHeight: 1.05, letterSpacing: -2, visible: true, opacity: 1,
    },
    title: {
        x: 0, y: 0.08, width: 1, height: 0.12,
        align: 'center', verticalAlign: 'bottom',
        maxFontSize: 28, fontRole: 'caption', fontStyleHint: 'bold',
        lineHeight: 1.2, letterSpacing: 3, visible: true, opacity: 0.6,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0.06, y: 0.57, width: 0.88, height: 0.39,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.4,
    imageCardPosition: 'bottom',
};

const SPLIT_TEXT: LayoutDefinition = {
    type: 'split_text',
    contentAnchor: 'bottom',
    title: {
        x: 0, y: 0.05, width: 1, height: 0.5,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 110, fontRole: 'display', fontStyleHint: 'bold',
        lineHeight: 1.15, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0, y: 0.56, width: 0.92, height: 0.4,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'either',
    gradientIntensity: 0.7,
    imageCardPosition: 'bottom',
};

const QUOTE_BLOCK: LayoutDefinition = {
    type: 'quote_block',
    contentAnchor: 'bottom',
    title: {
        x: 0.05, y: 0.12, width: 0.9, height: 0.4,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 110, fontRole: 'display', fontStyleHint: 'bold',
        lineHeight: 1.15, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0.05, y: 0.53, width: 0.9, height: 0.06,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 22, fontRole: 'caption', fontStyleHint: 'bold',
        lineHeight: 1.2, letterSpacing: 2, visible: true, opacity: 0.5,
    },
    description: {
        x: 0.05, y: 0.58, width: 0.9, height: 0.38,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.3,
    imageCardPosition: 'top',
};

const CTA_CLOSING: LayoutDefinition = {
    type: 'cta_closing',
    title: {
        x: 0, y: 0.2, width: 1, height: 0.3,
        align: 'center', verticalAlign: 'middle',
        maxFontSize: 120, fontRole: 'display', fontStyleHint: 'black',
        lineHeight: 1.15, letterSpacing: 1, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0.52, width: 1, height: 0.08,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 22, fontRole: 'caption', fontStyleHint: 'bold',
        lineHeight: 1.2, letterSpacing: 4, visible: true, opacity: 0.55,
    },
    description: {
        x: 0.08, y: 0.6, width: 0.84, height: 0.36,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 44, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.8,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.5,
    imageCardPosition: 'top',
};

export interface LayoutBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * The content safe area for a slide of height `slideH`: the band that stays
 * visible inside the Instagram profile-grid 1:1 centre crop, plus side padding.
 * Single source of truth shared by the scene builder and the layout selector so
 * a measured font size matches what is actually rendered.
 */
export function computeSafeArea(slideH: number): LayoutBox {
    const gridCropInset = Math.max(0, Math.round((slideH - SLIDE_W) / 2));
    const topPad = gridCropInset + 45;
    // Lateral safe zone, tripled and standardized symmetrically to ~168px (the
    // competitor reference). Drives both layout placement and text fitting, and is
    // kept in sync with SAFE_AREA_PADDINGS (the editor's safe-area guide).
    const pad = 168;

    return {
        x: pad,
        y: topPad,
        width: SLIDE_W - pad * 2,
        height: slideH - topPad * 2,
    };
}

/** Resolve a layout slot's fractional rect to an absolute box for `slideH`. */
export function slotToBox(slot: LayoutSlot, slideH: number): LayoutBox {
    const safe = computeSafeArea(slideH);

    return {
        x: Math.round(safe.x + slot.x * safe.width),
        y: Math.round(safe.y + slot.y * safe.height),
        width: Math.round(slot.width * safe.width),
        height: Math.round(slot.height * safe.height),
    };
}

export const LAYOUT_DEFINITIONS: Record<LayoutType, LayoutDefinition> = {
    hook_hero: HOOK_HERO,
    standard: STANDARD,
    stat_callout: STAT_CALLOUT,
    split_text: SPLIT_TEXT,
    quote_block: QUOTE_BLOCK,
    cta_closing: CTA_CLOSING,
};

/**
 * The content shape of a single slide, used to pick the layout that best fits
 * that slide's actual title/description/stat rather than a fixed rotation.
 */
export interface SlideContentShape {
    title: string;
    description?: string;
    hasStat?: boolean;
    // True when this slide will carry a generated image. Solid-background layouts
    // discard the image (see the scene builder), so image slides must avoid them.
    hasImage?: boolean;
}

export type SlidePosition = 'cover' | 'middle' | 'closing';

// Character thresholds that classify a title/description as short / long. Tuned
// for IG carousel copy (a few words of headline, a sentence or two of body).
const TITLE_SHORT_CHARS = 24;
const TITLE_LONG_CHARS = 60;
const DESC_LONG_CHARS = 160;

function textLength(value?: string): number {
    return (value ?? '').trim().length;
}

/**
 * Pick the layout that best fits a single slide's content. The cover and closing
 * slides are fixed (hook_hero / cta_closing); middle slides are chosen from the
 * typographic pool based on how much title and body copy they carry.
 */
export function pickLayoutForSlide(content: SlideContentShape, position: SlidePosition): LayoutType {
    if (position === 'cover') {
        return 'hook_hero';
    }

    if (position === 'closing') {
        return 'cta_closing';
    }

    // A stat is the strongest signal: render it as the oversized callout number.
    if (content.hasStat) {
        return 'stat_callout';
    }

    const titleLen = textLength(content.title);
    const descLen = textLength(content.description);

    // No body copy → let the title carry the slide. A tight headline fills the
    // big split layout; a longer one reads better as a quote block — unless the
    // slide has an image, since quote_block's solid background would discard it.
    if (descLen === 0) {
        if (titleLen <= TITLE_SHORT_CHARS) {
            return 'split_text';
        }

        return content.hasImage ? 'split_text' : 'quote_block';
    }

    // Lots of body copy → a layout with a dedicated, roomy description band.
    if (descLen >= DESC_LONG_CHARS) {
        return 'standard';
    }

    // Short/medium body: a long title needs the stacked 'standard' header; a
    // tight title pairs well with the large split headline above the body.
    return titleLen >= TITLE_LONG_CHARS ? 'standard' : 'split_text';
}

/**
 * Measures the font size a title would render at inside a layout's title slot.
 * Injected by the caller (the browser builds it over fitTextFontSize with the
 * active template font + slide height) so this module stays free of canvas/DOM.
 */
export type TitleFitter = (text: string, slot: LayoutSlot) => number;

// Roomy title layouts considered when the heuristic pick crams the title.
const TITLE_LED_CANDIDATES: LayoutType[] = ['split_text', 'standard', 'quote_block'];
// A title is "cramped" when it must shrink below this fraction of its slot's max
// font size — i.e. it is overflowing and a roomier layout would read better.
const CRAMPED_TITLE_RATIO = 0.5;

/** A layout keeps a generated image (solid-background layouts discard it). */
function keepsImage(type: LayoutType): boolean {
    return LAYOUT_DEFINITIONS[type].backgroundPreference !== 'solid';
}

/**
 * Refine a title-led middle slide's layout using measurement: keep the heuristic
 * pick when its title reads at a comfortable size (preserving variety), otherwise
 * switch to whichever candidate renders the title largest (most legible).
 */
function refineTitleLedLayout(content: SlideContentShape, heuristicPick: LayoutType, fitTitle: TitleFitter): LayoutType {
    const cap = LAYOUT_DEFINITIONS[heuristicPick].title.maxFontSize;
    const heuristicSize = fitTitle(content.title, LAYOUT_DEFINITIONS[heuristicPick].title);

    if (heuristicSize >= cap * CRAMPED_TITLE_RATIO) {
        return heuristicPick;
    }

    let best = heuristicPick;
    let bestSize = heuristicSize;

    for (const type of TITLE_LED_CANDIDATES) {
        // Skip layouts that would discard this slide's image.
        if (content.hasImage && !keepsImage(type)) {
            continue;
        }

        const size = fitTitle(content.title, LAYOUT_DEFINITIONS[type].title);

        if (size > bestSize) {
            best = type;
            bestSize = size;
        }
    }

    return best;
}

// Fallback used to break up two identical middle layouts in a row (stat_callout
// is exempt — it is genuinely content-driven and shouldn't be substituted).
const MIDDLE_ALTERNATE: Record<LayoutType, LayoutType> = {
    standard: 'split_text',
    split_text: 'standard',
    quote_block: 'split_text',
    stat_callout: 'stat_callout',
    hook_hero: 'split_text',
    cta_closing: 'split_text',
};

/**
 * Build the per-slide layout sequence from the deck's actual content. Each slide
 * gets the layout that fits its copy (see {@link pickLayoutForSlide}), with a
 * variety guard so the same middle layout never repeats back-to-back.
 */
export function generateLayoutSequenceFromContent(slides: SlideContentShape[], fitTitle?: TitleFitter): LayoutType[] {
    const count = slides.length;

    if (count <= 1) {
        return ['hook_hero'];
    }

    if (count === 2) {
        return ['hook_hero', 'cta_closing'];
    }

    const sequence: LayoutType[] = [];
    let lastPicked: LayoutType | null = null;

    slides.forEach((slide, i) => {
        const position: SlidePosition = i === 0 ? 'cover' : i === count - 1 ? 'closing' : 'middle';
        let pick = pickLayoutForSlide(slide, position);

        // Measurement refinement: for title-led middle slides, swap to the layout
        // that renders the title largest when the heuristic pick crams it.
        if (position === 'middle' && fitTitle && !slide.hasStat && textLength(slide.description) < DESC_LONG_CHARS) {
            pick = refineTitleLedLayout(slide, pick, fitTitle);
        }

        if (position === 'middle' && pick === lastPicked && pick !== 'stat_callout') {
            pick = MIDDLE_ALTERNATE[pick];
        }

        sequence.push(pick);
        lastPicked = pick;
    });

    return sequence;
}
