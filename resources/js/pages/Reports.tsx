import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    FileDown, ChevronDown, ArrowUp, ArrowDown, Minus,
    Eye, Heart, MessageCircle, Share2, TrendingUp, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Metric = 'posts' | 'views' | 'likes' | 'comments' | 'shares' | 'engagement_rate';

interface Totals {
    posts: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
}

type Deltas = Record<Metric, number | null>;

interface Post {
    id: number;
    title: string;
    handle: string;
    avatar: string | null;
    published_at: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    engagement_rate: number;
    synced: boolean;
}

interface PlatformSection {
    totals: Totals;
    deltas: Deltas;
    posts: Post[];
}

interface Report {
    period: { start: string; end: string; label: string; days: number };
    comparison: { start: string; end: string; label: string; days: number };
    summary: { current: Totals; deltas: Deltas; by_platform: Record<string, Totals> };
    platforms: Record<string, PlatformSection>;
}

interface SectionConfig {
    enabled: boolean;
    sort: string;
    max_rows: number;
}

type Config = Record<string, SectionConfig>;

interface Props {
    report: Report;
    config: Config;
    preset: number | 'custom';
    range: { start: string; end: string };
    connectedPlatforms: string[];
    brand: { name: string; color: string; logo: string | null };
    sortOptions: string[];
}

const PLATFORMS = ['instagram', 'tiktok'] as const;
const PLATFORM_LABELS: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok' };
const PLATFORM_DOT: Record<string, string> = { instagram: '#E1306C', tiktok: '#111111' };

const PERIODS = [
    { value: 7, label: '7 dias' },
    { value: 30, label: '30 dias' },
    { value: 90, label: '90 dias' },
];

const SORT_LABELS: Record<string, string> = {
    views: 'Views',
    likes: 'Curtidas',
    comments: 'Comentários',
    shares: 'Compart.',
    engagement_rate: 'Engajamento',
    date: 'Data',
};

const SUMMARY_CARDS: { key: Metric; label: string; icon: typeof Eye; percent?: boolean }[] = [
    { key: 'views', label: 'Visualizações', icon: Eye },
    { key: 'likes', label: 'Curtidas', icon: Heart },
    { key: 'comments', label: 'Comentários', icon: MessageCircle },
    { key: 'shares', label: 'Compart.', icon: Share2 },
    { key: 'engagement_rate', label: 'Engajamento', icon: TrendingUp, percent: true },
    { key: 'posts', label: 'Publicações', icon: FileText },
];

const TABLE_COLUMNS: { key: keyof Post; label: string; percent?: boolean }[] = [
    { key: 'views', label: 'Views' },
    { key: 'likes', label: 'Curtidas' },
    { key: 'comments', label: 'Coment.' },
    { key: 'shares', label: 'Compart.' },
    { key: 'bookmarks', label: 'Salvos' },
    { key: 'engagement_rate', label: 'Eng.', percent: true },
];

function formatNumber(n: number): string {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(n));
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Delta({ value }: { value: number | null }) {
    if (value === null) return <span className="inline-flex items-center gap-0.5 text-gray-400"><Minus className="w-3 h-3" />—</span>;
    if (value === 0) return <span className="text-gray-400">0%</span>;
    const up = value > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(value)}%
        </span>
    );
}

