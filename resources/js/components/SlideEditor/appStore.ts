/**
 * App Store / Google Play screenshot mode.
 *
 * Screenshots are authored on the regular 1080px-wide canvas (see FORMATS in
 * ./types) and upscaled to the exact store pixel size on export. This module
 * holds everything specific to that mode: the store export sizes, the store
 * locales a listing can ship in, the visual themes, and the builders that turn
 * an uploaded device screenshot + a caption into a slide.
 */
import type { Format, ImageEl, RichSpan, ShapeEl, Slide, SlideEl, StoreFormat, Store, TextEl, GradientEl } from './types';
import { FORMATS, SLIDE_W, storeOf } from './types';
import { SHADOW_DEFAULTS, fitTextFontSize, relativeLuminance, uid } from './utils';

// ─── Export sizes ─────────────────────────────────────────────────────────────

export interface ExportTarget {
    id: string;
    /** Shown in the export menu. */
    label: string;
    w: number;
    h: number;
    /** Folder name inside the exported ZIP. */
    folder: string;
}

/**
 * The pixel sizes each store accepts, in the order App Store Connect / Play
 * Console list them. The first entry of a format is the default export size.
 */
export const EXPORT_TARGETS: Record<StoreFormat, ExportTarget[]> = {
    appstore: [
        { id: 'iphone-6-9', label: 'iPhone 6.9" — 1320 × 2868', w: 1320, h: 2868, folder: 'iphone-6.9' },
        { id: 'iphone-6-7', label: 'iPhone 6.7" — 1290 × 2796', w: 1290, h: 2796, folder: 'iphone-6.7' },
        { id: 'iphone-6-5', label: 'iPhone 6.5" — 1242 × 2688', w: 1242, h: 2688, folder: 'iphone-6.5' },
        { id: 'iphone-5-5', label: 'iPhone 5.5" — 1242 × 2208', w: 1242, h: 2208, folder: 'iphone-5.5' },
    ],
    appstore_ipad: [
        { id: 'ipad-13', label: 'iPad 13" — 2064 × 2752', w: 2064, h: 2752, folder: 'ipad-13' },
        { id: 'ipad-12-9', label: 'iPad 12.9" — 2048 × 2732', w: 2048, h: 2732, folder: 'ipad-12.9' },
    ],
    playstore: [
        { id: 'play-phone', label: 'Telefone — 1080 × 1920', w: 1080, h: 1920, folder: 'phone' },
        { id: 'play-phone-hd', label: 'Telefone HD — 1440 × 2560', w: 1440, h: 2560, folder: 'phone-hd' },
        { id: 'play-tablet', label: 'Tablet — 1600 × 2560', w: 1600, h: 2560, folder: 'tablet' },
    ],
};

/** How many screenshots each store accepts per device size. */
export const MAX_SCREENSHOTS: Record<Store, number> = {
    appstore: 10,
    playstore: 8,
};

export interface ExportFit {
    /** Size the slide raster is drawn at, before it is placed on the store canvas. */
    w: number;
    h: number;
    /** Where that raster sits on the store canvas (negative = cropped off). */
    x: number;
    y: number;
    /** 'cover' trims a sliver off one side; 'contain' pads with the slide background. */
    mode: 'cover' | 'contain';
}

/** Above this much aspect drift, cropping would eat real content. */
const MAX_CROP_DRIFT = 0.02;

/**
 * Place the authoring canvas on a store size. None of the store sizes share the
 * canvas aspect exactly, so the slide is scaled and centred instead of stretched
 * — a stretched screenshot reads as visibly squashed next to the competition.
 * The usual drift is a couple of pixels and gets cropped; a size in a different
 * aspect altogether (the 16:9 5.5" iPhone) is letterboxed on the slide
 * background so nothing is cut off.
 */
