<?php

namespace App\Http\Controllers;

use App\Enums\SlideTextPreset;
use App\Jobs\BuildSlideshowFromHook;
use App\Models\ContentProject;
use App\Models\Workspace;
use App\Services\Slides\HookCsvParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Turns a CSV of hooks into one carousel per row, dressed with photos from the
 * workspace's media library.
 *
 * The counterpart to {@see SlideshowGeneratorController}, which starts from a
 * topic and lets the model write the hook.
 */
class HookCsvController extends Controller
{
    public function __construct(private readonly HookCsvParser $parser) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required_without:hooks', 'file', 'mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel', 'max:2048'],
            'hooks' => ['required_without:file', 'string', 'max:20000'],
            'slide_count' => ['nullable', 'integer', 'min:2', 'max:12'],
            'image_source' => ['nullable', 'string', 'in:pinterest,ai'],
            'text_position' => ['nullable', 'string', 'in:top,center,bottom'],
            'text_preset' => ['nullable', Rule::in(SlideTextPreset::values())],
            'language' => ['nullable', 'string', 'max:50'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        if (! $request->user()->hasPremiumAccess()) {
            return response()->json([
                'error' => 'premium_required',
                'message' => 'Ative o acesso vitalício para gerar carrosséis de TikTok.',
            ], 402);
        }

        $csv = isset($validated['file'])
            ? (string) file_get_contents($request->file('file')->getRealPath())
            : $validated['hooks'];

        $hooks = $this->parser->parse($csv, $validated['limit'] ?? 20);

        if ($hooks === []) {
            return response()->json([
                'error' => 'no_hooks',
                'message' => 'Nenhum hook encontrado no arquivo.',
            ], 422);
        }

        $workspace = $this->workspace($request);
        $projects = [];

        foreach ($hooks as $hook) {
            $project = ContentProject::create([
                'workspace_id' => $workspace->id,
                'title' => Str::limit($hook, 120, ''),
                'type' => 'slideshow',
                'status' => 'generating',
                'script_data' => [
                    'hook' => $hook,
                    'source' => 'hook_csv',
                    'slide_count' => $validated['slide_count'] ?? 6,
                    'image_source' => $validated['image_source'] ?? 'pinterest',
                    'text_position' => $validated['text_position'] ?? 'center',
                    'text_preset' => $validated['text_preset'] ?? SlideTextPreset::Classic->value,
                    'language' => $validated['language'] ?? 'Portuguese (Brazil)',
                ],
            ]);

            BuildSlideshowFromHook::dispatch($project);

            $projects[] = ['id' => $project->id, 'hook' => $hook];
        }

        return response()->json([
            'queued' => count($projects),
            'projects' => $projects,
        ], 202);
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }
}