export default function Reports({ report, config, preset, range, connectedPlatforms, brand, sortOptions }: Props) {
    const [cfg, setCfg] = useState<Config>(config);
    const [period, setPeriod] = useState<number | 'custom'>(preset);
    const [loading, setLoading] = useState(false);

    /** Build the shared query string for both a refetch and the PDF download link. */
    const toQuery = (nextCfg: Config, nextPeriod: number | 'custom'): string => {
        const p = new URLSearchParams();
        if (nextPeriod === 'custom') {
            p.set('start', range.start);
            p.set('end', range.end);
        } else {
            p.set('period', String(nextPeriod));
        }
        for (const [key, c] of Object.entries(nextCfg)) {
            p.set(`sections[${key}][enabled]`, c.enabled ? '1' : '0');
            if (key !== 'summary') {
                p.set(`sections[${key}][sort]`, c.sort);
                p.set(`sections[${key}][max_rows]`, String(c.max_rows));
            }
        }
        return p.toString();
    };

    /** Period and sort/limit changes need fresh server data; enable toggles don't. */
    const refetch = (nextCfg: Config, nextPeriod: number | 'custom') => {
        setLoading(true);
        router.get(`/reports?${toQuery(nextCfg, nextPeriod)}`, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onFinish: () => setLoading(false),
        });
    };

    const handlePeriod = (value: number) => {
        setPeriod(value);
        refetch(cfg, value);
    };

    const toggleSection = (key: string) => {
        setCfg((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
    };

    const changeSort = (key: string, sort: string) => {
        const next = { ...cfg, [key]: { ...cfg[key], sort } };
        setCfg(next);
        refetch(next, period);
    };

    const changeMaxRows = (key: string, maxRows: number) => {
        const next = { ...cfg, [key]: { ...cfg[key], max_rows: maxRows } };
        setCfg(next);
        refetch(next, period);
    };

    const pdfHref = `/reports/pdf?${toQuery(cfg, period)}`;

    return (
        <>
            <Head title="Relatórios" />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Relatórios</h1>
                        <p className="text-sm text-gray-500">
                            {report.period.label} · comparado a {report.comparison.label}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={period === 'custom' ? 'custom' : period}
                                onChange={(e) => handlePeriod(Number(e.target.value))}
                                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFE156] cursor-pointer"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                                {period === 'custom' && <option value="custom">Personalizado</option>}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <a href={pdfHref}>
                            <Button
                                size="sm"
                                className="flex items-center gap-2 bg-[#1A1A1A] text-white hover:bg-black rounded-lg text-sm"
                            >
                                <FileDown className="w-3.5 h-3.5" /> Gerar PDF
                            </Button>
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                    {/* Sections config */}
                    <aside className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
                        <h2 className="text-sm font-semibold text-gray-900 mb-1">Seções</h2>
                        <p className="text-xs text-gray-400 mb-4">Escolha o que entra no relatório.</p>

                        <SectionToggle
                            label="Resumo"
                            enabled={cfg.summary?.enabled ?? true}
                            onToggle={() => toggleSection('summary')}
                        />

                        {PLATFORMS.map((platform) => (
                            <div key={platform} className="mt-3 pt-3 border-t border-gray-50">
                                <SectionToggle
                                    label={PLATFORM_LABELS[platform]}
                                    enabled={cfg[platform]?.enabled ?? true}
                                    note={connectedPlatforms.includes(platform) ? undefined : 'sem conta conectada'}
                                    onToggle={() => toggleSection(platform)}
                                />
                                {cfg[platform]?.enabled && (
                                    <div className="mt-2.5 pl-1 space-y-2.5">
                                        <label className="block">
                                            <span className="text-xs text-gray-500">Ordenar por</span>
                                            <select
                                                value={cfg[platform].sort}
                                                onChange={(e) => changeSort(platform, e.target.value)}
                                                className="mt-1 w-full appearance-none bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFE156]"
                                            >
                                                {sortOptions.map((s) => (
                                                    <option key={s} value={s}>{SORT_LABELS[s] ?? s}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="text-xs text-gray-500">Máx. de linhas</span>
                                            <select
                                                value={cfg[platform].max_rows}
                                                onChange={(e) => changeMaxRows(platform, Number(e.target.value))}
                                                className="mt-1 w-full appearance-none bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFE156]"
                                            >
                                                {[5, 10, 20, 50, 100].map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
                    </aside>

                    {/* Live preview */}
                    <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {/* Brand header strip */}
                        <div
                            className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-4"
                            style={{ borderTopColor: brand.color, borderTopWidth: 3 }}
                        >
                            {brand.logo ? (
                                <img src={brand.logo} alt={brand.name} className="max-h-9 max-w-[200px] object-contain" />
                            ) : (
                                <span className="text-lg font-bold" style={{ color: brand.color }}>{brand.name}</span>
                            )}
                            <span className="text-xs text-gray-400">Pré-visualização do relatório</span>
                        </div>

                        {(cfg.summary?.enabled ?? true) && (
                            <section>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumo</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                                    {SUMMARY_CARDS.map(({ key, label, icon: Icon, percent }) => (
                                        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
                                                <Icon className="w-3.5 h-3.5" /> {label}
                                            </div>
                                            <p className="text-xl font-bold text-gray-900">
                                                {percent ? `${report.summary.current[key]}%` : formatNumber(report.summary.current[key])}
                                            </p>
                                            <p className="text-xs mt-1">
                                                <Delta value={report.summary.deltas[key]} />
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {PLATFORMS.map((platform) => {
                            if (!(cfg[platform]?.enabled ?? true)) return null;
                            const section = report.platforms[platform];
                            return (
                                <section key={platform} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_DOT[platform] }} />
                                        <h3 className="text-sm font-semibold text-gray-900">{PLATFORM_LABELS[platform]}</h3>
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {formatNumber(section.totals.views)} views · {section.totals.engagement_rate}% eng · {section.totals.posts} posts
                                        </span>
                                    </div>
                                    {section.posts.length === 0 ? (
                                        <p className="px-5 py-10 text-center text-sm text-gray-400">
                                            Nenhuma publicação nesse período.
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100">
                                                        <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Publicação</th>
                                                        {TABLE_COLUMNS.map((col) => (
                                                            <th key={col.key} className="text-right text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{col.label}</th>
                                                        ))}
                                                        <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Data</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {section.posts.map((post) => (
                                                        <tr key={post.id} className="border-t border-gray-50">
                                                            <td className="px-5 py-3">
                                                                <p className="text-sm font-medium text-gray-900">@{post.handle}</p>
                                                                <p className="text-xs text-gray-400 truncate max-w-[220px]" title={post.title}>{post.title}</p>
                                                            </td>
                                                            {TABLE_COLUMNS.map((col) => (
                                                                <td key={col.key} className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                                                                    {!post.synced
                                                                        ? <span className="text-gray-300">—</span>
                                                                        : col.percent
                                                                            ? `${post[col.key]}%`
                                                                            : formatNumber(post[col.key] as number)}
                                                                </td>
                                                            ))}
                                                            <td className="px-5 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{formatDate(post.published_at)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

function SectionToggle({ label, enabled, note, onToggle }: { label: string; enabled: boolean; note?: string; onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <span className="text-sm font-medium text-gray-900">{label}</span>
                {note && <span className="block text-xs text-amber-500">{note}</span>}
            </div>
            <button
                type="button"
                onClick={onToggle}
                className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
                aria-pressed={enabled}
            >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-4' : ''}`} />
            </button>
        </div>
    );
}
