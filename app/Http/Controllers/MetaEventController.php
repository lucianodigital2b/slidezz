<?php

namespace App\Http\Controllers;

use App\Jobs\SendMetaConversionEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MetaEventController extends Controller
{
    /**
     * Standard events the browser is allowed to mirror to the Conversions API.
     *
     * @var list<string>
     */
    private const ALLOWED_EVENTS = [
        'PageView', 'ViewContent', 'Lead', 'CompleteRegistration',
        'InitiateCheckout', 'AddToCart', 'Contact', 'Search',
        'Subscribe', 'StartTrial', 'Purchase',
    ];

    /**
     * Receive a browser Pixel event and forward it to CAPI with the same
     * event_id (for deduplication), enriched with server-side match signals.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'event_name' => ['required', 'string', Rule::in(self::ALLOWED_EVENTS)],
            'event_id' => ['required', 'string', 'max:100'],
            'event_source_url' => ['nullable', 'string', 'max:2048'],
            'custom_data' => ['nullable', 'array'],
        ]);

        $userData = array_filter([
            'email' => $request->user()?->email,
            'external_id' => $request->user()?->id ? (string) $request->user()->id : null,
            'fbp' => $request->cookie('_fbp'),
            'fbc' => $request->cookie('_fbc'),
            'client_ip_address' => $request->ip(),
            'client_user_agent' => $request->userAgent(),
        ]);

        SendMetaConversionEvent::dispatchAfterResponse(
            $validated['event_name'],
            $validated['event_id'],
            $userData,
            $validated['custom_data'] ?? [],
            $validated['event_source_url'] ?? null,
        );

        return response()->noContent();
    }
}
