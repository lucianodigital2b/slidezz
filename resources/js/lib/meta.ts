// Meta Pixel + Conversions API helper.
//
// Conversion events fire the browser Pixel AND mirror to the server (CAPI) with
// the same event_id so Meta deduplicates them. PageView is browser-only (high
// volume, low value for CAPI dedup) and is fired on every Inertia navigation.

type MetaParams = Record<string, unknown>;

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
    }
}

function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

function newEventId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Fire a browser-only PageView (used on Inertia navigations). */
export function trackPageView(): void {
    window.fbq?.('track', 'PageView');
}

/**
 * Fire a standard conversion event on the Pixel and mirror it to the
 * Conversions API with a shared event_id for deduplication.
 */
export function trackMeta(eventName: string, customData: MetaParams = {}): void {
    const eventId = newEventId();

    window.fbq?.('track', eventName, customData, { eventID: eventId });

    const xsrf = readCookie('XSRF-TOKEN');

    // Fire-and-forget; never block or break the UX on tracking failures.
    void fetch('/meta/event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        },
        body: JSON.stringify({
            event_name: eventName,
            event_id: eventId,
            event_source_url: window.location.href,
            custom_data: customData,
        }),
        keepalive: true,
    }).catch(() => {});
}
