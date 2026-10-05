<?php

namespace App\Services\Rendering;

use App\Enums\SlideTextPreset;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Renders one TikTok photo-carousel slide: a full-bleed photo with a line of large
 * white text set in one of TikTok's caption styles, laid out inside the green zone.
 *
 * Deliberately server-side (GD, no headless browser) so scheduled automations can
 * produce content without a client. Output is JPEG because TikTok's Content Posting
 * API rejects PNG.
 */
class SlideshowRenderer
{
    public const WIDTH = 1080;

    public const HEIGHT = 1920;

    /** Horizontal padding — the text column matches the reference carousels at ~83% width. */
    private const SIDE_PADDING = 92;

    /** Vertical green zone: above it sits nothing, below it TikTok draws its own UI. */
    private const SAFE_TOP = 0.10;

    private const SAFE_BOTTOM = 0.80;

    private const MAX_FONT_SIZE = 78;

    private const MIN_FONT_SIZE = 44;

    private const MAX_LINES = 6;

    private const LINE_HEIGHT = 1.22;

    public function __construct(private readonly EmojiSprites $emoji) {}

    /**
     * @param  string  $imageSource  An https URL or a `data:` URI.
     * @param  'top'|'center'|'bottom'  $textPosition
     * @return string JPEG binary.
     */
    public function render(
        string $imageSource,
        string $text,
        string $textPosition = 'center',
        SlideTextPreset $preset = SlideTextPreset::Classic,
    ): string {
        if (! is_file($preset->fontPath())) {
            throw new RuntimeException("The {$preset->label()} font is missing at {$preset->fontPath()}.");
        }

        $canvas = $this->canvasWithPhoto($imageSource);

        try {
            $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

            if ($text !== '') {
                $this->drawText($canvas, $text, $textPosition, $preset);
            }

            ob_start();
            imagejpeg($canvas, null, 90);

            return (string) ob_get_clean();
        } finally {
            imagedestroy($canvas);
        }
    }

    /**
     * 1080x1920 canvas with the photo scaled to cover and centre-cropped.
     */
    private function canvasWithPhoto(string $imageSource): \GdImage
    {
        $photo = $this->loadImage($imageSource);

        try {
            $canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
            imagefill($canvas, 0, 0, imagecolorallocate($canvas, 12, 12, 12));

            $sourceWidth = imagesx($photo);
            $sourceHeight = imagesy($photo);
            $scale = max(self::WIDTH / $sourceWidth, self::HEIGHT / $sourceHeight);
            $targetWidth = (int) ceil($sourceWidth * $scale);
            $targetHeight = (int) ceil($sourceHeight * $scale);

            imagecopyresampled(
                $canvas,
                $photo,
                (int) round((self::WIDTH - $targetWidth) / 2),
                (int) round((self::HEIGHT - $targetHeight) / 2),
                0,
                0,
                $targetWidth,
                $targetHeight,
                $sourceWidth,
                $sourceHeight,
            );

            return $canvas;
        } finally {
            imagedestroy($photo);
        }
    }

    private function loadImage(string $source): \GdImage
    {
        if (str_starts_with($source, 'data:')) {
            $binary = base64_decode(substr($source, (int) strpos($source, ',') + 1), true);

            if ($binary === false) {
                throw new RuntimeException('Slide image is not a valid data URI.');
            }
        } else {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => config('services.pinterest.user_agent')])
                ->get($source);

            if ($response->failed()) {
                throw new RuntimeException("Could not download slide image (HTTP {$response->status()}).");
            }