export function fitSlideToTarget(canvasW: number, canvasH: number, targetW: number, targetH: number): ExportFit {
    const canvasAspect = canvasH / canvasW;
    const drift = Math.abs(targetH / targetW - canvasAspect) / canvasAspect;
    const mode = drift <= MAX_CROP_DRIFT ? 'cover' : 'contain';
    const scale = mode === 'cover'
        ? Math.max(targetW / canvasW, targetH / canvasH)
        : Math.min(targetW / canvasW, targetH / canvasH);
    const w = Math.round(canvasW * scale);
    const h = Math.round(canvasH * scale);

    return { w, h, x: Math.round((targetW - w) / 2), y: Math.round((targetH - h) / 2), mode };
}

export function exportTargetsFor(format: Format): ExportTarget[] {
    return format in EXPORT_TARGETS
        ? EXPORT_TARGETS[format as StoreFormat]
        : [{ id: 'native', label: `${FORMATS[format].w} × ${FORMATS[format].h}`, w: FORMATS[format].w, h: FORMATS[format].h, folder: '' }];
}

// ─── Store locales ────────────────────────────────────────────────────────────

export interface StoreLocale {
    /** App Store Connect locale code (also the id used in the localizations map). */
    code: string;
    /** Google Play locale code for the same market. */
    playCode: string;
    /** Native label shown in the picker. */
    label: string;
    /** Language name handed to the translation model. */
    language: string;
    /** Font family that covers the script (undefined = the design font is fine). */
    font?: string;
    rtl?: boolean;
}

/**
 * The locales worth shipping first: the App Store / Play markets that carry the
 * overwhelming majority of downloads, with the font needed to render each script.
 */
export const STORE_LOCALES: StoreLocale[] = [
    { code: 'en-US', playCode: 'en-US', label: 'English (US)', language: 'English (United States)' },
    { code: 'pt-BR', playCode: 'pt-BR', label: 'Português (BR)', language: 'Portuguese (Brazil)' },
    { code: 'es-ES', playCode: 'es-ES', label: 'Español (ES)', language: 'Spanish (Spain)' },
    { code: 'es-MX', playCode: 'es-419', label: 'Español (LatAm)', language: 'Spanish (Latin America)' },
    { code: 'fr-FR', playCode: 'fr-FR', label: 'Français', language: 'French' },
    { code: 'de-DE', playCode: 'de-DE', label: 'Deutsch', language: 'German' },
    { code: 'it', playCode: 'it-IT', label: 'Italiano', language: 'Italian' },
    { code: 'nl-NL', playCode: 'nl-NL', label: 'Nederlands', language: 'Dutch' },
    { code: 'pl', playCode: 'pl-PL', label: 'Polski', language: 'Polish' },
    { code: 'tr', playCode: 'tr-TR', label: 'Türkçe', language: 'Turkish' },
    { code: 'ru', playCode: 'ru-RU', label: 'Русский', language: 'Russian' },
    { code: 'uk', playCode: 'uk', label: 'Українська', language: 'Ukrainian' },
    { code: 'ja', playCode: 'ja-JP', label: '日本語', language: 'Japanese', font: 'Noto Sans JP' },
    { code: 'ko', playCode: 'ko-KR', label: '한국어', language: 'Korean', font: 'Noto Sans KR' },
    { code: 'zh-Hans', playCode: 'zh-CN', label: '简体中文', language: 'Simplified Chinese', font: 'Noto Sans SC' },
    { code: 'zh-Hant', playCode: 'zh-TW', label: '繁體中文', language: 'Traditional Chinese', font: 'Noto Sans TC' },
    { code: 'hi', playCode: 'hi-IN', label: 'हिन्दी', language: 'Hindi', font: 'Noto Sans Devanagari' },
    { code: 'th', playCode: 'th', label: 'ไทย', language: 'Thai', font: 'Noto Sans Thai' },
    { code: 'vi', playCode: 'vi', label: 'Tiếng Việt', language: 'Vietnamese' },
    { code: 'id', playCode: 'id', label: 'Bahasa Indonesia', language: 'Indonesian' },
    { code: 'ar-SA', playCode: 'ar', label: 'العربية', language: 'Arabic', font: 'Noto Sans Arabic', rtl: true },
    { code: 'he', playCode: 'iw-IL', label: 'עברית', language: 'Hebrew', font: 'Noto Sans Hebrew', rtl: true },
];

