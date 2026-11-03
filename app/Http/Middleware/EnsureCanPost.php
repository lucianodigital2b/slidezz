<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates every social-posting route behind the per-user `can_post` flag
 * (see User::canPost). Generating and downloading stay open to everyone.
 */
class EnsureCanPost
{
    public const MESSAGE = 'A postagem automática ainda não está liberada na sua conta. Baixe o carrossel e poste pelo app da rede.';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->canPost()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'posting_disabled',
                    'message' => self::MESSAGE,
                ], 403);
            }

            if ($request->isMethod('GET')) {
                return redirect()->route('dashboard')->with('error', self::MESSAGE);
            }

            abort(403, self::MESSAGE);
        }

        return $next($request);
    }
}
