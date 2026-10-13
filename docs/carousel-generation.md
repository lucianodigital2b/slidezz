# Carousel Generation Pipeline

End-to-end reference for how an AI carousel is produced: from the wizard
submission to the fully-rendered Konva slides. Two concerns run in parallel and
are merged at the end:

- **Content + typography** — text written by the LLM, then placed/sized by a
  template + layout matrix (deterministic, client-side).
- **Imaging** — one background image per slide, generated from an LLM-authored
  `imagePrompt` by a configurable image driver (server-side).

---

## 0. Map of the pieces

| Concern | File |
| --- | --- |
| Wizard form submit | `app/Http/Controllers/CarouselWizardController.php` |
| Editor bootstrap (flash → props) | `app/Http/Controllers/SlideProjectController.php` |
| HTTP endpoints (text + image) | `app/Http/Controllers/CarouselGenerationController.php` |
| LLM prompts + image drivers | `app/Services/AI/CarouselGenerationService.php` |
| Wizard → editor wiring | `resources/js/pages/SlideEditor.tsx` |
| Orchestration (stream, parse, build) | `resources/js/components/SlideEditor/hooks/useAiGeneration.ts` |
| Layout matrix (positions/sizes) | `resources/js/components/SlideEditor/layouts.ts` |
| Templates (fonts/colors/scene) | `resources/js/components/SlideEditor/templates.tsx` |
| Auto font-fit | `resources/js/components/SlideEditor/utils.ts` (`fitTextFontSize`) |
| Google Font loader | `resources/js/utils/google-fonts.ts` |

---

## 1. Wizard → editor handoff

The wizard collects a **topic**, a **template** (e.g. `pop-magazine`), an
optional **archetype**, slide count, image mode, and the word-highlight flag.

On submit, `CarouselWizardController::store()`:

1. Creates the `SlideProject` (persists `template` + `prompt`).
2. Builds the **style string** from the template + archetype via
   `CarouselGenerationService::buildStyle()`. This is a **content** brief only
   (editorial voice + hook archetype) — no visual-design language, since fonts,
   colors, and layout come from the template/layout code, not the prompt.
   Example for `pop-magazine` + `profecia-provocativa`:
   `"high-energy, pop-culture, attention-grabbing voice. Hook archetype:
   authoritative prophecy fulfilled hook, revelation that surprises everyone."`
3. Redirects to the editor, flashing `wizardTopic`, `wizardStyle`,
   **`wizardTemplate`**, `wizardSlideCount`, `wizardImageMode`,
   `wizardWordHighlight`, `wizardSaveAsTemplate` to the session.

`SlideProjectController::edit()` reads those flash values into a `wizardConfig`
prop. `SlideEditor.tsx` (the auto-open effect) copies them into hook state —
crucially `setAiTemplateId(wizardConfig.template)` — and calls
`generateCarousel(topic, style, slideCount, mode, highlight, /*replace*/ true,
templateId)`.

> **Why the template id matters:** the `style` string is *only* sent to the LLM
> as a creative brief. The actual **font** comes from the resolved
> `SlideTemplate`. If the template id is not threaded through, `aiTemplateId`
> stays `null` and the builder falls back to `'Space Mono'` regardless of what
> the style text says. The template id is passed as an explicit argument because
> `setAiTemplateId` is async and would not be visible to a synchronous
> `generateCarousel` call in the same tick.

---

## 2. Text generation (content) — server stream

`generateCarousel` POSTs to `CarouselGenerationController::generate()` with
`{ topic, style, slide_count, word_highlight }` and `Accept:
text/event-stream`.

The controller validates, **deducts one credit** (402 `no_credits` if empty),
and delegates to `CarouselGenerationService::generateSlides()`.

That service builds a system prompt instructing the model to emit **NDJSON**
(one JSON object per line), and streams it from **DeepSeek**
(`Provider::DeepSeek, 'deepseek-chat'`) as an SSE event stream. The style string
is injected verbatim into the prompt (`Style: {$style}`).

### Content fields the LLM must return per slide

