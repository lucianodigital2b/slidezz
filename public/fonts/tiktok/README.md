# TikTok caption fonts

Fonts backing `App\Enums\SlideTextPreset`, which reproduces the five caption styles
in TikTok's in-app text editor for server-side rendering.

Every file here is licensed under the **SIL Open Font License 1.1**, which permits
embedding and commercial use.

| Preset | File | Family | Why this one |
|---|---|---|---|
| Classic | `TikTokSans-Black.ttf` | [TikTok Sans](https://developers.tiktok.com/blog/tiktok-sans-open-source) | TikTok's own typeface, open sourced by TikTok. The in-app "Classic" style *is* this font, so it is an exact match rather than a stand-in. |
| Typewriter | `CourierPrime-Bold.ttf` | [Courier Prime](https://fonts.google.com/specimen/Courier+Prime) | Monospace with real typewriter proportions, heavier and more legible on video than Courier itself. |
| Handwriting | `Caveat-Bold.ttf` | [Caveat](https://fonts.google.com/specimen/Caveat) | Casual connected handwriting that stays readable at caption size. |
| Serif | `Gelasio-Bold.ttf` | [Gelasio](https://fonts.google.com/specimen/Gelasio) | Metric-compatible with Georgia, the face TikTok's Serif style is usually matched to. |
| Neon | `Abel-Regular.ttf` | [Abel](https://fonts.google.com/specimen/Abel) | Condensed and light-stemmed, so the cyan bloom reads as light instead of swallowing the letters. |

Only Classic is TikTok's real typeface. The other four are the closest open-licensed
stand-ins for proprietary faces — chosen to match weight and proportion, not to
imitate them exactly.

Emoji are **not** covered by these files: GD renders a TTF in one colour, so emoji
would come out as tofu. They are composited from [Twemoji](https://github.com/jdecked/twemoji)
PNGs (CC-BY 4.0) instead — see `App\Services\Rendering\EmojiSprites`.

## Replacing or adding a font

Google Fonts serves TTF rather than WOFF2 when the request carries a user agent
without WOFF2 support:

```bash
UA="Mozilla/5.0 (X11; Linux x86_64)"
URL=$(curl -s "https://fonts.googleapis.com/css2?family=Caveat:wght@700" -H "User-Agent: $UA" \
  | grep -o 'https://fonts.gstatic.com[^)]*' | head -1)
curl -s -o Caveat-Bold.ttf "$URL"
```

A new face needs a `sizeScale()` entry in `SlideTextPreset` — the faces set very
differently at the same point size. Measure it by setting one string in the new font
and in TikTok Sans with `imagettfbbox()`, then divide the TikTok Sans advance width
by the new font's.
