<?php

namespace Tests\Feature;

use App\Enums\SlideTextPreset;
use App\Services\Rendering\SlideshowRenderer;
use Tests\TestCase;

class SlideTextPresetTest extends TestCase
{
    public function test_every_preset_ships_its_font_file(): void
    {
        foreach (SlideTextPreset::cases() as $preset) {
            $this->assertFileExists(
                $preset->fontPath(),
                "The {$preset->label()} preset points at a font that is not in the repo.",
            );
        }
    }

    public function test_every_preset_font_covers_portuguese_accents(): void
    {
        foreach (SlideTextPreset::cases() as $preset) {
            $plain = imagettfbbox(48, 0, $preset->fontPath(), 'Acao voce acucar');
            $accented = imagettfbbox(48, 0, $preset->fontPath(), 'Ação você açúcar');

            $this->assertNotFalse($accented, "{$preset->label()} cannot set accented text.");

            // A missing glyph falls back to a tofu box of a different advance width;
            // the accented string should stay within a hair of the plain one.
            $ratio = ($accented[2] - $accented[0]) / ($plain[2] - $plain[0]);

            $this->assertGreaterThan(0.9, $ratio, "{$preset->label()} looks to be missing accented glyphs.");
            $this->assertLessThan(1.1, $ratio, "{$preset->label()} looks to be missing accented glyphs.");
        }
    }

    public function test_every_preset_renders_a_slide(): void
    {
        foreach (SlideTextPreset::cases() as $preset) {
            $jpeg = app(SlideshowRenderer::class)->render(
                $this->photoDataUri(),
                'Shot de retinol coreano todos os dias em jejum',
                'center',
                $preset,
            );

            $size = getimagesizefromstring($jpeg);

            $this->assertSame(SlideshowRenderer::WIDTH, $size[0], "{$preset->label()} rendered at the wrong width.");
            $this->assertSame(SlideshowRenderer::HEIGHT, $size[1], "{$preset->label()} rendered at the wrong height.");
        }
    }

    public function test_neon_glows_in_tiktok_cyan_and_the_others_do_not_glow(): void
    {
        $this->assertSame([0, 242, 234], SlideTextPreset::Neon->glow()['color']);
        // Neon separates itself with light, so it draws no black outline.
        $this->assertSame(0, SlideTextPreset::Neon->stroke()['rings']);

        foreach (SlideTextPreset::cases() as $preset) {
            if ($preset === SlideTextPreset::Neon) {
                continue;
            }

            $this->assertNull($preset->glow(), "{$preset->label()} should not glow.");
            $this->assertGreaterThan(0, $preset->stroke()['rings'], "{$preset->label()} needs an outline to stay legible.");
        }
    }

    public function test_the_neon_bloom_lands_cyan_pixels_around_the_copy(): void
    {
        $renderer = app(SlideshowRenderer::class);
        $text = 'Shot de retinol coreano todos os dias';

        $cyanInNeon = $this->cyanPixels($renderer->render($this->photoDataUri(), $text, 'center', SlideTextPreset::Neon));
        $cyanInClassic = $this->cyanPixels($renderer->render($this->photoDataUri(), $text, 'center', SlideTextPreset::Classic));

        $this->assertGreaterThan(200, $cyanInNeon, 'Expected a cyan bloom on the Neon preset.');
        $this->assertSame(0, $cyanInClassic, 'Classic should be black and white only.');
    }

    public function test_values_lists_every_case_for_validation(): void
    {
        $this->assertSame(
            ['classic', 'typewriter', 'handwriting', 'serif', 'neon'],
            SlideTextPreset::values(),
        );
    }

    /**
     * Pixels that are clearly cyan: green and blue high, red low.
     */
    private function cyanPixels(string $jpeg): int
    {
        $image = imagecreatefromstring($jpeg);
        $count = 0;

        for ($y = 0; $y < SlideshowRenderer::HEIGHT; $y += 4) {
            for ($x = 0; $x < SlideshowRenderer::WIDTH; $x += 4) {
                $rgb = imagecolorat($image, $x, $y);
                $red = ($rgb >> 16) & 0xFF;
                $green = ($rgb >> 8) & 0xFF;
                $blue = $rgb & 0xFF;

                if ($green > 120 && $blue > 120 && $red < $green - 60) {
                    $count++;
                }
            }
        }

        imagedestroy($image);

        return $count;
    }

    /** A flat dark photo, so the text treatment is the only thing colouring pixels. */
    private function photoDataUri(): string
    {
        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, 40, 40, 40));

        ob_start();
        imagejpeg($image, null, 92);
        imagedestroy($image);

        return 'data:image/jpeg;base64,'.base64_encode((string) ob_get_clean());
    }
}