| Field | Meaning |
| --- | --- |
| `title` | Headline, max 8 words. |
| `description` | Body. Slide 1 = viral hook (18–28 words); middles = 55–70 words; last = soft CTA. |
| `imagePrompt` | Cinematic 4:5 background prompt; lower third kept dark/empty for the title. Real subjects → photographic close-ups on key slides. |
| `highlightWords` | (if `word_highlight`) exactly **1** word from the title to emphasize. |
| `highlightColor` | Vivid hex for that word, readable on dark. |
| `highlightGradient` | 2 vivid hex stops for a gradient on that word. |
| `stat` | (optional) a hero number, e.g. `"90%"` — drives the `stat_callout` layout. |
| `ctaPill` | (optional) pill badge text, e.g. `"SWIPE →"`. |

Slide 1 is forced to be a viral hook with a `ctaPill`; the **last** slide is
forced to be a CTA with an imperative verb.

### Client-side stream handling (`generateCarousel`)

- Reads the response body, splits on `\n`, parses `data: …` SSE lines, and
  concatenates the `delta`/`text` chunks into one `assembled` string.
- Then splits `assembled` by line, keeps lines starting with `{`, and
  `JSON.parse`s each into a `SlideData`. Lines without `title`+`imagePrompt` are
  dropped. Malformed lines are skipped silently.
- If zero slides parse → `error` state (`errorParsing`).

---

## 3. Layout sequence (structure)

With the parsed slides in hand:

```
const hasStats = parsedSlides.some(s => Boolean(s.stat));
const layoutSequence = generateLayoutSequence(parsedSlides.length, hasStats);
```

`generateLayoutSequence` (`layouts.ts`) always opens with **`hook_hero`** and
closes with **`cta_closing`**. Middle slides are picked from
`['standard', 'stat_callout', 'split_text', 'quote_block']`, never repeating the
previous pick; `stat_callout` is force-included once if any slide has a `stat`.

Each `LayoutType` maps to a `LayoutDefinition` — a **relative** grid (fractions
of the safe area) describing, per text role, the slot rect, alignment,
`maxFontSize`, `fontRole` (`display`/`body`/`caption`), `fontStyleHint`,
`lineHeight`, `letterSpacing`, visibility, opacity. It also declares
`backgroundPreference`, `gradientIntensity`, and `imageCardPosition`. This is the
**typography geometry** layer — it decides *where* and *how big*, independent of
*which font*.

---

## 4. Image generation (imaging) — per slide, parallel

Only runs when `imageMode !== 'none'`. Aspect ratio is `9:16` for stories,
otherwise `4:5`.

For each parsed slide, `generateCarousel` fires a parallel
(`Promise.allSettled`) POST to
`CarouselGenerationController::generateImage()` with `{ prompt: s.imagePrompt,
aspect_ratio }`. Failures resolve to `null` (the slide just renders without a
background).

Server side, `CarouselGenerationService::generateImage()` dispatches on
`config('services.carousel_image.driver')` (default `gemini`):

| Driver | Method | Notes |
| --- | --- | --- |
| `gemini` / `google` | `generateImageWithGemini` | `gemini-2.5-flash-image`, honors `aspect_ratio`, 120s timeout. Subject-accurate for real people/brands. |
| `openai` / `gpt` | `generateImageWithOpenAi` | `gpt-image-1`, 1024×1024. |
| `unsplash` (default fallback) | `generateImageWithUnsplash` | Stock search by prompt keywords. |

All drivers normalize the result to a **base64 data URI** (`data:image/...;base64,…`)
returned as `{ base64 }`. The image is never written to disk at this stage — it
lives inline in the slide element's `src`.

---

## 5. Font loading

Before building scenes:

```
const template = templateId ? SLIDE_TEMPLATES.find(t => t.id === templateId) : null;
await Promise.all((template ? [...new Set(template.fonts)] : ['Space Mono', 'Inter'])
    .map(f => loadGoogleFont(f)));
```

`loadGoogleFont` (`google-fonts.ts`) injects a `<link>` to Google Fonts css2,
**awaits the stylesheet's `load` event**, then `document.fonts.load()` for
400/700 weights. Awaiting matters: Konva measures text on a canvas, and an
unloaded font would mis-measure (and `fitTextFontSize` would compute the wrong
size).

---

## 6. Scene building — where typography is finally defined

For each slide, `buildSlideFromData(data, base64, template, layoutType, i,
total, imageMode)` runs.

