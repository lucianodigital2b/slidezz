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
typography:
  display:
    fontFamily: "Euclid Circular A, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Euclid Circular A, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
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

> Since 19/10/2026 the landing pages (`/` LandingEn, `/br` welcome) follow the jitter.video homepage language. The in-app product surface (editor, dashboard, settings) is unchanged: shadcn/ui neutrals, Instrument Sans. The frontmatter above still describes the old "Print Shop" brand surface and is kept only as history for the in-app flame accent.

## 1. Overview

**North Star: "Big type, grey blocks, one soft pop of color."** White page, near-black ink, giant extra-bold headlines with very tight tracking, content sitting in flat light-grey blocks with huge rounded corners, and pastel accent blocks (green, lime, sky) used one at a time. Calm, confident, product-first: the slide mockups are the color, the chrome stays quiet.

## 2. Tokens (Tailwind v4, `resources/css/app.css` @theme)

| Token | Value | Use |
|---|---|---|
| `jt-ink` | `#19171C` | All main text, dark pill buttons |
| `jt-ink-soft` | `#2D2933` | Dark button hover |
| `jt-muted` / `jt-faint` | `#6E6E73` / `#97979B` | Secondary text, legal |
| `jt-line` | `#D7D7DB` | Hairlines (FAQ rows, divider rows) |
| `jt-surface` / `jt-surface-2` | `#F2F1F3` / `#E5E4E7` | Cards, section blocks, secondary pill / hover |
| `jt-green` / `jt-green-soft` | `#34D27B` / `#E5F8EC` | Brand color. Primary CTA (ink text), one feature block |
| `jt-green-deep` | `#087A41` | Inline links, focus rings, small accents (AA on white) |
| `jt-lime` | `#F5FF63` | "new" pills, CTA on grey blocks |
| `jt-sky` / `jt-sky-soft` | `#01B2FD` / `#E6F4FF` | One bold block (white text) |
| `rounded-jt-card` / `rounded-jt-block` | 40px / 50px | Feature cards / big sections |
| `shadow-jt-float` / `shadow-jt-soft` | layered long soft shadows | Mockups over grey / small chips |

Fonts: `font-landing-display` (Inter Tight 800, stand-in for Jitter's paid TWK Lausanne) for headings, `font-landing` (Inter) for body. Loaded from fonts.bunny.net in `app.blade.php`.

## 3. Typography

- **Hero:** Inter Tight 800, `clamp(3rem,9vw,8.75rem)`, leading 0.9, tracking -0.035em, centered.
- **Section H2:** 800, `clamp(2.25rem,5vw,4.5rem)`, leading 0.95, tracking -0.04em, left-aligned.
- **Statement paragraph:** H2-ish size, first clause in ink, rest in `jt-ink/20`.
- **Card title:** 20px semibold, tracking -0.02em. **Body:** 16px/24px, tracking -0.02em, `jt-muted`.

## 4. Components

- **Buttons:** always `rounded-full`, 52-56px tall. Primary = green + ink text. Strong = ink + white. Secondary = `jt-surface`. Color transitions only.
- **Announcement pill:** grey pill above the hero H1, bold prefix + green-deep link word.
- **Section tag:** small grey pill above each H2.
- **Cards:** flat `jt-surface`, no border, 40px radius, mockup in a white 20px-radius frame, title + muted text below.
- **Color steps:** stacked big blocks (grey, sky, green), title as a white inline chip.
- **Footer:** white panel with 50-80px rounded bottom corners on a black page end.

## 5. Do / Don't

- **Do** keep the page white and let grey blocks carry structure; one pastel block per viewport.
- **Do** keep headlines huge and tight; body stays small and muted.
- **Don't** use lilac or violet (that is Jitter's identity; Slidezz is green since 20/10/2026). **Don't** bring back the flame orange as a landing accent, 1px ink borders or paper `#F9F6F4` ground.
- **Don't** use em dashes in copy, bounce easing or scale-pop buttons.
