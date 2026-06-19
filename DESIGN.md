---
name: Slidezz
description: AI that generates a complete, ready-to-publish carousel in under 1 minute.
colors:
  ink: "#1A1A1A"
  paper: "#F9F6F4"
  surface: "#FFFFFF"
  surface-muted: "#FAFAF7"
  flame: "#E8440A"
  flame-deep: "#D13D09"
  ink-soft: "#555550"
  ink-faint: "#888880"
  hairline: "#E8E7E2"
  panel-raised: "#222220"
  panel-hairline: "#333330"
  signal-green: "#28CA41"
  signal-lime: "#A3E635"
  badge-teal: "#0F766E"
  app-accent: "#7C3AED"
typography:
  display:
    fontFamily: "Bebas Neue, Impact, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Bebas Neue, Impact, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  pill: "9999px"
  button: "12px"
  card: "16px"
  card-lg: "24px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "40px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.flame}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.flame-deep}"
    textColor: "{colors.surface}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "14px 24px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "32px"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
---

# Design System: Slidezz

## 1. Overview

**Creative North Star: "The Print Shop Dashboard"**

Slidezz looks like a confident risograph poster that learned to run software. The brand surface is built on warm newsprint paper, hard 1px ink rules, a single molten-orange accent, and a condensed grotesque display face set huge. Nothing is soft, nothing apologizes. It reads like a tool made by a creator who already figured it out, not a SaaS company hedging for a committee. Speed and certainty are the whole personality: every block is squared-off, every border is a decision, every headline is set in caps at a size that dares you to skim past it.

This system explicitly rejects the three things PRODUCT.md names as anti-references. It is **not Canva**: no pastel friendliness, no rounded "anyone can design this" softness, no beginner hand-holding. It is **not generic SaaS**: no cream-and-slate gradient hero blobs, no floating glass cards, no "all-in-one platform for teams" polish that says nothing. It is **not AI-tool aesthetic**: no neon-on-black, no neural-net grids, no "powered by GPT" badging. The AI is plumbing; the voice is a creator.

There are two registers in the product. The **brand surface** (landing pages, marketing, auth split panels) is the loud one documented above and below. The **in-app product surface** (editor, dashboard, settings) runs a deliberately quieter neutral utility layer: near-grayscale OKLCH neutrals, the humanist `Instrument Sans`, shadcn/ui primitives, and a violet (`#7C3AED`) action accent. The quiet layer exists so dense tool screens stay legible; it does not get to redecorate the brand.

**Key Characteristics:**
- Warm off-white ground (`#F9F6F4`), never flat white; the 40px ink grid is a hero-right accent, not a global wash.
- Hard 1px ink hairlines as the primary structural device.
- One molten-orange accent, used sparingly and always for action.
- Condensed display caps (Bebas Neue) against a clean geometric body (Outfit).
- Squared, blocky, poster-like; corners are modest, borders are loud.

## 2. Colors

A warm, high-contrast palette: aged-paper ground, near-black ink, and a single saturated flame accent that carries every call to action.

### Primary
- **Flame** (`#E8440A`): The only saturated color in the system and the entire "act now" vocabulary. Primary CTAs, the accent half of headlines, active toggles, check bullets. Deepens to **Flame Deep** (`#D13D09`) on hover for solid buttons.

### Secondary
- **Ink** (`#1A1A1A`): Near-black. Primary text, every structural border, dark inverted sections, and secondary (non-flame) buttons. The workhorse; it does far more than the accent.

### Neutral
- **Paper** (`#F9F6F4`): The default page ground. A clean, warm off-white. Never use pure `#FFFFFF` as the page background. The 40px ink grid (5% black) is no longer a global texture; it appears only as a masked accent behind the hero image on the right.
- **Surface** (`#FFFFFF`): Card and panel fills that sit on Paper.
- **Surface Muted** (`#FAFAF7`): Alternate section bands and inner mockup chrome.
- **Ink Soft** (`#555550`) / **Ink Faint** (`#888880`): Body and supporting copy on light grounds; the lighter `#AAAAAA` is for "coming soon" / placeholder states only.
- **Hairline** (`#E8E7E2`): The *soft* divider, for low-emphasis internal separators inside cards. Distinct from the loud Ink border.
- **Panel Raised** (`#222220`) / **Panel Hairline** (`#333330`): Card fill and borders inside the inverted Ink (`#1A1A1A`) sections.