### Path A — template with `buildSceneFromLayout` (the real wizard path)

Templates like `pop-magazine` implement `buildSceneFromLayout`, which calls the
shared **`buildSceneFromLayoutGeneric(template, content, layout, slideH,
slideIndex)`**. This is the merge point of the two typography layers:

- **Font family** comes from the **template** via `fontForRole(role)`:
  - `display` → `template.font` (e.g. `Anton`)
  - `body` → `template.bodyFont` (e.g. `Inter`)
  - `caption` → `template.captionFont`
- **Position / size / weight / spacing** come from the **layout slot**
  (`maxFontSize`, `fontStyleHint`, `lineHeight`, `letterSpacing`, alignment).
- **Colors** come from the template (`textColor`/`textColorAlt`,
  `accentColor`), with `backgroundAlt` alternating on odd slides.
- **Final font size** is computed by `fitTextFontSize(...)`: starting at the
  slot's `maxFontSize`, it measures wrapped line count on a canvas and steps
  down by 2px until the text fits the slot's inner box (min 10px). This is why
  long titles shrink automatically.

The generic builder also adds a bottom gradient (scaled by
`layout.gradientIntensity`), the `stat` element (accent-colored, weight 900),
the `ctaPill` badge, and badge anchors. Individual templates then layer their
signature decorations on top — e.g. `pop-magazine` prepends the red left bar and
adds the "NEW" circle on the hook slide.

> So: **the template chooses the typeface and palette; the layout chooses the
> placement and scale; `fitTextFontSize` reconciles the two against the actual
> text length.**

### Highlight word

If `word_highlight` is on and `highlightWords` resolves to a real word in the
title (`pickSingleHighlightWord`), the title element's `richText` is rebuilt via
`buildRichText` so just that word gets `highlightColor` / `highlightGradient`.
Colors are first passed through `resolveAccessibleHighlightColor` /
`resolveAccessibleGradient` to stay readable against the slide background.

### Path B — legacy fallback (`buildSlideFromDataLegacy`)

Used when **no template** is selected. Title font is `template?.font ?? 'Space
Mono'`, body `'Inter'`. This is the path that produced the "Space Mono instead of
Anton" bug when the wizard failed to pass its template id — it has no concept of
the style string's font.

---

## 7. Image placement into the scene

Once a scene exists and a `base64` background was produced (and the layout's
`backgroundPreference !== 'solid'`), the image is inserted depending on the
effective image mode:

- **background** — full-bleed `ImageEl` (`0,0 → SLIDE_W × slideH`) unshifted to
  the back, marked `isBackground`, with an overlay preset chosen from the
  layout's `gradientIntensity` (`gradient_strong` / `gradient` / `base` /
  `none`). Standalone gradient elements are removed since the overlay replaces
  them.
- **grid** — image becomes a rounded contained card (`cornerRadius: 40`),
  positioned top or bottom per `layout.imageCardPosition`.
- **alternate** — even slides use `background`, odd slides use `grid`.
- **none** — no images requested at all (step 4 skipped).

---

## 8. Assembly

```
const newSlides = parsedSlides.map((s, i) =>
  buildSlideFromData(s, base64[i], template, layoutSequence[i], i, total, imageMode));
```

The resulting `Slide[]` either **replaces** the deck (wizard path,
`replaceSlides = true`) or is appended. The editor jumps to the first new slide.
If `saveAsTemplate` was requested, the canvas is allowed to paint and then
snapshotted into a reusable `SlideTemplate`.

---

## Quick answers

**How is the content defined?** DeepSeek returns NDJSON per slide
(`title`, `description`, `imagePrompt`, highlight fields, optional `stat` /
`ctaPill`), steered by the system prompt + the wizard's style string.

**How is the typography defined?** Three layers combine at
`buildSceneFromLayoutGeneric`: the **template** supplies fonts/colors
(`fontForRole`), the **layout slot** supplies position/scale/weight/spacing, and
`fitTextFontSize` shrinks to fit the real text. The selected template id —
threaded from the wizard — is what decides the typeface.

**How is the imaging defined?** The LLM writes one `imagePrompt` per slide; the
server's configurable driver (Gemini by default) renders it to a base64 data
URI at the requested aspect ratio; the client places it as a full-bleed
background or a card per the image mode and layout.
