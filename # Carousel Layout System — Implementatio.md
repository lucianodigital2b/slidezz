# Carousel Layout System — Implementation Prompt

## Context

I have a carousel generator with this architecture:
- **Templates** (`templates.tsx`): Define visual skins — fonts, colors, shapes, `buildScene()` functions that position elements
- **AI Generation** (`useAiGeneration.ts`): Generates `SlideData` (title, subtitle, description, imagePrompt, highlightWords, highlightColor) and builds slides via `buildSlideFromData()`
- **Rendering**: React Konva canvas with `SlideEl` elements (TextEl, ShapeEl, GradientEl, ImageEl)

**Problem**: Every slide in a carousel uses the same template `buildScene()` with identical layout. Real high-performing carousels vary the layout per slide — slide 1 is a bold hook with minimal text, slide 3 is a stat callout, slide 5 is a CTA. The template skin stays consistent but the structural layout changes per slide.

**Goal**: Add a **layout system** that sits between the AI content and the template. Layouts define per-slide structural rules (which elements exist, their relative positions, sizes, emphasis). Templates apply their visual skin on top of each layout.

---

## Architecture

```
AI Content (SlideData) → Layout (structural rules per slide) → Template (visual skin) → SlideEl[]
```

### New type: `SlideLayout`

Each slide gets assigned a `layoutType` that determines its structural blueprint. The layout does NOT define colors, fonts, or decorative elements — those come from the template.

```typescript
// layouts.ts

export type LayoutType =
    | 'hook_hero'        // Slide 1: image bg, massive title bottom-aligned, no subtitle, minimal description, optional pill CTA
    | 'standard'         // Default: title + subtitle + description, balanced spacing
    | 'stat_callout'     // Big centered stat/number as hero, small title above, description below
    | 'split_text'       // Title takes 60% height, description takes 40%, no subtitle
    | 'quote_block'      // Large italic quote-style title with accent bar, attribution as subtitle
    | 'cta_closing';     // Imperative title, subtitle as CTA instruction, description as motivation

export interface LayoutSlot {
    // Relative positions as percentages of the safe area (0-1)
    // This allows layouts to be format-agnostic (carousel, stories, post)
    x: number;           // 0 = left edge of safe area, 1 = right edge
    y: number;           // 0 = top of safe area, 1 = bottom
    width: number;       // fraction of safe area width
    height: number;      // fraction of safe area height
    align: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    maxFontSize: number; // ceiling for fitTextFontSize
    fontRole: 'display' | 'body' | 'caption'; // template maps this to actual font
    fontStyleHint: 'bold' | 'italic' | 'normal' | 'black'; // hint, template can override
    lineHeight: number;
    letterSpacing: number;
    visible: boolean;    // false = this slot doesn't render for this layout
    opacity: number;     // 1.0 default, can dim secondary text
}

export interface LayoutDefinition {
    type: LayoutType;
    title: LayoutSlot;
    subtitle: LayoutSlot;
    description: LayoutSlot;
    stat?: LayoutSlot;               // only for stat_callout
    pill?: {                         // optional pill CTA element
        y: number;                   // relative Y position
        align: 'left' | 'center' | 'right';
    };
    backgroundPreference: 'image' | 'solid' | 'either'; // hint for image generation
    gradientIntensity: number;       // 0-1, how strong the overlay gradient should be
}

export interface CarouselLayoutSequence {
    layouts: LayoutType[];  // one per slide, e.g. ['hook_hero', 'standard', 'stat_callout', 'standard', 'cta_closing']
}
```

### Layout Definitions

