<?php

namespace App\Http\Controllers;

use App\Models\SlideProject;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();

        $projects = $workspace
            ? SlideProject::where('workspace_id', $workspace->id)
                ->latest()
                ->paginate(12)
                ->through(fn (SlideProject $p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'format' => $p->format,
                    'template' => $p->template,
                    'prompt' => $p->prompt,
                    'slide_count' => count($p->slides ?? []),
                    'cover_color' => data_get($p->slides, '0.background', '#1a1a1a'),
                    'created_at' => $p->created_at->diffForHumans(),
                ])
            : collect()->paginate(12);

        return Inertia::render('dashboard', [
            'projects' => $projects,
        ]);
    }
}