export function findLocale(code: string): StoreLocale | null {
    return STORE_LOCALES.find((locale) => locale.code === code) ?? null;
}

/** The folder name a locale gets inside the exported ZIP, per store. */
export function localeFolder(code: string, store: Store | null): string {
    const locale = findLocale(code);

    if (!locale) {
        return code;
    }

    return store === 'playstore' ? locale.playCode : locale.code;
}

// ─── Localizations ────────────────────────────────────────────────────────────

export interface LocalizedText {
    text: string;
    richText?: RichSpan[];
}

/** locale code → element id → translated copy. */
export type Localizations = Record<string, Record<string, LocalizedText>>;

/**
 * Apply a locale's translations to the slides for rendering. Text elements the
 * locale has no entry for keep the source copy, so a half-translated project
 * still renders.
 */
export function applyLocale(slides: Slide[], localizations: Localizations, locale: string | null): Slide[] {
    if (!locale) {
        return slides;
    }

    const entries = localizations[locale];

    if (!entries) {
        return slides;
    }

    const localeMeta = findLocale(locale);

    return slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((el) => {
            if (el.type !== 'text') {
                return el;
            }

            const translation = entries[el.id];

            if (!translation) {
                return el;
            }

            const next: TextEl = {
                ...el,
                text: translation.text,
                richText: translation.richText,
            };

            if (localeMeta?.font) {
                next.fontFamily = localeMeta.font;
            }

            if (localeMeta?.rtl && el.align === 'left') {
                next.align = 'right';
            }

            return next;
        }),
    }));
}

/** Every text element of a deck, in slide order — the strings to translate. */
export function collectTranslatableText(slides: Slide[]): { id: string; text: string; highlight: string; slideIndex: number }[] {
    const items: { id: string; text: string; highlight: string; slideIndex: number }[] = [];

    slides.forEach((slide, slideIndex) => {
        slide.elements.forEach((el) => {
            if (el.type !== 'text') {
                return;
            }

            if (el.text.trim() === '') {
                return;
            }

            items.push({
                id: el.id,
                text: el.text,
                highlight: highlightedSpan(el.richText),
                slideIndex,
            });
        });
    });

    return items;
}

/** The emphasized fragment of a rich-text run, if it has one. */
function highlightedSpan(richText: RichSpan[] | undefined): string {
    if (!richText) {
        return '';
    }

    return richText.find((span) => span.color || span.highlight)?.text.trim() ?? '';
}

/**
 * Rebuild the accent styling around the translated fragment so a localized
 * headline keeps the same emphasis as the source.
 */
