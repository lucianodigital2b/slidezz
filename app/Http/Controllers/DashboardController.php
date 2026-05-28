<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $showWelcome = $user->welcome_shown_at === null;

        if ($showWelcome) {
            $user->welcome_shown_at = now();
            $user->save();
        }

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $search = $request->string('search')->trim()->toString();

        $projects = $workspace
            ? SlideProject::where('workspace_id', $workspace->id)
                ->when($search, fn ($q) => $q->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('prompt', 'like', "%{$search}%");
                }))
                ->latest()
                ->paginate(12)
                ->withQueryString()
                ->through(fn (SlideProject $p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'format' => $p->format,
                    'template' => $p->template,
                    'prompt' => $p->prompt,
                    'slide_count' => count($p->slides ?? []),
                    'cover_color' => data_get($p->slides, '0.background', '#1a1a1a'),
                    'first_slide' => data_get($p->slides, '0'),
                    'created_at' => $p->created_at->diffForHumans(),
                ])
            : new LengthAwarePaginator([], 0, 12);

        return Inertia::render('dashboard', [
            'projects' => $projects,
            'search' => $search,
            'show_welcome' => $showWelcome,
        ]);
    }
}
