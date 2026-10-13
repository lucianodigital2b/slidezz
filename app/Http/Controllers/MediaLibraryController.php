<?php

namespace App\Http\Controllers;

use App\Jobs\ImportPinterestSearchToLibrary;
use App\Models\Asset;
use App\Models\MediaLibraryItem;
use App\Models\Workspace;
use App\Services\Media\MediaLibrary;
use App\Services\Media\MediaMatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The workspace's saved photos.
 *
 * Unlike {@see Asset}, which only ever remembered a remote URL so the
 * generator could avoid repeats, library items are files the workspace owns plus
 * the descriptive metadata {@see MediaMatcher} scores hooks against.
 */
class MediaLibraryController extends Controller
{
    public function __construct(private readonly MediaLibrary $library) {}

    public function index(Request $request): Response
    {
        $workspace = $this->workspace($request);

        $items = MediaLibraryItem::forWorkspace($workspace->id)
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(fn (MediaLibraryItem $item): array => $this->summarize($item))
            ->all();

        return Inertia::render('MediaLibrary', [
            'items' => $items,
            'stats' => [
                'total' => MediaLibraryItem::forWorkspace($workspace->id)->count(),
                'described' => MediaLibraryItem::forWorkspace($workspace->id)->whereNotNull('described_at')->count(),
                'embedded' => MediaLibraryItem::forWorkspace($workspace->id)->whereNotNull('embedding')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'files' => ['required', 'array', 'max:30'],
            'files.*' => ['file', 'image', 'max:12288'],
        ]);

        $workspace = $this->workspace($request);
        $stored = 0;

        foreach ($validated['files'] as $file) {
            $this->library->storeFromUpload($workspace, $file);
            $stored++;
        }

        return back()->with('success', "{$stored} mídia(s) salvas na biblioteca.");
    }

    /**
     * Stocks the library from a keyword search without generating a carousel.
     */
    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        ImportPinterestSearchToLibrary::dispatch(
            $this->workspace($request),
            $validated['query'],
            $validated['limit'] ?? 20,
        );

        return back()->with('success', 'Importação iniciada. As fotos aparecem aqui conforme chegam.');
    }

    public function destroy(Request $request, MediaLibraryItem $mediaLibraryItem): RedirectResponse
    {
        abort_unless($mediaLibraryItem->workspace_id === $this->workspace($request)->id, 403);

        $this->library->delete($mediaLibraryItem);

        return back()->with('success', 'Mídia removida.');
    }

    /**
     * @return array<string, mixed>
     */
    private function summarize(MediaLibraryItem $item): array
    {
        return [
            'id' => $item->id,
            'url' => $item->publicUrl(),
            'width' => $item->width,
            'height' => $item->height,
            'orientation' => $item->orientation,
            'source' => $item->source,
            'description' => $item->description,
            'keywords' => $item->keywords ?? [],
            'colors' => $item->colors ?? [],
            'mood' => $item->mood,
            'described' => $item->described_at !== null,
            'embedded' => $item->embedding !== null,
            'used_count' => $item->used_count,
        ];
    }

    private function workspace(Request $request): Workspace
    {
        return Workspace::where('owner_id', $request->user()->id)->firstOrFail();
    }
}