export function buildRichText(text: string, highlight: string, accentColor: string): RichSpan[] | undefined {
    const fragment = highlight.trim();

    if (fragment === '') {
        return undefined;
    }

    const index = text.toLowerCase().indexOf(fragment.toLowerCase());

    if (index === -1) {
        return undefined;
    }

    const spans: RichSpan[] = [];
    const before = text.slice(0, index);
    const match = text.slice(index, index + fragment.length);
    const after = text.slice(index + fragment.length);

    if (before) {
        spans.push({ text: before });
    }

    spans.push({ text: match, color: accentColor });

    if (after) {
        spans.push({ text: after });
    }

    return spans;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export interface ScreenshotTheme {
    id: string;
    label: string;
    background: string;
    /** Optional soft gradient painted over the background. */
    gradient: string | null;
    text: string;
    accent: string;
    /** Device bezel color. */
    frame: string;
    /** True when the accent should come from the workspace brand color. */
    usesBrand?: boolean;
}

export const SCREENSHOT_THEMES: ScreenshotTheme[] = [
    { id: 'midnight', label: 'Midnight', background: '#0B0B12', gradient: '#1E1B4B', text: '#FFFFFF', accent: '#FFE156', frame: '#1B1B25' },
    { id: 'clean', label: 'Clean', background: '#FFFFFF', gradient: null, text: '#111111', accent: '#2563EB', frame: '#111111' },
    { id: 'mint', label: 'Mint', background: '#0F3D3E', gradient: '#0B6E4F', text: '#F2FFF9', accent: '#7CF5C4', frame: '#08282A' },
    { id: 'sunset', label: 'Sunset', background: '#2B0B3A', gradient: '#B7245C', text: '#FFF6FB', accent: '#FFB347', frame: '#1A0723' },
    { id: 'paper', label: 'Paper', background: '#F5F2EA', gradient: null, text: '#1A1A1A', accent: '#E2571E', frame: '#1A1A1A' },
    { id: 'brand', label: 'Marca', background: '#1A1A1A', gradient: null, text: '#FFFFFF', accent: '#FFE156', frame: '#101010', usesBrand: true },
];

export function resolveTheme(themeId: string, brand: { color: string | null; accent: string | null }): ScreenshotTheme {
    const theme = SCREENSHOT_THEMES.find((candidate) => candidate.id === themeId) ?? SCREENSHOT_THEMES[0];

    if (!theme.usesBrand) {
        return theme;
    }

    const background = brand.color ?? theme.background;
    // Keep the caption readable whatever the brand color turns out to be.
    const text = relativeLuminance(background) > 0.45 ? '#111111' : '#FFFFFF';

    return {
        ...theme,
        background,
        text,
        accent: brand.accent ?? theme.accent,
        frame: relativeLuminance(background) > 0.45 ? '#111111' : '#000000',
    };
}

// ─── Slide builder ────────────────────────────────────────────────────────────

export type ScreenshotLayout = 'caption_top' | 'caption_bottom' | 'alternate';

export interface ScreenshotCaption {
    headline: string;
    subheadline: string;
    highlight?: string;
}

export interface ScreenshotBuildOptions {
    format: StoreFormat;
    theme: ScreenshotTheme;
    layout: ScreenshotLayout;
    /** Headline / body font family (already loaded by the caller). */
    font?: string;
    /** Device mockup id — see DEVICE_FRAMES. */
    deviceFrame?: string;
}

// ─── Device frames ────────────────────────────────────────────────────────────

/**
 * The mockup a device shot sits in. A frame asset is transparent where the
 * screen goes, so the shot is drawn first and the frame laid over it.
 */
export interface DeviceFrame {
    id: string;
    label: string;
    /** Public asset with a cut-out screen, or null for the painted bezel. */
    src: string | null;
    /** Bezel thickness as a fraction of the frame's full width. */
    bezelRatio: number;
    /** Screen corner radius as a fraction of the frame's full width. */
    screenRadiusRatio: number;
    /**
     * A real device photo has its own proportions and an off-centre screen, so
     * those frames carry their measured geometry instead of being derived from a
     * single bezel: the frame's height and the screen box, both as fractions of
     * the frame's width.
     */
    frameAspect?: number;
    screenBox?: { x: number; y: number; w: number; h: number };
}

/**
 * The iPhone 14 Pro frame is exported from the "iPhone mockups" Figma community
 * file (Space Black, Dynamic Island) with its screen punched out, so the device
 * reads as the phone the App Store screenshots are sized for. `iphone-flat` is
 * the older generic frame from the MIT-licensed device frame in Adam Lyttle's
 * aso-appstore-screenshots skill.
 */
export const DEVICE_FRAMES: DeviceFrame[] = [
    {
        id: 'iphone-14-pro',
        label: 'iPhone 14 Pro',
        src: '/mockups/iphone-14-pro.png',
        bezelRatio: 87 / 1670,
        screenRadiusRatio: 210 / 1670,
        frameAspect: 3397 / 1670,
        screenBox: { x: 87 / 1670, y: 77 / 1670, w: 1494 / 1670, h: 3241 / 1670 },
    },
    { id: 'iphone', label: 'iPhone (genérico)', src: '/mockups/iphone.png', bezelRatio: 15 / 1030, screenRadiusRatio: 62 / 1030 },
    { id: 'flat', label: 'Bezel simples', src: null, bezelRatio: 0, screenRadiusRatio: 0 },
];

export function resolveDeviceFrame(id: string | undefined): DeviceFrame {
    return DEVICE_FRAMES.find((frame) => frame.id === id) ?? DEVICE_FRAMES[0];
}

const HEADLINE_FONT = 'Inter';

/** Aspect ratio (h / w) of a device screenshot, defaulting to a modern phone. */
export function imageAspect(src: string): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalHeight / img.naturalWidth || 2.1666);
        img.onerror = () => resolve(2.1666);
        img.src = src;
    });
}

