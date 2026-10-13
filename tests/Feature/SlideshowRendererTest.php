<?php

namespace Tests\Feature;

use App\Services\Rendering\EmojiSprites;
use App\Services\Rendering\SlideshowRenderer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SlideshowRendererTest extends TestCase
{
    public function test_it_renders_a_jpeg_at_tiktok_dimensions(): void
    {
        $jpeg = $this->renderer()->render($this->photoDataUri(), 'Shot de retinol coreano todos os dias', 'center');

        $size = getimagesizefromstring($jpeg);

        $this->assertSame(SlideshowRenderer::WIDTH, $size[0]);
        $this->assertSame(SlideshowRenderer::HEIGHT, $size[1]);
        $this->assertSame('image/jpeg', $size['mime']);
    }

    public function test_it_downloads_a_remote_photo(): void
    {
        Http::fake(['i.pinimg.com/*' => Http::response($this->photoBinary(), 200, ['Content-Type' => 'image/jpeg'])]);

        $jpeg = $this->renderer()->render('https://i.pinimg.com/originals/a.jpg', 'Um teste', 'bottom');

        $this->assertSame(SlideshowRenderer::WIDTH, getimagesizefromstring($jpeg)[0]);
        Http::assertSent(fn ($request): bool => $request->url() === 'https://i.pinimg.com/originals/a.jpg');
    }

    public function test_text_position_changes_where_the_copy_lands(): void
    {
        $renderer = $this->renderer();
        $photo = $this->photoDataUri();
        $text = 'Estudei quatro anos na Coreia e aprendi tudo isso';

        $top = $this->brightRowsIn($renderer->render($photo, $text, 'top'), 0, 700);
        $bottom = $this->brightRowsIn($renderer->render($photo, $text, 'bottom'), 1200, 1900);

        $this->assertGreaterThan(0, $top, 'Expected white text in the upper band.');
        $this->assertGreaterThan(0, $bottom, 'Expected white text in the lower band.');
    }

    public function test_emoji_are_composited_instead_of_rendered_as_tofu(): void
    {
        Storage::fake('local');
        Http::fake(['cdn.jsdelivr.net/*' => Http::response($this->emojiBinary(), 200)]);

        $jpeg = $this->renderer()->render($this->photoDataUri(), 'Skincare coreano 💛', 'center');

        $this->assertSame(SlideshowRenderer::WIDTH, getimagesizefromstring($jpeg)[0]);
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '1f49b.png'));
        Storage::disk('local')->assertExists('twemoji/1f49b.png');
    }

    public function test_a_second_render_reuses_the_cached_emoji(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('twemoji/1f49b.png', $this->emojiBinary());
        Http::fake();

        $this->renderer()->render($this->photoDataUri(), 'Skincare coreano 💛', 'center');

        Http::assertNothingSent();
    }

    public function test_flag_emoji_map_to_their_regional_indicator_pair(): void
    {
        $this->assertSame('1f1f0-1f1f7', (new EmojiSprites)->assetName('🇰🇷'));
        $this->assertSame('1f49b', (new EmojiSprites)->assetName('💛'));
    }

    private function renderer(): SlideshowRenderer
    {
        return app(SlideshowRenderer::class);
    }

    /**
     * Count rows in a band that contain near-white pixels — a cheap proxy for
     * "the text was drawn here", since the source photo is mid-grey.
     */
    private function brightRowsIn(string $jpeg, int $from, int $to): int
    {
        $image = imagecreatefromstring($jpeg);
        $rows = 0;

        for ($y = $from; $y < $to; $y += 8) {
            for ($x = 0; $x < SlideshowRenderer::WIDTH; $x += 8) {
                $rgb = imagecolorat($image, $x, $y);

                if ((($rgb >> 16) & 0xFF) > 230 && (($rgb >> 8) & 0xFF) > 230 && ($rgb & 0xFF) > 230) {
                    $rows++;

                    break;
                }
            }
        }

        imagedestroy($image);

        return $rows;
    }

    private function photoDataUri(): string
    {
        return 'data:image/jpeg;base64,'.base64_encode($this->photoBinary());
    }

    /** A flat mid-grey portrait photo, so white text is unambiguous in assertions. */
    private function photoBinary(): string
    {
        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, 110, 110, 110));

        ob_start();
        imagejpeg($image, null, 90);
        imagedestroy($image);

        return (string) ob_get_clean();
    }

    private function emojiBinary(): string
    {
        $image = imagecreatetruecolor(72, 72);
        imagefill($image, 0, 0, imagecolorallocate($image, 250, 200, 40));

        ob_start();
        imagepng($image);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
