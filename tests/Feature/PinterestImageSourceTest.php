<?php

namespace Tests\Feature;

use App\Exceptions\ImageSourceException;
use App\Services\Images\PinterestImageSource;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PinterestImageSourceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The guest session is cached for 50 minutes; tests must not share one.
        Cache::flush();
    }

    public function test_it_returns_portrait_pins_from_search(): void
    {
        $this->fakePinterest([
            $this->searchResponse([
                $this->pin('1', 'https://i.pinimg.com/originals/a.jpg', 1080, 1920),
                $this->pin('2', 'https://i.pinimg.com/originals/b.jpg', 900, 1600),
            ]),
        ]);

        $images = (new PinterestImageSource)->search('korean skincare', 2);

        $this->assertCount(2, $images);
        $this->assertEqualsCanonicalizing(
            ['https://i.pinimg.com/originals/a.jpg', 'https://i.pinimg.com/originals/b.jpg'],
            array_column($images, 'url'),
        );
        $this->assertSame('pinterest', (new PinterestImageSource)->name());
    }

    public function test_it_drops_landscape_small_and_non_pin_results(): void
    {
        $this->fakePinterest([
            $this->searchResponse([
                $this->pin('1', 'https://i.pinimg.com/originals/wide.jpg', 1920, 1080),
                $this->pin('2', 'https://i.pinimg.com/originals/tiny.jpg', 400, 800),
                ['type' => 'story', 'id' => '3', 'images' => ['orig' => ['url' => 'https://i.pinimg.com/originals/story.jpg', 'width' => 1080, 'height' => 1920]]],
                $this->pin('4', 'https://i.pinimg.com/originals/good.jpg', 1080, 1920),
            ]),
        ]);

        $images = (new PinterestImageSource)->search('korean skincare', 5);

        $this->assertSame(['https://i.pinimg.com/originals/good.jpg'], array_column($images, 'url'));
    }

    public function test_it_skips_already_used_photos(): void
    {
        $this->fakePinterest([
            $this->searchResponse([
                $this->pin('1', 'https://i.pinimg.com/originals/used.jpg', 1080, 1920),
                $this->pin('2', 'https://i.pinimg.com/originals/fresh.jpg', 1080, 1920),
            ]),
        ]);

        $images = (new PinterestImageSource)->search('korean skincare', 5, ['https://i.pinimg.com/originals/used.jpg']);

        $this->assertSame(['https://i.pinimg.com/originals/fresh.jpg'], array_column($images, 'url'));
    }

    public function test_it_follows_the_bookmark_to_a_second_page(): void
    {
        $this->fakePinterest([
            $this->searchResponse([$this->pin('1', 'https://i.pinimg.com/originals/page1.jpg', 1080, 1920)], 'BOOKMARK-2'),
            $this->searchResponse([$this->pin('2', 'https://i.pinimg.com/originals/page2.jpg', 1080, 1920)]),
        ]);

        $images = (new PinterestImageSource)->search('korean skincare', 2);

        $this->assertCount(2, $images);
    }

    public function test_a_blocked_search_throws_and_clears_the_cached_session(): void
    {
        $this->fakePinterest([Http::response('forbidden', 403)]);

        try {
            (new PinterestImageSource)->search('korean skincare', 3);
            $this->fail('Expected an ImageSourceException.');
        } catch (ImageSourceException $e) {
            $this->assertStringContainsString('403', $e->getMessage());
        }

        $this->assertNull(Cache::get('pinterest.guest_session'));
    }

    public function test_an_empty_result_set_throws(): void
    {
        $this->fakePinterest([$this->searchResponse([])]);

        $this->expectException(ImageSourceException::class);

        (new PinterestImageSource)->search('korean skincare', 3);
    }

    /**
     * @param  list<Response|PromiseInterface>  $searchResponses
     */
    private function fakePinterest(array $searchResponses): void
    {
        $sequence = Http::sequence();

        foreach ($searchResponses as $response) {
            $sequence->pushResponse($response);
        }

        Http::fake([
            'www.pinterest.com/resource/*' => $sequence->whenEmpty($this->searchResponse([])),
            'www.pinterest.com/' => Http::response('<html></html>', 200, [
                'Set-Cookie' => ['csrftoken=test-token; Path=/', '_pinterest_sess=abc; Path=/'],
            ]),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $results
     */
    private function searchResponse(array $results, string $bookmark = ''): PromiseInterface
    {
        return Http::response([
            'resource_response' => [
                'bookmark' => $bookmark,
                'data' => ['results' => $results],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function pin(string $id, string $url, int $width, int $height): array
    {
        return [
            'type' => 'pin',
            'id' => $id,
            'images' => ['orig' => ['url' => $url, 'width' => $width, 'height' => $height]],
        ];
    }
}
