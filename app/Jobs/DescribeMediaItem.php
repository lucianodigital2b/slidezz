<?php

namespace App\Jobs;

use App\Models\MediaLibraryItem;
use App\Services\Media\MediaDescriber;
use App\Services\Media\MediaEmbeddings;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Fills in a library item's descriptive metadata off the request cycle.
 *
 * Described items are what makes matching good, but an undescribed item is still
 * usable, so this never blocks an import.
 */
class DescribeMediaItem implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public int $tries = 2;

    public function __construct(public MediaLibraryItem $item) {}

    public function handle(MediaDescriber $describer, MediaEmbeddings $embeddings): void
    {
        $describer->describe($this->item);

        // The vector is built from what the describer just wrote, so it has to
        // read the row back rather than the stale instance it was queued with.
        $embeddings->store($this->item->refresh());
    }
}
