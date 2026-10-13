<?php

namespace App\Jobs;

use App\Services\Meta\MetaConversionsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendMetaConversionEvent implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $userData
     * @param  array<string, mixed>  $customData
     */
    public function __construct(
        public string $eventName,
        public string $eventId,
        public array $userData = [],
        public array $customData = [],
        public ?string $eventSourceUrl = null,
        public string $actionSource = 'website',
    ) {}

    public function handle(MetaConversionsService $meta): void
    {
        $meta->sendEvent(
            $this->eventName,
            $this->eventId,
            $this->userData,
            $this->customData,
            $this->eventSourceUrl,
            $this->actionSource,
        );
    }
}
