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
}

const HOOK_HERO: LayoutDefinition = {
    type: 'hook_hero',
    title: {
        x: 0, y: 0.36, width: 1, height: 0.36,
        align: 'left', verticalAlign: 'bottom',
        maxFontSize: 132, fontRole: 'display', fontStyleHint: 'black',
        lineHeight: 0.95, letterSpacing: 1, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0.01, y: 0.74, width: 0.94, height: 0.2,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 40, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.4, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'image',
    gradientIntensity: 0.85,
    imageCardPosition: 'top',
};

const STANDARD: LayoutDefinition = {
    type: 'standard',
    title: {
        x: 0, y: 0.12, width: 1, height: 0.28,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 96, fontRole: 'display', fontStyleHint: 'bold',
        lineHeight: 1.05, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0.42, width: 1, height: 0.1,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 36, fontRole: 'body', fontStyleHint: 'bold',
        lineHeight: 1.25, letterSpacing: 0, visible: true, opacity: 0.8,
    },
    description: {
        x: 0.02, y: 0.55, width: 0.92, height: 0.36,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 42, fontRole: 'body', fontStyleHint: 'normal',
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
        lineHeight: 1, letterSpacing: -2, visible: true, opacity: 1,
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
        x: 0.08, y: 0.58, width: 0.84, height: 0.3,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 38, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.4,
    imageCardPosition: 'bottom',
};

const SPLIT_TEXT: LayoutDefinition = {
    type: 'split_text',
    title: {
        x: 0, y: 0.05, width: 1, height: 0.5,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 110, fontRole: 'display', fontStyleHint: 'bold',
        lineHeight: 1.0, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0, y: 0.58, width: 0.9, height: 0.36,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 40, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.55, letterSpacing: 0, visible: true, opacity: 0.85,
    },
    backgroundPreference: 'either',
    gradientIntensity: 0.7,
    imageCardPosition: 'bottom',
};

const QUOTE_BLOCK: LayoutDefinition = {
    type: 'quote_block',
    title: {
        x: 0.05, y: 0.15, width: 0.9, height: 0.5,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 72, fontRole: 'display', fontStyleHint: 'italic',
        lineHeight: 1.2, letterSpacing: 0, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0.05, y: 0.7, width: 0.9, height: 0.08,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 22, fontRole: 'caption', fontStyleHint: 'bold',
        lineHeight: 1.2, letterSpacing: 2, visible: true, opacity: 0.5,
    },
    description: {
        x: 0.05, y: 0.8, width: 0.85, height: 0.14,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 34, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.4, letterSpacing: 0, visible: true, opacity: 0.8,
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
        lineHeight: 0.95, letterSpacing: 1, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0.52, width: 1, height: 0.08,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 22, fontRole: 'caption', fontStyleHint: 'bold',
        lineHeight: 1.2, letterSpacing: 4, visible: true, opacity: 0.55,
    },
    description: {
        x: 0.1, y: 0.62, width: 0.8, height: 0.28,
        align: 'center', verticalAlign: 'top',
        maxFontSize: 38, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.8,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.5,
    imageCardPosition: 'top',
};

export const LAYOUT_DEFINITIONS: Record<LayoutType, LayoutDefinition> = {
    hook_hero: HOOK_HERO,
    standard: STANDARD,
    stat_callout: STAT_CALLOUT,
    split_text: SPLIT_TEXT,
    quote_block: QUOTE_BLOCK,
    cta_closing: CTA_CLOSING,
};

const MIDDLE_POOL: LayoutType[] = ['standard', 'stat_callout', 'split_text', 'quote_block'];

export function generateLayoutSequence(slideCount: number, hasStats = true): LayoutType[] {
    if (slideCount <= 1) return ['hook_hero'];
    if (slideCount === 2) return ['hook_hero', 'cta_closing'];

    const middle: LayoutType[] = [];
    const middleCount = slideCount - 2;
    let lastPicked: LayoutType | null = null;

    const mustInclude: LayoutType[] = [];
    if (hasStats && middleCount >= 2) mustInclude.push('stat_callout');

    for (let i = 0; i < middleCount; i++) {
        const forced = mustInclude.shift();

        if (forced && forced !== lastPicked) {
            middle.push(forced);
            lastPicked = forced;
            continue;
        }

        const available = MIDDLE_POOL.filter(l => l !== lastPicked);
        const pick = available[i % available.length];
        middle.push(pick);
        lastPicked = pick;
    }

    return ['hook_hero', ...middle, 'cta_closing'];
}