### Tertiary (signals only)
- **Signal Green** (`#28CA41`) / **Signal Lime** (`#A3E635`): Discount and savings badges only.
- **Badge Teal** (`#0F766E`): The "Most popular" plan flag. Never as a general accent.
- **App Accent — Violet** (`#7C3AED`): In-app/auth only. The product UI's action color (buttons, focus rings, links). It belongs to the quiet layer and must not appear on brand/marketing surfaces.

### Named Rules
**The One Flame Rule.** Orange (`#E8440A`) is the only saturated hue on a brand surface, and it never exceeds ~10% of a screen. It means "do this." If two things are orange, one of them is lying about its importance.

**The No Pure White Page Rule.** Brand page grounds are Paper (`#F9F6F4`), never `#FFFFFF`. White is for cards sitting *on* paper.

**The Grid-Is-A-Hero-Accent Rule.** The 40px ink grid (5% black) is not the page texture. It appears once, behind/around the hero image on the right, radially masked so it fades into the paper. The rest of the page is solid `#F9F6F4`.

**The Two Borders Rule.** Ink (`#1A1A1A`) is the loud, structural border (cards, sections, nav). Hairline (`#E8E7E2`) is the quiet, internal divider. Never swap them.

## 3. Typography

**Display Font:** Bebas Neue (with Impact, sans-serif fallback)
**Body Font:** Outfit (with ui-sans-serif, system-ui fallback), weights 400–800
**App/Product Font:** Instrument Sans (in-app and auth surfaces only)

**Character:** A condensed grotesque shouting in caps over a calm, geometric humanist sans. The contrast *is* the brand: Bebas gives poster-grade impact and confidence, Outfit keeps the reading experience modern and unfussy. The pairing should feel like a billboard with clean fine print, never like a magazine spread.

### Hierarchy
- **Display** (Bebas Neue 400, `clamp(2.75rem, 6vw, 5.5rem)`, line-height 0.95): Hero and final-CTA headlines. Always tight leading, frequently with one phrase in Flame.
- **Headline** (Bebas Neue 400, `clamp(2.25rem, 4vw, 3.75rem)`, line-height 1): Section titles ("Números que falam por si sós").
- **Title** (Outfit 800, 1.5rem): Card and plan names, in-mockup labels. This is where Outfit goes heaviest.
- **Body** (Outfit 500, 1.125rem, line-height 1.6): All paragraph and list copy. Keep measure at 65–75ch; hero supporting copy caps around `max-w-lg`/`max-w-2xl`.
- **Label** (Outfit 700, 0.8125rem, letter-spacing 0.12em, UPPERCASE): Eyebrows and kickers above headlines ("Resultados", "What's inside").

### Named Rules
**The Caps-For-Impact Rule.** All-caps is reserved for the Bebas display/headline tier and short Outfit labels. Never set body copy or long strings in caps.

**The Bebas Needs Air Rule.** Bebas Neue renders optically smaller and rides high; give it tight line-height (0.95–1.0) but never cram two display lines without breathing room. Pair big Bebas only with Outfit, never with another display face.

## 4. Elevation

The brand surface is **flat and line-driven**. Depth comes from hard 1px Ink borders and inverted dark sections, not from shadow. Shadows appear only as a faint, functional lift on a few floating objects (the hero app mockup, the Pro pricing card, sticky nav). When used, they are large, soft, and low-opacity, reading as "this floats slightly above paper," never as a glossy drop shadow.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 24px 48px rgba(0,0,0,0.1)`): The hero product mockup and other large floating panels.
- **Card Lift** (`shadow-sm` → `shadow-lg` on the emphasized plan): Pricing cards; the popular tier sits one step higher than its siblings.
- **App Focus Ring** (`0 0 0 3px rgba(124,58,237,0.20)`): In-app/auth inputs only; the violet focus halo.

### Named Rules
**The Borders-Not-Shadows Rule.** On brand surfaces, separation is a 1px Ink line first. Reach for shadow only when an element genuinely floats above the page (mockup, sticky bar, the one elevated plan). If a card needs a shadow just to be visible, it needed a border instead.

## 5. Components

### Buttons
- **Shape:** Pills for marketing CTAs (`9999px`); 12px radius for in-mockup and app-style buttons.
- **Primary (Flame):** `#E8440A` fill, white bold text, pill, ~`16px 32px` padding, arrow icon trailing. Hover: fill shifts to Flame Deep (`#D13D09`) or `opacity: 0.8` on inverted grounds.
- **Ink:** `#1A1A1A` fill, white text, used as the secondary/alternate CTA (e.g. Starter plan, "I want to create my first carousel"). Hover lightens toward `#333`.
- **Hover/Focus:** Color or opacity transition only (150–200ms). No scale-up, no bounce.

