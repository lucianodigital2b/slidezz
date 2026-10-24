<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

/**
 * Pings IndexNow (Bing + Brave) so a just published or updated URL gets crawled fast.
 * No-op when no key is configured.
 */
class SubmitToIndexNow implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<string>  $urls
     */
    public function __construct(public array $urls) {}

    public function handle(): void
    {
        $key = (string) config('services.indexnow.key');
        $urls = array_values(array_unique(array_filter($this->urls)));

        if ($key === '' || $urls === []) {
            return;
        }

        $host = parse_url((string) config('app.url'), PHP_URL_HOST);

        Http::timeout(10)->post('https://api.indexnow.org/indexnow', [
            'host' => $host,
            'key' => $key,
            'keyLocation' => rtrim((string) config('app.url'), '/')."/{$key}.txt",
            'urlList' => $urls,
        ]);
    }
}