```typescript
// layouts.ts continued

const HOOK_HERO: LayoutDefinition = {
    type: 'hook_hero',
    title: {
        x: 0, y: 0.58, width: 1, height: 0.38,
        align: 'left', verticalAlign: 'bottom',
        maxFontSize: 144, fontRole: 'display', fontStyleHint: 'black',
        lineHeight: 0.92, letterSpacing: 1, visible: true, opacity: 1,
    },
    subtitle: {
        x: 0, y: 0, width: 0, height: 0,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 0, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1, letterSpacing: 0, visible: false, opacity: 0,
    },
    description: {
        x: 0, y: 0.52, width: 0.75, height: 0.08,
        align: 'left', verticalAlign: 'bottom',
        maxFontSize: 28, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.3, letterSpacing: 0, visible: true, opacity: 0.7,
    },
    pill: { y: 0.96, align: 'left' },
    backgroundPreference: 'image',
    gradientIntensity: 0.85,
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
        maxFontSize: 30, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.75,
    },
    backgroundPreference: 'either',
    gradientIntensity: 0.7,
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
        maxFontSize: 28, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.7,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.4,
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
        maxFontSize: 28, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.55, letterSpacing: 0, visible: true, opacity: 0.75,
    },
    backgroundPreference: 'either',
    gradientIntensity: 0.7,
};

const QUOTE_BLOCK: LayoutDefinition = {
    type: 'quote_block',
    title: {
        x: 0.05, y: 0.15, width: 0.9, height: 0.5,
        align: 'left', verticalAlign: 'top',
        maxFontSize: 72, fontRole: 'display', fontStyleHint: 'italic',
        lineHeight: 1.2, letterSpacing: 0, visible: true, opacity: 1,
        // template adds accent bar to the left based on its skin
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
        maxFontSize: 24, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.4, letterSpacing: 0, visible: true, opacity: 0.65,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.3,
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
        maxFontSize: 28, fontRole: 'body', fontStyleHint: 'normal',
        lineHeight: 1.5, letterSpacing: 0, visible: true, opacity: 0.7,
    },
    backgroundPreference: 'solid',
    gradientIntensity: 0.5,
};

export const LAYOUT_DEFINITIONS: Record<LayoutType, LayoutDefinition> = {
    hook_hero: HOOK_HERO,
    standard: STANDARD,
    stat_callout: STAT_CALLOUT,
    split_text: SPLIT_TEXT,
    quote_block: QUOTE_BLOCK,
    cta_closing: CTA_CLOSING,
};
```

### Layout Sequence Generator

This picks the layout sequence for a carousel based on slide count. The rules:
- Slide 1 is always `hook_hero`
- Last slide is always `cta_closing`
- Middle slides alternate, never repeating the same layout consecutively
- At least one `stat_callout` if there are 4+ slides and the content has stats

```typescript
// layouts.ts continued

const MIDDLE_POOL: LayoutType[] = ['standard', 'stat_callout', 'split_text', 'quote_block'];

export function generateLayoutSequence(slideCount: number, hasStats: boolean = true): LayoutType[] {
    if (slideCount <= 1) return ['hook_hero'];
    if (slideCount === 2) return ['hook_hero', 'cta_closing'];

    const middle: LayoutType[] = [];
    const middleCount = slideCount - 2;
    let lastPicked: LayoutType | null = null;

    // Ensure stat_callout appears if we have room and data suggests stats
    const mustInclude: LayoutType[] = [];
    if (hasStats && middleCount >= 2) mustInclude.push('stat_callout');

    for (let i = 0; i < middleCount; i++) {
        let forced = mustInclude.shift();

        if (forced && forced !== lastPicked) {
            middle.push(forced);
            lastPicked = forced;
            continue;
        }

        // Pick from pool, avoiding consecutive repeat
        const available = MIDDLE_POOL.filter(l => l !== lastPicked);
        const pick = available[i % available.length];
        middle.push(pick);
        lastPicked = pick;
    }

    return ['hook_hero', ...middle, 'cta_closing'];
}
```

---

## Template Integration

Templates need a new method that knows how to render a given layout. Instead of a single `buildScene()`, add a method that takes both content AND layout:

```typescript
// In templates.tsx — update SlideTemplate interface

export interface SlideTemplate {
    id: string;
    name: string;
    background: string;        // default bg for 'solid' preference
    backgroundAlt?: string;    // alternate bg for variety (e.g. light vs dark)
    textColor: string;
    textColorAlt?: string;     // text color for backgroundAlt
    accentColor: string;       // primary accent (for pills, bars, highlights)
    font: string;              // display font
    bodyFont: string;          // body font
    captionFont: string;       // caption/eyebrow font
    fonts: string[];
    description?: string;

    // NEW: layout-aware scene builder
    buildSceneFromLayout: (
        content: TemplateContent & { stat?: string; ctaPill?: string },
        layout: LayoutDefinition,
        slideH: number,
        slideIndex: number,       // for alternating bg
        totalSlides: number,
    ) => TemplateScene;

    // KEEP for backwards compat
    buildScene: (content: TemplateContent, slideH: number) => TemplateScene;
}
```

