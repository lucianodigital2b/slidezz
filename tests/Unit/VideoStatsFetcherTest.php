<?php

namespace Tests\Unit;

use App\Services\Ugc\VideoStatsFetcher;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VideoStatsFetcherTest extends TestCase
{
    public function test_instagram_reel_gets_shortcode_and_og_tags(): void
    {
        Http::fake([
            'www.instagram.com/*' => Http::response(
                '<meta property="og:image" content="https://cdn.example/thumb.jpg" />'
                .'<meta property="og:title" content="hairwithmariangel on Instagram: &quot;my routine&quot;" />'
            ),
        ]);

        $meta = (new VideoStatsFetcher)->fetch('https://www.instagram.com/reel/DfCuZSzIORf/?mdxt=aHlob3lzZGdpd2h2');

        $this->assertSame('instagram', $meta['platform']);
        $this->assertSame('manual', $meta['fetch_status']);
        $this->assertSame('DfCuZSzIORf', $meta['external_id']);
        $this->assertSame('https://cdn.example/thumb.jpg', $meta['thumbnail_url']);
        $this->assertSame('hairwithmariangel', $meta['author_handle']);
    }

    public function test_instagram_shortcode_stops_at_fragment(): void
    {
        Http::fake(['*' => Http::response('')]);

        $meta = (new VideoStatsFetcher)->fetch('https://instagram.com/p/AbC123#comments');

        $this->assertSame('AbC123', $meta['external_id']);
    }
}
