<?php

namespace App\Contracts;

use App\Exceptions\ImageSourceException;
use App\Models\Asset;
use App\Services\Images\ImageSourceFactory;

/**
 * A provider of background photos for a generated slideshow.
 *
 * Implementations are resolved through {@see ImageSourceFactory},
 * mirroring the strategy pattern already used by {@see SocialPublisher}.
 */
interface ImageSource
{
    /**
     * Find photos matching a search query.
     *
     * @param  list<string>  $excludeUrls  Photos already used by the workspace, so a
     *                                     slideshow never repeats a picture.
     * @return list<array{url: string, width: int, height: int, source_id: ?string}>
     *
     * @throws ImageSourceException
     */
    public function search(string $query, int $limit, array $excludeUrls = []): array;

    /**
     * Short identifier stored on the {@see Asset} metadata.
     */
    public function name(): string;
}