### How `buildSceneFromLayout` works

This is the key function. It takes the layout's relative positions and maps them to absolute pixel positions using the safe area bounds, then applies the template's visual skin:

```typescript
// Generic implementation that all templates can share or override

function buildSceneFromLayoutGeneric(
    template: SlideTemplate,
    content: TemplateContent & { stat?: string; ctaPill?: string },
    layout: LayoutDefinition,
    slideH: number,
    slideIndex: number,
    totalSlides: number,
): TemplateScene {
    const safeBounds = getSafeAreaBounds('carousel'); // or pass format
    const pad = 80; // horizontal inset
    const safeX = safeBounds.x + pad;
    const safeW = safeBounds.width - pad * 2;
    const safeY = safeBounds.y;
    const safeH = safeBounds.height;

    // Alternate background for visual rhythm
    const useAlt = slideIndex % 2 === 1 && template.backgroundAlt;
    const bg = useAlt ? template.backgroundAlt! : template.background;
    const textColor = useAlt && template.textColorAlt ? template.textColorAlt : template.textColor;

    const elements: SlideEl[] = [];

    // Resolve font for a role
    function fontForRole(role: 'display' | 'body' | 'caption'): string {
        if (role === 'display') return template.font;
        if (role === 'body') return template.bodyFont;
        return template.captionFont;
    }

    // Convert layout slot to absolute position
    function slotToRect(slot: LayoutSlot) {
        return {
            x: Math.round(safeX + slot.x * safeW),
            y: Math.round(safeY + slot.y * safeH),
            width: Math.round(slot.width * safeW),
            height: Math.round(slot.height * safeH),
        };
    }

    // Add gradient if layout wants it
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

    // STAT element (only for stat_callout)
    if (layout.stat?.visible && content.stat) {
        const rect = slotToRect(layout.stat);
        const statFontSize = fitTextFontSize(
            content.stat, fontForRole('display'), 'bold',
            layout.stat.maxFontSize, 1, -2, rect.width, rect.height, 0
        );
        elements.push(createText({
            ...rect,
            text: content.stat,
            fontFamily: fontForRole(layout.stat.fontRole),
            fontSize: statFontSize,
            fontStyle: '900',
            fill: template.accentColor,
            align: layout.stat.align,
            verticalAlign: layout.stat.verticalAlign,
            lineHeight: 1,
            letterSpacing: layout.stat.letterSpacing,
        }));
    }

    // TITLE
    if (layout.title.visible) {
        const rect = slotToRect(layout.title);
        const titleText = layout.type === 'stat_callout'
            ? content.title.toUpperCase()  // stat titles are uppercase eyebrow-style
            : content.title;
        const fontSize = fitTextFontSize(
            titleText, fontForRole(layout.title.fontRole), layout.title.fontStyleHint,
            layout.title.maxFontSize, layout.title.lineHeight,
            layout.title.letterSpacing, rect.width, rect.height, 28
        );
        elements.push(createText({
            ...rect,
            text: titleText,
            fontFamily: fontForRole(layout.title.fontRole),
            fontSize,
            fontStyle: layout.title.fontStyleHint === 'normal' ? '' : layout.title.fontStyleHint === 'black' ? '900' : layout.title.fontStyleHint,
            fill: textColor,
            align: layout.title.align,
            verticalAlign: layout.title.verticalAlign,
            lineHeight: layout.title.lineHeight,
            letterSpacing: layout.title.letterSpacing,
            opacity: layout.title.opacity,
            // richText is applied later by the caller for highlight words
        }));
    }

    // SUBTITLE
    if (layout.subtitle.visible) {
        const rect = slotToRect(layout.subtitle);
        const fontSize = fitTextFontSize(
            content.subtitle, fontForRole(layout.subtitle.fontRole), '',
            layout.subtitle.maxFontSize, layout.subtitle.lineHeight,
            layout.subtitle.letterSpacing, rect.width, rect.height, 20
        );
        elements.push(createText({
            ...rect,
            text: layout.type === 'cta_closing' ? content.subtitle.toUpperCase() : content.subtitle,
            fontFamily: fontForRole(layout.subtitle.fontRole),
            fontSize,
            fill: textColor,
            align: layout.subtitle.align,
            verticalAlign: layout.subtitle.verticalAlign,
            lineHeight: layout.subtitle.lineHeight,
            letterSpacing: layout.subtitle.letterSpacing,
            opacity: layout.subtitle.opacity,
        }));
    }

    // DESCRIPTION
    if (layout.description.visible) {
        const rect = slotToRect(layout.description);
        const fontSize = fitTextFontSize(
            content.description, fontForRole(layout.description.fontRole), '',
            layout.description.maxFontSize, layout.description.lineHeight,
            0, rect.width, rect.height, 16
        );
        elements.push(createText({
            ...rect,
            text: content.description,
            fontFamily: fontForRole(layout.description.fontRole),
            fontSize,
            fill: textColor,
            align: layout.description.align,
            verticalAlign: layout.description.verticalAlign,
            lineHeight: layout.description.lineHeight,
            opacity: layout.description.opacity,
        }));
    }

    // PILL CTA
    if (layout.pill && content.ctaPill) {
        const pillY = Math.round(safeY + layout.pill.y * safeH);
        const pillX = layout.pill.align === 'center'
            ? Math.round(SLIDE_W / 2 - 100)
            : layout.pill.align === 'right'
                ? Math.round(safeX + safeW - 220)
                : safeX;

        elements.push(createRect({
            type: 'rect',
            x: pillX, y: pillY,
            width: 200, height: 48,
            fill: '#FFFFFF',
            cornerRadius: 24,
        }));
        elements.push(createText({
            x: pillX, y: pillY + 12,
            width: 200, height: 24,
            text: content.ctaPill,
            fontFamily: fontForRole('caption'),
            fontSize: 16,
            fontStyle: '700',
            fill: '#111111',
            align: 'center',
            letterSpacing: 1.5,
        }));
    }

    return { background: bg, elements };
}
```

