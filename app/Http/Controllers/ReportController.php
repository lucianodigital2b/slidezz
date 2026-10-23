<?php

namespace App\Http\Controllers;

use App\Models\SocialAccount;
use App\Models\Workspace;
use App\Services\Reports\ReportBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;

/**
 * Metricool-style client reports: an on-screen preview and a white-label PDF,
 * both built from the same {@see ReportBuilder} payload for a date range.
 */
class ReportController extends Controller
{
    /** Report sections the user can toggle. */
    private const SECTIONS = ['summary', ...ReportBuilder::PLATFORMS];

    public function __construct(private readonly ReportBuilder $builder) {}

    public function index(Request $request): Response
    {
        [$start, $end, $config, $preset] = $this->resolve($request);

        return Inertia::render('Reports', [
            'report' => $this->builder->build($request->user()->id, $start, $end, $config),
            'config' => $config,
            'preset' => $preset,
            'range' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'connectedPlatforms' => $this->connectedPlatforms($request->user()->id),
            'brand' => $this->brand($request),
            'sortOptions' => array_keys(ReportBuilder::SORT_COLUMNS),
        ]);
    }

    public function pdf(Request $request): PdfBuilder
    {
        [$start, $end, $config] = $this->resolve($request);

        $report = $this->builder->build($request->user()->id, $start, $end, $config);
        $filename = 'relatorio-'.$start->toDateString().'_'.$end->toDateString().'.pdf';

        return Pdf::view('reports.pdf', [
            'report' => $report,
            'config' => $config,
            'brand' => $this->brand($request, embedLogo: true),
        ])
            ->format('a4')
            ->download($filename);
    }

    /**
     * Resolve the date range, section config, and the period preset from the request.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: array<string, array{enabled: bool, sort: string, max_rows: int}>, 3: int|string}
     */
    private function resolve(Request $request): array
    {
        $validated = $request->validate([
            'period' => ['nullable', 'integer', 'in:7,30,90'],
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date', 'after_or_equal:start'],
            'sections' => ['nullable', 'array'],
            'sections.*.enabled' => ['nullable', 'boolean'],
            'sections.*.sort' => ['nullable', 'string', 'in:'.implode(',', array_keys(ReportBuilder::SORT_COLUMNS))],
            'sections.*.max_rows' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        if (! empty($validated['start']) && ! empty($validated['end'])) {
            $start = CarbonImmutable::parse($validated['start'])->startOfDay();
            $end = CarbonImmutable::parse($validated['end'])->endOfDay();
            $preset = 'custom';
        } else {
            $preset = (int) ($validated['period'] ?? 30);
            $end = CarbonImmutable::now()->endOfDay();
            $start = $end->subDays($preset - 1)->startOfDay();
        }

        return [$start, $end, $this->sectionConfig($validated['sections'] ?? []), $preset];
    }

    /**
     * Merge the requested section toggles over the defaults. Summary has no table,
     * so it only carries an `enabled` flag; the platform defaults mirror Metricool.
     *
     * @param  array<string, mixed>  $requested
     * @return array<string, array{enabled: bool, sort: string, max_rows: int}>
     */
    private function sectionConfig(array $requested): array
    {
        $config = [];

        foreach (self::SECTIONS as $section) {
            $given = is_array($requested[$section] ?? null) ? $requested[$section] : [];

            $config[$section] = [
                'enabled' => (bool) ($given['enabled'] ?? true),
                'sort' => isset($given['sort']) && array_key_exists($given['sort'], ReportBuilder::SORT_COLUMNS)
                    ? $given['sort']
                    : 'likes',
                'max_rows' => (int) ($given['max_rows'] ?? 20),
            ];
        }

        return $config;
    }

    /**
     * @return list<string>
     */
    private function connectedPlatforms(int $userId): array
    {
        return SocialAccount::query()
            ->whereIn('workspace_id', Workspace::query()->where('owner_id', $userId)->select('id'))
            ->whereIn('provider', ReportBuilder::PLATFORMS)
            ->distinct()
            ->pluck('provider')
            ->all();
    }

    /**
     * White-label header data. For the PDF the logo is embedded as a data URI so
     * headless Chromium never has to fetch it over the network.
     *
     * @return array{name: string, color: string, logo: string|null}
     */
    private function brand(Request $request, bool $embedLogo = false): array
    {
        $workspace = Workspace::where('owner_id', $request->user()->id)->first();
        $profile = $workspace?->profile ?? [];
        $logoPath = $workspace?->logo_path ?? data_get($profile, 'logo_path');

        $logo = null;
        if ($logoPath) {
            $logo = $embedLogo && Storage::disk('public')->exists($logoPath)
                ? 'data:'.Storage::disk('public')->mimeType($logoPath).';base64,'.base64_encode(Storage::disk('public')->get($logoPath))
                : Storage::url($logoPath);
        }

        return [
            'name' => data_get($profile, 'brand_name', $workspace?->name ?? 'Slidezz'),
            'color' => $workspace?->brand_color ?: '#1A1A1A',
            'logo' => $logo,
        ];
    }
}
