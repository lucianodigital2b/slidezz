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
        // Any Portuguese in Accept-Language sends the visitor to the pt-BR
        // landing at /br, even when English comes first (a Brazilian with an
        // English Chrome sends "en-US, en, pt-BR, pt"). Crawlers send no
        // language and stay on the English landing at /. Visitors without pt
        // but on a Brazilian timezone are redirected by the landing itself.
        if ($request->path() === '/' && $this->acceptsPortuguese($request)) {
            return redirect()->route('home.br');
        }

        return $next($request);
    }

    private function acceptsPortuguese(Request $request): bool
    {
        foreach ($request->getLanguages() as $language) {
            if (str_starts_with(strtolower($language), 'pt')) {
                return true;
            }
        }

        return false;
    }
}