/**
 * Build one store screenshot: a caption block and the uploaded device
 * screenshot inside a rounded bezel, bleeding off the opposite edge the way
 * store listings are composed.
 */
export function buildScreenshotSlide(
    caption: ScreenshotCaption,
    screenshotSrc: string | null,
    screenshotAspect: number,
    index: number,
    options: ScreenshotBuildOptions,
): Slide {
    const { format, theme, layout } = options;
    const font = options.font ?? HEADLINE_FONT;
    const slideH = FORMATS[format].h;
    const isTablet = format === 'appstore_ipad';
    const captionAtTop = layout === 'alternate' ? index % 2 === 0 : layout === 'caption_top';

    const pad = Math.round(SLIDE_W * 0.089);          // 96 on a 1080 canvas
    const contentW = SLIDE_W - pad * 2;
    const elements: SlideEl[] = [];

    if (theme.gradient) {
        const gradient: GradientEl = {
            id: uid(), type: 'gradient',
            x: 0, y: 0, width: SLIDE_W, height: slideH,
            rotation: 0, opacity: 0.9,
            color: theme.gradient,
            direction: captionAtTop ? 'bottom' : 'top',
            ...SHADOW_DEFAULTS,
        };
        elements.push(gradient);
    }

    // ── Caption block ────────────────────────────────────────────────────────
    const headlineTop = captionAtTop
        ? Math.round(slideH * (isTablet ? 0.07 : 0.075))
        : Math.round(slideH * (isTablet ? 0.60 : 0.63));

    const headlineMaxSize = Math.round(slideH * (isTablet ? 0.052 : 0.043));
    const headlineBoxH = Math.round(slideH * 0.14);
    const headlineSize = fitTextFontSize(
        caption.headline, font, '800', headlineMaxSize, 1.06, -1, contentW, headlineBoxH, 0,
    );

    const headline: TextEl = {
        id: uid(), type: 'text',
        x: pad, y: headlineTop, width: contentW, height: headlineBoxH,
        rotation: 0, opacity: 1,
        text: caption.headline,
        fontSize: headlineSize,
        fontFamily: font,
        fill: theme.text,
        fontStyle: '800',
        align: 'center', verticalAlign: 'top',
        lineHeight: 1.06, letterSpacing: -1, textDecoration: '',
        stroke: '#000000', strokeWidth: 0, padding: 0, wrap: 'word',
        accentEnabled: false, accentColor: theme.accent, accentThickness: 6, accentSide: 'left', accentGap: 12,
        richText: buildRichText(caption.headline, caption.highlight ?? '', theme.accent),
        ...SHADOW_DEFAULTS,
    };
    elements.push(headline);

    const subTop = headlineTop + Math.round(headlineSize * 1.06 * headlineLineCount(caption.headline, font, headlineSize, contentW)) + Math.round(slideH * 0.016);
    const subSize = Math.max(22, Math.round(headlineSize * 0.42));

    if (caption.subheadline.trim() !== '') {
        const subheadline: TextEl = {
            id: uid(), type: 'text',
            x: pad, y: subTop, width: contentW, height: Math.round(subSize * 3),
            rotation: 0, opacity: 0.78,
            text: caption.subheadline,
            fontSize: subSize,
            fontFamily: font,
            fill: theme.text,
            fontStyle: '500',
            align: 'center', verticalAlign: 'top',
            lineHeight: 1.35, letterSpacing: 0, textDecoration: '',
            stroke: '#000000', strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: theme.accent, accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        };
        elements.push(subheadline);
    }

    // ── Device ───────────────────────────────────────────────────────────────
    if (screenshotSrc) {
        const device = resolveDeviceFrame(options.deviceFrame);
        const frameW = Math.round(SLIDE_W * (isTablet ? 0.78 : 0.70));
        // The frame assets are cut for a modern phone screen. A squatter shot — an
        // old 16:9 phone, or a tablet — would stretch the bezel out of shape, so
        // those keep the painted one.
        const mockupSrc = !isTablet && screenshotAspect >= 2 ? device.src : null;
        const bezel = mockupSrc
            ? Math.round(frameW * device.bezelRatio)
            : Math.round(SLIDE_W * (isTablet ? 0.014 : 0.016));
        // A measured frame keeps its own proportions and screen box; the others
        // are sized from the shot outwards.
        const box = mockupSrc && device.screenBox && device.frameAspect ? device.screenBox : null;
        const screenW = box ? Math.round(frameW * box.w) : frameW - bezel * 2;
        const screenH = box
            ? Math.round(frameW * box.h)
            : Math.round(screenW * screenshotAspect);
        const frameH = box ? Math.round(frameW * device.frameAspect!) : screenH + bezel * 2;
        const frameX = Math.round((SLIDE_W - frameW) / 2);
        // The device bleeds off the edge opposite the caption, which is what makes a
        // store screenshot read as a device and not as a pasted rectangle.
        const frameY = captionAtTop
            ? Math.round(slideH * (isTablet ? 0.30 : 0.315))
            : Math.round(slideH * (isTablet ? 0.55 : 0.575)) - frameH;
        const outerRadius = Math.round(frameW * (isTablet ? 0.05 : 0.085));
        const screenRadius = mockupSrc
            ? Math.round(frameW * device.screenRadiusRatio)
            : Math.max(0, outerRadius - bezel);

        const screen: ImageEl = {
            id: uid(), type: 'image',
            src: screenshotSrc,
            x: frameX + (box ? Math.round(frameW * box.x) : bezel),
            y: frameY + (box ? Math.round(frameW * box.y) : bezel),
            width: screenW, height: screenH,
            rotation: 0, opacity: 1,
            cornerRadius: screenRadius,
            brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
            hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
            red: 255, green: 255, blue: 255,
            overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
            isBackground: false, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
            ...SHADOW_DEFAULTS,
        };

        if (mockupSrc) {
            // The shot goes down first; the frame's own shadow follows its alpha,
            // so the drop shadow reads as the device and not as a rectangle.
            elements.push(screen);

            const mockup: ImageEl = {
                ...screen,
                id: uid(),
                src: mockupSrc,
                x: frameX, y: frameY, width: frameW, height: frameH,
                cornerRadius: 0,
                shadowEnabled: true,
                shadowColor: '#000000',
                shadowBlur: 60,
                shadowOffsetX: 0,
                shadowOffsetY: 24,
                shadowOpacity: 0.35,
            };
            elements.push(mockup);
        } else {
            const frame: ShapeEl = {
                id: uid(), type: 'rect',
                x: frameX, y: frameY, width: frameW, height: frameH,
                rotation: 0, opacity: 1,
                fill: theme.frame,
                stroke: '#000000', strokeWidth: 0,
                cornerRadius: outerRadius,
                borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
                shadowEnabled: true,
                shadowColor: '#000000',
                shadowBlur: 60,
                shadowOffsetX: 0,
                shadowOffsetY: 24,
                shadowOpacity: 0.35,
            };
            elements.push(frame);
            elements.push(screen);
        }
    }

    return {
        id: uid(),
        background: theme.background,
        elements,
    };
}

/** Rough line count of a headline at a given size, used to place the subheadline. */
function headlineLineCount(text: string, font: string, fontSize: number, maxWidth: number): number {
    if (text.trim() === '') {
        return 0;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return 1;
    }

    ctx.font = `800 ${fontSize}px "${font}"`;

    let lines = 1;
    let width = 0;

    for (const word of text.split(/\s+/)) {
        const wordWidth = ctx.measureText(`${word} `).width;

        if (width + wordWidth > maxWidth && width > 0) {
            lines++;
            width = wordWidth;
        } else {
            width += wordWidth;
        }
    }

    return lines;
}

/** The store a project's format ships to, for labels and folder naming. */
export function storeLabel(format: Format): string {
    return storeOf(format) === 'playstore' ? 'Google Play' : 'App Store';
}