Each template can then either use this generic builder or override with its own custom decorative elements:

```typescript
// Example: Noir Manifesto template with layout support

{
    id: 'noir-manifesto',
    // ... existing properties ...
    accentColor: '#E8440A',
    bodyFont: 'Inter',
    captionFont: 'Inter',
    backgroundAlt: '#0f0f14',  // slightly different dark for alternation

    buildSceneFromLayout(content, layout, slideH, slideIndex, totalSlides) {
        // Use generic builder for base positioning
        const scene = buildSceneFromLayoutGeneric(this, content, layout, slideH, slideIndex, totalSlides);

        // Add template-specific decorative elements based on layout type
        if (layout.type === 'hook_hero' || layout.type === 'cta_closing') {
            // Add the signature red accent bar
            scene.elements.unshift(createRect({
                type: 'rect',
                x: 88, y: slideH - 500,
                width: 18, height: 280,
                fill: '#E8440A',
                cornerRadius: 999,
            }));
        }

        if (layout.type === 'quote_block') {
            // Add thick accent bar to the left of the quote
            scene.elements.unshift(createRect({
                type: 'rect',
                x: 76, y: Math.round(slideH * 0.18),
                width: 8, height: Math.round(slideH * 0.45),
                fill: '#E8440A',
                cornerRadius: 999,
            }));
        }

        if (layout.type === 'stat_callout') {
            // Add subtle glow circle behind the stat
            scene.elements.unshift(createRect({
                type: 'circle',
                x: SLIDE_W / 2 - 200, y: Math.round(slideH * 0.22),
                width: 400, height: 400,
                fill: 'rgba(232,68,10,0.08)',
            }));
        }

        return scene;
    },
}
```

---

## Updated AI Generation (SlideData + Layout)

### Extended SlideData

```typescript
export interface SlideData {
    title: string;
    subtitle: string;
    description: string;
    imagePrompt: string;
    highlightWords?: string[];
    highlightColor?: string;
    // NEW fields
    stat?: string;        // hero number for stat_callout, e.g. "$150B", "90%"
    ctaPill?: string;     // pill text, e.g. "SWIPE →"
}
```

### Updated system prompt

Add to the existing system prompt — the LLM now also outputs `stat` and `ctaPill` per slide:

```php
// Add these to the JSON keys section of $systemPrompt:
// - stat: (optional) a hero number/statistic for emphasis, e.g. "$150B", "90%", "3 out of 4". Only include when the slide has a dramatic number worth calling out.
// - ctaPill: (optional) short pill button text (2-5 words with arrow). Use on slide 1 and sparingly on middle slides. Examples: "HERE'S WHY →", "SWIPE →", "THE THING IS →"
```

### Updated `buildSlideFromData` in `useAiGeneration.ts`

```typescript
function buildSlideFromData(
    data: SlideData,
    bgBase64: string | null,
    template: SlideTemplate | null,
    layoutType: LayoutType,    // NEW param
    slideIndex: number,        // NEW param
    totalSlides: number,       // NEW param
): Slide {
    const slideH = FORMATS[format].h;
    const layout = LAYOUT_DEFINITIONS[layoutType];

    // If template supports layout-aware building, use it
    if (template?.buildSceneFromLayout) {
        const content = {
            eyebrow: '', // or derive from data
            title: data.title,
            subtitle: data.subtitle,
            caption: data.description,
            stat: data.stat,
            ctaPill: data.ctaPill,
            description: data.description,
        };

        const scene = template.buildSceneFromLayout(
            content, layout, slideH, slideIndex, totalSlides
        );

        // Apply highlight words to the title element
        const highlightColor = resolveAccessibleHighlightColor(data.highlightColor, scene.background);
        const highlightWords = pickSingleHighlightWord(data.title, data.highlightWords);
        if (highlightWords.length > 0) {
            const titleEl = scene.elements.find(
                (el): el is TextEl => el.type === 'text' && el.text === data.title
            );
            if (titleEl) {
                titleEl.richText = buildRichText(
                    data.title, highlightWords, titleEl.fill, highlightColor
                );
            }
        }

        // Prepend background image if we have one and layout wants it
        if (bgBase64 && layout.backgroundPreference !== 'solid') {
            const bgEl: ImageEl = { /* same as current */ };
            scene.elements.unshift(bgEl);
        }

        return { id: uid(), background: scene.background, elements: scene.elements };
    }

    // Fallback: use existing buildSlideFromData logic for templates without layout support
    return buildSlideFromDataLegacy(data, bgBase64, template);
}
```

### Updated `generateCarousel` — layout sequence injection

```typescript
async function generateCarousel(/* existing params */) {
    // ... existing code up to parsedSlides ...

    // Generate layout sequence
    const hasStats = parsedSlides.some(s => s.stat);
    const layoutSequence = generateLayoutSequence(parsedSlides.length, hasStats);

    // ... image generation stays the same ...

    const newSlides = parsedSlides.map((s, i) => {
        const imgResult = shouldGenerateImages ? imageResults[i] : null;
        const base64 = imgResult?.status === 'fulfilled' ? imgResult.value : null;
        return buildSlideFromData(
            s, base64, template,
            layoutSequence[i],  // pass layout type for this slide
            i,                  // slide index
            parsedSlides.length // total
        );
    });

    // ... rest stays the same ...
}
```

---

## Migration Path

1. **Create `layouts.ts`** with `LayoutType`, `LayoutDefinition`, `LayoutSlot`, layout constants, and `generateLayoutSequence()`
2. **Update `SlideTemplate` interface** to add `buildSceneFromLayout`, `accentColor`, `bodyFont`, `captionFont`, `backgroundAlt`, `textColorAlt`
3. **Add `buildSceneFromLayoutGeneric()`** as a shared helper
4. **Update each existing template** one at a time — add the new properties and a `buildSceneFromLayout` that calls the generic builder + adds template-specific decorations. Keep `buildScene` intact for backwards compat.
5. **Update `SlideData`** with `stat` and `ctaPill` optional fields
6. **Update the PHP system prompt** to include `stat` and `ctaPill` in the JSON schema
7. **Update `buildSlideFromData`** to accept and use layout params
8. **Update `generateCarousel`** to generate and pass layout sequences

Each step is independently testable. Templates without `buildSceneFromLayout` fall back to the existing behavior.

---

## Summary

The layout system gives you:
- **Per-slide structural variation** without changing templates
- **Template independence** — any template works with any layout
- **Predictable sequencing** — slide 1 always hooks, last slide always CTAs, middles alternate
- **Format-agnostic positioning** — layouts use relative coordinates, work across carousel/stories/post
- **Gradual adoption** — templates can opt-in one at a time via `buildSceneFromLayout`