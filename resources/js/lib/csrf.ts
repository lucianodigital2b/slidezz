/**
 * Headers that pass Laravel's CSRF check on a plain fetch().
 *
 * Laravel 13 lets same-origin requests through on the Sec-Fetch-Site header, but
 * browsers only send it from secure origins, so on an http:// dev domain
 * (slidezz.test) the token is still required. The layout renders no csrf-token
 * meta tag; the XSRF-TOKEN cookie Laravel sets on every response is the token
 * that is actually available.
 */
export function csrfHeaders(): Record<string, string> {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {};
}
