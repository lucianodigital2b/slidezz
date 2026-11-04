<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectBasedOnCountry
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // The landing follows the browser language: a Portuguese-first browser
        // (Accept-Language) gets the pt-BR landing at /br. Anything else, and
        // crawlers that send no language, stay on the English landing at /.
        if ($request->path() === '/' && $request->getPreferredLanguage(['en', 'pt']) === 'pt') {
            return redirect()->route('home.br');
        }

        return $next($request);
    }
}
