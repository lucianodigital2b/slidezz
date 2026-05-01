<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Stevebauman\Location\Facades\Location;
use Symfony\Component\HttpFoundation\Response;

class RedirectBasedOnCountry
{
    private const PORTUGUESE_COUNTRIES = ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only redirect if visiting the root domain directly
        if ($request->path() === '/') {
            // Cloudflare header is the fastest and most reliable signal
            $countryCode = $request->header('CF-IPCountry');

            if (! $countryCode) {
                try {
                    $position = Location::get($request->ip());
                    $countryCode = $position?->countryCode;
                } catch (\Throwable) {
                    // Detection failed — don't redirect
                }
            }

            // If the user is from Brazil, redirect to the PT-BR landing page
            if ($countryCode === 'BR') {
                return redirect()->route('home.br');
            }
        }

        return $next($request);
    }
}
