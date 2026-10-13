<?php

namespace App\Enums;

/**
 * The caption styles TikTok's own in-app text editor offers, reproduced for
 * server-side rendering.
 *
 * "Classic" is TikTok Sans, TikTok's real typeface (open sourced under the SIL
 * Open Font License). The other four are the closest open-licensed stand-ins for
 * the proprietary faces in the app, chosen to match weight and proportion rather
 * than to imitate them exactly.
 *
 * @see https://developers.tiktok.com/blog/tiktok-sans-open-source
 */
enum SlideTextPreset: string
{
    case Classic = 'classic';
    case Typewriter = 'typewriter';
    case Handwriting = 'handwriting';
    case Serif = 'serif';
    case Neon = 'neon';

    public function fontPath(): string
    {
        return public_path('fonts/tiktok/'.match ($this) {
            self::Classic => 'TikTokSans-Black.ttf',
            self::Typewriter => 'CourierPrime-Bold.ttf',
            self::Handwriting => 'Caveat-Bold.ttf',
            self::Serif => 'Gelasio-Bold.ttf',
            self::Neon => 'Abel-Regular.ttf',
        });
    }

    /**
     * Label shown in the UI. Matches the wording inside the TikTok app.
     */
    public function label(): string
    {
        return match ($this) {
            self::Classic => 'Classic',
            self::Typewriter => 'Typewriter',
            self::Handwriting => 'Handwriting',
            self::Serif => 'Serif',
            self::Neon => 'Neon',
        };
    }

    /**
     * Corrects for how differently these faces set at the same point size — Caveat
     * is a small-bodied script, Courier Prime a wide monospace. Measured by setting
     * the same string in each face and comparing advance width against TikTok Sans,
     * so every preset starts at a comparable visual size before the renderer's
     * fit-to-box shrinking kicks in.
     */
    public function sizeScale(): float
    {
        return match ($this) {
            self::Classic => 1.0,
            self::Typewriter => 0.9,
            self::Handwriting => 1.45,
            self::Serif => 1.0,
            self::Neon => 1.3,
        };
    }

    /**
     * The colour the glyphs are filled with, as [r, g, b].
     *
     * @return array{int, int, int}
     */
    public function fill(): array
    {
        return [255, 255, 255];
    }

    /**
     * The hard edge stamped behind the glyphs so white text survives a bright photo.
     *
     * `radius` is a fraction of the font size. `rings` of 0 draws no outline at all,
     * which is how Neon works — it separates itself with light instead (see
     * {@see self::glow()}).
     *
     * @return array{color: array{int, int, int}, radius: float, rings: int}
     */
    public function stroke(): array
    {
        return match ($this) {
            self::Neon => ['color' => [0, 0, 0], 'radius' => 0.0, 'rings' => 0],
            self::Handwriting => ['color' => [0, 0, 0], 'radius' => 0.07, 'rings' => 2],
            default => ['color' => [0, 0, 0], 'radius' => 0.085, 'rings' => 2],
        };
    }

    /**
     * The coloured bloom rendered behind the glyphs, or null for the solid styles.
     *
     * `scale` is the size of the layer the blur runs on, relative to the slide. Small
     * enough to make the blur both cheap and wide, large enough that letterforms
     * survive it — below roughly a third, the line smears into one blob and the halo
     * stops following the text. `passes` then sets how far the light carries, and
     * `layers` how many times the result is composited, i.e. how bright it burns.
     *
     * @return array{color: array{int, int, int}, scale: float, passes: int, layers: int}|null
     */
    public function glow(): ?array
    {
        // TikTok's brand cyan, which is also roughly what its neon caption gives off.
        return $this === self::Neon
            ? ['color' => [0, 242, 234], 'scale' => 0.34, 'passes' => 5, 'layers' => 3]
            : null;
    }

    /**
     * How dark the band behind the copy gets, 0 to 1. Neon reads best on a deeper
     * scrim, since a glow needs darkness around it to register as light.
     */
    public function scrimStrength(): float
    {
        return $this === self::Neon ? 0.58 : 0.42;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
