<?php

namespace Tests\Feature;

use App\Exceptions\ImageSourceException;
use App\Services\AI\CarouselGenerationService;
use App\Services\Images\AiImageSource;
use Mockery;
use Tests\TestCase;

class AiImageSourceTest extends TestCase
{
    public function test_it_generates_one_portrait_image_per_slide(): void
    {
        $carousel = Mockery::mock(CarouselGenerationService::class);
        $carousel->shouldReceive('generateImageWithGemini')
            ->twice()
            ->with('korean skincare shelfie', '9:16', 'user-key')
            ->andReturn($this->pngDataUri());

        $images = (new AiImageSource($carousel, 'user-key'))->search('korean skincare shelfie', 2);

        $this->assertCount(2, $images);
        $this->assertSame(1080, $images[0]['width']);
        $this->assertSame(1920, $images[0]['height']);
        $this->assertNull($images[0]['source_id']);
        $this->assertSame('ai', (new AiImageSource($carousel))->name());
    }

    public function test_a_generation_failure_never_falls_back_to_stock_photos(): void
    {
        $carousel = Mockery::mock(CarouselGenerationService::class);
        $carousel->shouldReceive('generateImageWithGemini')->andThrow(new \RuntimeException('quota exceeded'));
        // generateImage() and generateImageWithUnsplash() both substitute an Unsplash
        // photo on failure; the TikTok pipeline must surface the error instead.
        $carousel->shouldNotReceive('generateImage');
        $carousel->shouldNotReceive('generateImageWithUnsplash');

        $this->expectException(ImageSourceException::class);
        $this->expectExceptionMessageMatches('/quota exceeded/');

        (new AiImageSource($carousel, 'user-key'))->search('korean skincare shelfie', 1);
    }

    private function pngDataUri(): string
    {
        $image = imagecreatetruecolor(1080, 1920);
        imagefill($image, 0, 0, imagecolorallocate($image, 120, 120, 120));

        ob_start();
        imagepng($image);
        imagedestroy($image);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }
}