### Cards / Containers
- **Corner Style:** 16px (`card`), 24px for pricing tiers (`card-lg`).
- **Background:** Surface white on Paper; Panel Raised (`#222220`) inside Ink sections.
- **Border:** 1px Ink (`#1A1A1A`) on light brand surfaces is the signature look; 1px Hairline (`#E8E7E2`) for softer feature/testimonial cards. The emphasized pricing card uses a 2px Flame border.
- **Internal Padding:** Generous, 24–40px. Cards breathe.

### Badges / Pills
- **Eyebrow badge:** White fill, 1px Ink border, pill, often leading a small Flame glyph ("Automação para TikTok").
- **Discount badge:** Signal Green/Lime fill with dark text, uppercase label.
- **Flag badge:** Badge Teal "Most popular", absolutely positioned over the card's top edge.

### Inputs / Fields (app + auth layer)
- **Style:** White fill, 1px neutral border, ~12px radius. Auth uses an inset-label field: a tiny uppercase-ish label sits above the value inside the bordered box.
- **Focus:** Violet border + 3px violet glow (`rgba(124,58,237,0.20)`). This is the only place violet touches an input.

### Navigation
- **Style:** Sticky, Paper at 92% opacity with 12px backdrop blur; the marketing nav carries a 1px Ink bottom border. Logo lockup is the layers mark in an Ink (or white, inverted) rounded square plus the "Slidezz" wordmark in Bebas.
- **Links:** Outfit 600, Ink Faint default, Ink on hover. Primary CTA pill sits at the right.

### Signature Component — Split Hero
A two-column hero on the `#F9F6F4` ground. Left: an outlined badge pill, a large Bebas headline with one phrase in Flame, a lean subhead, an email-capture row (pill input + ink pill button), and a small social-proof row (overlapping initial avatars + one line). Right: a tall image card (`rounded-[2rem]`, 1px ink border, soft float shadow, 4:5 portrait, grayscale by default) with a small white floating stat card overlapping its lower-left (icon + bold stat + sublabel, two stacked rows) and a row of pager dots beneath. The only grid on the page sits behind this image, radially masked to fade.

### Signature Component — Inverted Comparison / Proof Sections
Full-bleed `#1A1A1A` bands that interrupt the warm paper flow: Panel Raised cards, Flame eyebrows, white display headlines, and X-marks (`#666660`) for the "old way" vs. Flame checks for the Slidezz way. This light→dark→light rhythm is core to the page cadence; use it to mark a shift from problem to payoff.

### Signature Component — Testimonial Marquee
An edge-to-edge, auto-scrolling row of white, Ink-bordered quote cards (`testimonial-marquee.tsx`). Continuous loop, pauses on hover, gradient mask fade at both edges, and an initials avatar in an Ink circle per card. Honors `prefers-reduced-motion` by falling back to manual horizontal scroll.

## 6. Do's and Don'ts

### Do:
- **Do** ground brand pages in Paper (`#F9F6F4`); reserve white for cards on top, and confine the 40px ink grid to the hero-right accent.
- **Do** structure with 1px Ink (`#1A1A1A`) borders before reaching for any shadow.
- **Do** keep Flame (`#E8440A`) to ~10% of a screen and only on actions.
- **Do** set headlines in Bebas Neue caps, large, with tight leading and at most one phrase in Flame.
- **Do** keep the in-app violet (`#7C3AED`) strictly inside product/auth surfaces.
- **Do** write copy that earns its place: outcomes (saves, DMs, consulting closes), lean and direct, confident without hype.

### Don't:
- **Don't** drift toward **Canva**: no pastel palettes, no pillowy rounded-everything, no "anyone can design" softness.
- **Don't** ship **generic SaaS clichés**: no cream-and-slate gradient hero blobs, no decorative glassmorphism, no floating laptop mockups selling "the all-in-one platform for teams."
- **Don't** use **AI-tool aesthetics**: no neon-on-dark, no matrix/neural-net grids, no "powered by GPT" branding. The AI is a means, not the personality.
- **Don't** use pure `#FFFFFF` as a brand page background, and never `#000` for ink.
- **Don't** introduce a second saturated accent on brand surfaces, or use Flame for decoration instead of action.
- **Don't** add em dashes in copy, restate a heading in its own subtitle, or write inspirational filler. If a sentence repeats something already implied, cut it.
- **Don't** animate with bounce/elastic easing or scale-pop CTAs; transitions are color/opacity, ease-out, 150–200ms.