            $binary = $response->body();
        }

        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            throw new RuntimeException('Slide image could not be decoded.');
        }

        return $image;
    }

    /**
     * @param  'top'|'center'|'bottom'  $position
     */
    private function drawText(\GdImage $canvas, string $text, string $position, SlideTextPreset $preset): void
    {
        $maxWidth = self::WIDTH - (self::SIDE_PADDING * 2);

        [$fontSize, $lines] = $this->fitLines($text, $maxWidth, $preset);

        $lineHeight = $fontSize * self::LINE_HEIGHT;
        $blockHeight = $lineHeight * count($lines);

        $top = self::HEIGHT * self::SAFE_TOP;
        $bottom = self::HEIGHT * self::SAFE_BOTTOM;

        $blockTop = match ($position) {
            'top' => $top,
            'bottom' => $bottom - $blockHeight,
            default => ($top + $bottom - $blockHeight) / 2,
        };

        $this->drawScrim($canvas, (int) $blockTop, (int) ($blockTop + $blockHeight), $preset);

        // imagettftext takes a baseline, not a top edge; 0.94 of the line box puts the
        // cap height where the reference carousels sit.
        $baselineAt = fn (int $index): float => $blockTop + ($index * $lineHeight) + ($fontSize * 0.94);

        if ($preset->glow() !== null) {
            $this->drawGlow($canvas, $lines, $fontSize, $baselineAt, $preset);
        }

        foreach ($lines as $index => $line) {
            $this->drawLine($canvas, $line, $fontSize, $baselineAt($index), $preset);
        }
    }

    /**
     * Paint the neon bloom on its own layer, then blur and composite it.
     *
     * Stamping semi-transparent copies in a ring cannot make a glow — the overlaps
     * accumulate into a solid slab. Light needs an actual blur, so the copy is drawn
     * once at full size, shrunk, blurred there (cheap, and the downscale widens the
     * kernel), then scaled back over the photo.
     *
     * @param  list<array{words: list<array{segments: list<array{type: string, value: string}>, width: float}>, width: float}>  $lines
     * @param  callable(int): float  $baselineAt
     */
    private function drawGlow(\GdImage $canvas, array $lines, int $fontSize, callable $baselineAt, SlideTextPreset $preset): void
    {
        $glow = $preset->glow();
        $layer = $this->transparentLayer(self::WIDTH, self::HEIGHT);

        try {
            foreach ($lines as $index => $line) {
                $this->drawLine($layer, $line, $fontSize, $baselineAt($index), $preset, $glow['color']);
            }

            $smallWidth = max(1, (int) round(self::WIDTH * $glow['scale']));
            $smallHeight = max(1, (int) round(self::HEIGHT * $glow['scale']));
            $small = $this->transparentLayer($smallWidth, $smallHeight);

            try {
                imagecopyresampled($small, $layer, 0, 0, 0, 0, $smallWidth, $smallHeight, self::WIDTH, self::HEIGHT);

                for ($pass = 0; $pass < $glow['passes']; $pass++) {
                    imagefilter($small, IMG_FILTER_GAUSSIAN_BLUR);
                }

                imagealphablending($canvas, true);

                // A single blurred pass is too faint to read as light; stacking it
                // builds the bloom up without widening it.
                for ($layerIndex = 0; $layerIndex < $glow['layers']; $layerIndex++) {
                    imagecopyresampled($canvas, $small, 0, 0, 0, 0, self::WIDTH, self::HEIGHT, $smallWidth, $smallHeight);
                }
            } finally {
                imagedestroy($small);
            }
        } finally {
            imagedestroy($layer);
        }
    }

    private function transparentLayer(int $width, int $height): \GdImage
    {
        $layer = imagecreatetruecolor($width, $height);

        imagealphablending($layer, false);
        imagesavealpha($layer, true);
        imagefilledrectangle($layer, 0, 0, $width, $height, imagecolorallocatealpha($layer, 0, 0, 0, 127));
        imagealphablending($layer, true);

        return $layer;
    }

    /**
     * Shrink the type until the copy fits the green zone in at most MAX_LINES lines.
     *
     * @return array{0: int, 1: list<array{words: list<array{segments: list<array{type: string, value: string}>, width: float}>, width: float}>}
     */
    private function fitLines(string $text, float $maxWidth, SlideTextPreset $preset): array
    {
        $fontSize = (int) round(self::MAX_FONT_SIZE * $preset->sizeScale());
        $minimum = (int) round(self::MIN_FONT_SIZE * $preset->sizeScale());

        while (true) {
            $lines = $this->wrap($text, $fontSize, $maxWidth, $preset);

            if (count($lines) <= self::MAX_LINES || $fontSize <= $minimum) {
                return [$fontSize, $lines];
            }

            $fontSize -= 4;
        }
    }

    /**
     * Greedy word wrap measured against the real font metrics.
     *
     * @return list<array{words: list<array{segments: list<array{type: string, value: string}>, width: float}>, width: float}>
     */
    private function wrap(string $text, int $fontSize, float $maxWidth, SlideTextPreset $preset): array
    {
        $spaceWidth = $this->textWidth(' ', $fontSize, $preset);
        $lines = [];
        $current = [];
        $currentWidth = 0.0;

        foreach (explode(' ', $text) as $rawWord) {
            if ($rawWord === '') {
                continue;
            }

            $word = $this->measureWord($rawWord, $fontSize, $preset);
            $candidate = $current === [] ? $word['width'] : $currentWidth + $spaceWidth + $word['width'];

            if ($current !== [] && $candidate > $maxWidth) {
                $lines[] = ['words' => $current, 'width' => $currentWidth];
                $current = [$word];
                $currentWidth = $word['width'];

                continue;
            }

            $current[] = $word;
            $currentWidth = $candidate;
        }

        if ($current !== []) {
            $lines[] = ['words' => $current, 'width' => $currentWidth];
        }

        return $lines;
    }

    /**
     * Split a word into text and emoji segments and measure the whole thing.
     *
     * @return array{segments: list<array{type: string, value: string}>, width: float}
     */
    private function measureWord(string $word, int $fontSize, SlideTextPreset $preset): array
    {
        $segments = [];
        $offset = 0;
        $width = 0.0;

        if (preg_match_all(EmojiSprites::CLUSTER_PATTERN, $word, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as [$cluster, $position]) {
                if ($position > $offset) {
                    $segments[] = ['type' => 'text', 'value' => substr($word, $offset, $position - $offset)];
                }

                $segments[] = ['type' => 'emoji', 'value' => $cluster];
                $offset = $position + strlen($cluster);
            }
        }

        if ($offset < strlen($word)) {
            $segments[] = ['type' => 'text', 'value' => substr($word, $offset)];
        }

        foreach ($segments as $segment) {
            $width += $segment['type'] === 'emoji'
                ? $this->emojiSize($fontSize) * 1.06
                : $this->textWidth($segment['value'], $fontSize, $preset);
        }

        return ['segments' => $segments, 'width' => $width];
    }

    /**
     * @param  array{words: list<array{segments: list<array{type: string, value: string}>, width: float}>, width: float}  $line
     */
    /**
     * @param  array{int, int, int}|null  $flatColor  Set on the glow pass: draws the
     *                                                copy in one solid colour with no
     *                                                outline, and leaves emoji out
     *                                                (a blurred sprite behind itself
     *                                                only muddies the real one).
     */
    private function drawLine(
        \GdImage $canvas,
        array $line,
        int $fontSize,
        float $baseline,
        SlideTextPreset $preset,
        ?array $flatColor = null,
    ): void {
        $spaceWidth = $this->textWidth(' ', $fontSize, $preset);
        $x = (self::WIDTH - $line['width']) / 2;

        foreach ($line['words'] as $index => $word) {
            if ($index > 0) {
                $x += $spaceWidth;
            }

            foreach ($word['segments'] as $segment) {
                if ($segment['type'] === 'emoji') {
                    if ($flatColor === null) {
                        $this->drawEmoji($canvas, $segment['value'], $x, $baseline, $fontSize);
                    }

                    $x += $this->emojiSize($fontSize) * 1.06;

                    continue;
                }

                $this->drawOutlinedText($canvas, $segment['value'], $fontSize, $x, $baseline, $preset, $flatColor);
                $x += $this->textWidth($segment['value'], $fontSize, $preset);
            }
        }
    }

    /**
     * The glyphs plus whatever the preset puts behind them: a hard black edge for the
     * solid faces, or a soft coloured bloom for Neon.
     *
     * The backing is stamped around concentric rings rather than a filled disc — a
     * continuous edge for a small fraction of the imagettftext calls. Neon uses more
     * rings at a wider radius and partial alpha, so the stamps blend into a glow
     * instead of reading as a thick outline.
     */
    private function drawOutlinedText(
        \GdImage $canvas,
        string $text,
        int $fontSize,
        float $x,
        float $baseline,
        SlideTextPreset $preset,
        ?array $flatColor = null,
    ): void {
        if (trim($text) === '') {
            return;
        }

        $font = $preset->fontPath();

        imagealphablending($canvas, true);

        if ($flatColor !== null) {
            $flat = imagecolorallocate($canvas, ...$flatColor);
            imagettftext($canvas, $fontSize, 0, (int) round($x), (int) round($baseline), $flat, $font, $text);

            return;
        }

        $stroke = $preset->stroke();
        $radius = max(2.0, $fontSize * $stroke['radius']);
        $outline = imagecolorallocate($canvas, ...$stroke['color']);

        for ($ring = 0; $ring < $stroke['rings']; $ring++) {
            // Rings run outermost inwards, so the edge stays continuous even where
            // the glyph curves away from a single stamp.
            $spread = $radius * (1 - ($ring / max(1, $stroke['rings'])));

            for ($step = 0; $step < 16; $step++) {
                $angle = $step * M_PI / 8;
                imagettftext(
                    $canvas,
                    $fontSize,
                    0,
                    (int) round($x + cos($angle) * $spread),
                    (int) round($baseline + sin($angle) * $spread),
                    $outline,
                    $font,
                    $text,
                );
            }
        }

        $fill = imagecolorallocate($canvas, ...$preset->fill());
        imagettftext($canvas, $fontSize, 0, (int) round($x), (int) round($baseline), $fill, $font, $text);
    }

    private function drawEmoji(\GdImage $canvas, string $cluster, float $x, float $baseline, int $fontSize): void
    {
        $png = $this->emoji->png($cluster);

        if ($png === null) {
            return;
        }

        $sprite = @imagecreatefromstring($png);

        if ($sprite === false) {
            return;
        }

        try {
            $size = (int) round($this->emojiSize($fontSize));

            imagealphablending($canvas, true);
            imagecopyresampled(
                $canvas,
                $sprite,
                (int) round($x),
                (int) round($baseline - $size * 0.84),
                0,
                0,
                $size,
                $size,
                imagesx($sprite),
                imagesy($sprite),
            );
        } finally {
            imagedestroy($sprite);
        }
    }

    /**
     * Soft dark band behind the copy so white text survives a bright photo.
     */
    private function drawScrim(\GdImage $canvas, int $top, int $bottom, SlideTextPreset $preset): void
    {
        $feather = 140;
        $start = max(0, $top - $feather);
        $end = min(self::HEIGHT, $bottom + $feather);
        $peak = $preset->scrimStrength();

        for ($y = $start; $y < $end; $y++) {
            if ($y < $top) {
                $strength = ($y - $start) / $feather;
            } elseif ($y > $bottom) {
                $strength = ($end - $y) / $feather;
            } else {
                $strength = 1.0;
            }

            $alpha = (int) round(127 - ($strength * $peak * 127));

            if ($alpha >= 127) {
                continue;
            }

            $color = imagecolorallocatealpha($canvas, 0, 0, 0, $alpha);
            imagefilledrectangle($canvas, 0, $y, self::WIDTH, $y, $color);
        }
    }

    private function textWidth(string $text, int $fontSize, SlideTextPreset $preset): float
    {
        $box = imagettfbbox($fontSize, 0, $preset->fontPath(), $text);

        if ($box === false) {
            return 0.0;
        }

        // Indices 2 and 0 are the advance edges; using them (rather than the ink
        // extents) keeps spaces and trailing punctuation measurable.
        return (float) ($box[2] - $box[0]);
    }

    private function emojiSize(int $fontSize): float
    {
        return $fontSize * 1.12;
    }
}
