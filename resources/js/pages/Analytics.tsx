import { Deferred, Head, router, usePage } from '@inertiajs/react';
import {
    Eye,
    Heart,
    MessageCircle,
    TrendingUp,
    RefreshCw,
    LayoutGrid,
    List,
    ChevronDown,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
    Users,
    Film,
    Share2,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { analytics as analyticsRoute } from '@/routes';
import { sync as analyticsSync } from '@/routes/analytics';

interface Post {
    id: number;
    title: string;
    platform: string;
    handle: string;
    avatar: string | null;
    published_at: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    engagement_rate: number;
    last_synced_at: string | null;
}

interface Stats {
    total_views: number;
    total_likes: number;
    total_comments: number;
    avg_engagement_rate: number;
}

interface TikTokVideo {
    id: string;
    title: string;
    cover: string | null;
    url: string | null;
    posted_at: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
}

interface TikTokAccount {
    id: number;
    handle: string;
    avatar: string | null;
    insights: {
        followers: number;
        following: number;
        likes: number;
        videos: number;
        recent: TikTokVideo[];
    } | null;
    error: string | null;
}

interface GrowthAccount {
    account_id: number;
    provider: string;
    handle: string;
    avatar: string | null;
    current_followers: number | null;
    gained: number | null;
    series: { date: string; followers: number | null }[];
}

interface AccountPost {
    id: number;
    provider: string;
    handle: string;
    media_type: 'image' | 'carousel' | 'video' | 'reel';
    caption: string | null;
    permalink: string | null;
    thumbnail_url: string | null;
    posted_at: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    engagement: number;
    engagement_rate: number | null;
    engagement_rate_basis: 'views' | 'followers' | null;
}

interface AccountPostPage {
    data: AccountPost[];
    current_page: number;
    last_page: number;
    total: number;
    sort: AccountPostSortKey;
    dir: SortDir;
}

const PER_PAGE = 25;

function TablePagination({
    current,
    last,
    total,
    onChange,
}: {
    current: number;
    last: number;
    total: number;
    onChange: (page: number) => void;
}) {
    if (last <= 1) {
        return null;
    }

    // First, last, and the neighbours of the current page.
    const pages = Array.from({ length: last }, (_, i) => i + 1).filter(
        (p) => p === 1 || p === last || Math.abs(p - current) <= 1,
    );

    return (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
            <span>
                {(current - 1) * PER_PAGE + 1}–
                {Math.min(current * PER_PAGE, total)} de {total}
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={current === 1}
                    onClick={() => onChange(current - 1)}
                    className="rounded-md px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                    Anterior
                </button>
                {pages.map((p, i) => (
                    <span key={p} className="flex items-center gap-1">
                        {i > 0 && p - pages[i - 1] > 1 && <span>…</span>}
                        <button
                            type="button"
                            onClick={() => onChange(p)}
                            className={`min-w-8 rounded-md px-2 py-1 ${p === current ? 'bg-gray-900 font-medium text-white' : 'hover:bg-gray-100'}`}
                        >
                            {p}
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    disabled={current === last}
                    onClick={() => onChange(current + 1)}
                    className="rounded-md px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                    Próxima
                </button>
            </div>
        </div>
    );
}

interface ContentTypeStat {
    media_type: 'image' | 'carousel' | 'video' | 'reel';
    posts: number;
    avg_likes: number;
    avg_comments: number;
    avg_engagement: number;
    avg_engagement_rate: number | null;
}

interface BestTimeCell {
    weekday: number;
    hour: number;
    posts: number;
    avg_engagement: number;
}

interface Props {
    stats: Stats;
    posts: Post[];
    period: number;
    tiktokAccounts?: TikTokAccount[];
    growth?: GrowthAccount[];
    accountPosts?: AccountPostPage;
    contentTypes?: ContentTypeStat[];
    bestTimes?: BestTimeCell[];
}

type SortKey =
    | 'views'
    | 'likes'
    | 'comments'
    | 'shares'
    | 'bookmarks'
    | 'engagement_rate'
    | 'published_at';
type SortDir = 'asc' | 'desc';

type AccountPostSortKey =
    | 'posted_at'
    | 'likes'
    | 'comments'
    | 'shares'
    | 'saves'
    | 'views'
    | 'engagement'
    | 'engagement_rate';

function formatNumber(n: number): string {
    if (n >= 1_000_000) {
        return (n / 1_000_000).toFixed(1) + 'M';
    }

    if (n >= 1_000) {
        return (n / 1_000).toFixed(1) + 'K';
    }

    return n.toString();
}

/** A post with no stats read yet shows a dash, not zeros it never had. */
function metric(post: Post, value: string): string {
    return post.last_synced_at ? value : '—';
}

function pendingHint(post: Post): string | undefined {
    if (post.last_synced_at) {
        return undefined;
    }

    return post.platform === 'tiktok'
        ? 'Sem dados ainda: poste o rascunho do inbox no TikTok como público e clique em Atualizar.'
        : 'Sem dados ainda: clique em Atualizar.';
}

const STAT_CARDS = [
    { key: 'total_views' as const, label: 'Total de Views', icon: Eye },
    { key: 'total_likes' as const, label: 'Total de Curtidas', icon: Heart },
    {
        key: 'total_comments' as const,
        label: 'Total de Comentários',
        icon: MessageCircle,
    },
    {
        key: 'avg_engagement_rate' as const,
        label: 'Engajamento Médio',
        icon: TrendingUp,
        isPercent: true,
    },
];

const PERIODS = [
    { value: 7, label: '7 dias' },
    { value: 30, label: '30 dias' },
    { value: 90, label: '90 dias' },
];

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: 'views', label: 'Views' },
    { key: 'likes', label: 'Curtidas' },
    { key: 'comments', label: 'Comentários' },
    { key: 'shares', label: 'Compartilhamentos' },
    { key: 'bookmarks', label: 'Salvamentos' },
    { key: 'engagement_rate', label: 'Taxa de Engajamento' },
    { key: 'published_at', label: 'Publicado' },
];

const ACCOUNT_POST_COLUMNS: { key: AccountPostSortKey; label: string }[] = [
    { key: 'posted_at', label: 'Data' },
    { key: 'likes', label: 'Curtidas' },
    { key: 'comments', label: 'Comentários' },
    { key: 'shares', label: 'Shares' },
    { key: 'saves', label: 'Salvos' },
    { key: 'views', label: 'Views' },
    { key: 'engagement', label: 'Engajamento' },
    { key: 'engagement_rate', label: 'Taxa' },
];

function SortIcon({
    column,
    sort,
    dir,
}: {
    column: SortKey | AccountPostSortKey;
    sort: SortKey | AccountPostSortKey;
    dir: SortDir;
}) {
    if (column !== sort) {
        return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-300" />;
    }

    return dir === 'desc' ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5 text-gray-700" />
    ) : (
        <ArrowUp className="ml-1 h-3.5 w-3.5 text-gray-700" />
    );
}

function FollowerChart({
    series,
}: {
    series: { date: string; followers: number | null }[];
}) {
    if (series.length < 2 || series.some((p) => p.followers === null)) {
        return (
            <p className="text-xs text-gray-400">
                Histórico começa a contar a partir de hoje
            </p>
        );
    }

    const width = 300;
    const height = 80;
    const padding = 10;
    const values = series.map((p) => p.followers as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = (width - 2 * padding) / (series.length - 1);
    const points = series.map((p, i) => {
        const x = padding + i * stepX;
        const y =
            height -
            padding -
            (((p.followers as number) - min) / range) * (height - 2 * padding);

        return [x, y];
    });

    const path = points
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
        .join(' ');

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-16 w-full"
            preserveAspectRatio="none"
        >
            <path
                d={path}
                fill="none"
                stroke="#1A2023"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
            {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2" fill="#1A2023" />
            ))}
        </svg>
    );
}

const PROVIDER_LABELS: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
};

function providerLabel(provider: string): string {
    return PROVIDER_LABELS[provider] ?? provider;
}

export default function Analytics({
    stats,
    posts,
    period,
    tiktokAccounts,
    growth = [],
    accountPosts = {
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        sort: 'posted_at',
        dir: 'desc',
    },
    contentTypes = [],
    bestTimes = [],
}: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const [view, setView] = useState<'table' | 'grid'>('table');
    const [sort, setSort] = useState<SortKey>('views');
    const [dir, setDir] = useState<SortDir>('desc');
    const [syncing, setSyncing] = useState(false);
    const [page, setPage] = useState(1);

    const handlePeriod = (p: number) => {
        setPage(1);
        router.get(
            analyticsRoute.url(),
            { period: p },
            { preserveState: true, replace: true },
        );
    };

    const handleSync = () => {
        setSyncing(true);
        router.post(
            analyticsSync.url(),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncing(false),
            },
        );
    };

    const toggleSort = (key: SortKey) => {
        setPage(1);

        if (sort === key) {
            setDir(dir === 'desc' ? 'asc' : 'desc');
        } else {
            setSort(key);
            setDir('desc');
        }
    };

    // Account posts are sorted and paginated on the server.
    const loadAccountPosts = (params: {
        ap_sort: AccountPostSortKey;
        ap_dir: SortDir;
        ap_page: number;
    }) => {
        router.get(
            analyticsRoute.url(),
            { period, ...params },
            {
                only: ['accountPosts'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const toggleAccountSort = (key: AccountPostSortKey) => {
        loadAccountPosts({
            ap_sort: key,
            ap_dir:
                accountPosts.sort === key && accountPosts.dir === 'desc'
                    ? 'asc'
                    : 'desc',
            ap_page: 1,
        });
    };

    const sorted = [...posts].sort((a, b) => {
        const av =
            sort === 'published_at'
                ? new Date(a.published_at).getTime()
                : (a[sort] as number);
        const bv =
            sort === 'published_at'
                ? new Date(b.published_at).getTime()
                : (b[sort] as number);

        return dir === 'desc' ? bv - av : av - bv;
    });

    const lastPage = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    const pagedPosts = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <>
            <Head title="Analytics" />

            <div className="p-6">
                {/* Page Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="mb-1 text-2xl font-bold text-gray-900">
                            Visão Geral de Analytics
                        </h1>
                        <p className="text-sm text-gray-500">
                            Acompanhe suas métricas de desempenho e engajamento
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2 rounded-lg border-gray-200 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                            />
                            Atualizar
                        </Button>
                        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <button
                                onClick={() => setView('table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'table' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <List className="h-3.5 w-3.5" /> Tabela
                            </button>
                            <button
                                onClick={() => setView('grid')}
                                className={`flex items-center gap-1.5 border-l border-gray-200 px-3 py-1.5 text-sm transition-colors ${view === 'grid' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" /> Grade
                            </button>
                        </div>
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) =>
                                    handlePeriod(Number(e.target.value))
                                }
                                className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-sm text-gray-700 focus:ring-1 focus:ring-[#1A2023]/25 focus:outline-none"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {flash.success}
                    </div>
                )}

                {/* TikTok accounts, read straight from TikTok */}
                <Deferred
                    data="tiktokAccounts"
                    fallback={
                        <div className="mb-6 h-40 animate-pulse rounded-xl border border-gray-200 bg-white" />
                    }
                >
                    <>
                        {(tiktokAccounts ?? []).map((account) => (
                            <TikTokAccountPanel
                                key={account.id}
                                account={account}
                            />
                        ))}
                    </>
                </Deferred>

                {/* Stat Cards */}
                <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {STAT_CARDS.map(({ key, label, icon: Icon, isPercent }) => (
                        <div
                            key={key}
                            className="rounded-xl border border-gray-200 bg-white p-5"
                        >
                            <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                                <Icon className="h-4 w-4" />
                                {label}
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {isPercent
                                    ? `${stats[key]}%`
                                    : formatNumber(stats[key] as number)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Table / Grid */}
                {view === 'table' ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-5 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500">
                                            Publicação
                                        </th>
                                        {COLUMNS.map(({ key, label }) => (
                                            <th
                                                key={key}
                                                className="cursor-pointer px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500 select-none hover:text-gray-900"
                                                onClick={() => toggleSort(key)}
                                            >
                                                <span className="inline-flex items-center">
                                                    {label}
                                                    <SortIcon
                                                        column={key}
                                                        sort={sort}
                                                        dir={dir}
                                                    />
                                                </span>
                                            </th>
                                        ))}
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={COLUMNS.length + 2}
                                                className="py-20 text-center"
                                            >
                                                <p className="mb-1 text-sm font-medium text-gray-700">
                                                    Você ainda não tem
                                                    publicações pelo Slidezz.
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    Após publicar pelo Slidezz,
                                                    os dados aparecerão aqui.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedPosts.map((post) => (
                                            <tr
                                                key={post.id}
                                                className="border-t border-gray-50 transition-colors hover:bg-gray-50/50"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-7 w-7 flex-shrink-0">
                                                            <AvatarImage
                                                                src={
                                                                    post.avatar ??
                                                                    undefined
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {post.handle
                                                                    .slice(0, 2)
                                                                    .toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="max-w-[180px] truncate text-sm font-medium text-gray-900">
                                                                @{post.handle}
                                                            </p>
                                                            <p
                                                                className="max-w-[180px] truncate text-xs text-gray-400"
                                                                title={
                                                                    post.title
                                                                }
                                                            >
                                                                {post.title}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-4 py-3 font-medium text-gray-900"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        formatNumber(
                                                            post.views,
                                                        ),
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        formatNumber(
                                                            post.likes,
                                                        ),
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        formatNumber(
                                                            post.comments,
                                                        ),
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        formatNumber(
                                                            post.shares,
                                                        ),
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        formatNumber(
                                                            post.bookmarks,
                                                        ),
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={pendingHint(post)}
                                                >
                                                    {metric(
                                                        post,
                                                        `${post.engagement_rate}%`,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-500">
                                                    {new Date(
                                                        post.published_at,
                                                    ).toLocaleDateString(
                                                        'pt-BR',
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button className="rounded p-1 text-gray-400 hover:text-gray-700">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
                        <p className="mb-1 text-sm font-medium text-gray-700">
                            Você ainda não tem publicações pelo Slidezz.
                        </p>
                        <p className="text-sm text-gray-400">
                            Após publicar pelo Slidezz, os dados aparecerão
                            aqui.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pagedPosts.map((post) => (
                            <div
                                key={post.id}
                                className="rounded-xl border border-gray-200 bg-white p-5"
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage
                                            src={post.avatar ?? undefined}
                                        />
                                        <AvatarFallback>
                                            {post.handle
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            @{post.handle}
                                        </p>
                                        <p className="text-xs text-gray-400 capitalize">
                                            {post.platform}
                                        </p>
                                    </div>
                                </div>
                                <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                                    {post.title}
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        {
                                            label: 'Views',
                                            value: metric(
                                                post,
                                                formatNumber(post.views),
                                            ),
                                        },
                                        {
                                            label: 'Curtidas',
                                            value: metric(
                                                post,
                                                formatNumber(post.likes),
                                            ),
                                        },
                                        {
                                            label: 'Engajamento',
                                            value: metric(
                                                post,
                                                `${post.engagement_rate}%`,
                                            ),
                                        },
                                    ].map(({ label, value }) => (
                                        <div
                                            key={label}
                                            className="rounded-lg bg-gray-50 p-2.5 text-center"
                                        >
                                            <p className="mb-0.5 text-xs text-gray-400">
                                                {label}
                                            </p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {sorted.length > PER_PAGE && (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white">
                        <TablePagination
                            current={page}
                            last={lastPage}
                            total={sorted.length}
                            onChange={setPage}
                        />
                    </div>
                )}

                {/* Crescimento de seguidores */}
                <div className="mt-8 mb-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Crescimento de seguidores
                    </h2>
                    {growth.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Nenhum histórico de seguidores ainda.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {growth.map((account) => (
                                <div
                                    key={account.account_id}
                                    className="rounded-xl border border-gray-200 bg-white p-5"
                                >
                                    <div className="mb-4 flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src={
                                                    account.avatar ?? undefined
                                                }
                                            />
                                            <AvatarFallback>
                                                {account.handle
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                @{account.handle}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {providerLabel(
                                                    account.provider,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mb-2 flex items-end gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Seguidores
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {account.current_followers
                                                    ? formatNumber(
                                                          account.current_followers,
                                                      )
                                                    : '—'}
                                            </p>
                                        </div>
                                        {account.gained !== null && (
                                            <div
                                                className={`text-sm font-medium ${account.gained >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                            >
                                                {account.gained >= 0 ? '+' : ''}
                                                {formatNumber(account.gained)}
                                            </div>
                                        )}
                                    </div>
                                    <FollowerChart series={account.series} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tipos de conteúdo */}
                <div className="mb-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Tipos de conteúdo
                    </h2>
                    {contentTypes.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Nenhum post publicado no período.
                        </p>
                    ) : (
                        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                            {contentTypes.map((ct) => {
                                const labels: Record<string, string> = {
                                    image: 'Imagem',
                                    carousel: 'Carrossel',
                                    video: 'Vídeo',
                                    reel: 'Reel',
                                };
                                const label =
                                    labels[ct.media_type] ?? ct.media_type;
                                const maxPosts = Math.max(
                                    ...contentTypes.map((c) => c.posts),
                                );

                                return (
                                    <div key={ct.media_type}>
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <span className="text-gray-700">
                                                {label}
                                            </span>
                                            <span className="text-gray-500">
                                                {ct.posts} posts
                                            </span>
                                        </div>
                                        <div className="mb-2 h-2 rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-[#1A2023]"
                                                style={{
                                                    width: `${(ct.posts / maxPosts) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-3">
                                            <span>
                                                Média curtidas:{' '}
                                                {ct.avg_likes.toFixed(1)}
                                            </span>
                                            <span>
                                                Média comentários:{' '}
                                                {ct.avg_comments.toFixed(1)}
                                            </span>
                                            <span>
                                                Média engajamento:{' '}
                                                {ct.avg_engagement.toFixed(1)}
                                                {ct.avg_engagement_rate !==
                                                    null &&
                                                    ` (${ct.avg_engagement_rate.toFixed(2)}%)`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Melhor horário para postar */}
                <div className="mb-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Melhor horário para postar
                    </h2>
                    {bestTimes.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            Ainda não há dados suficientes para gerar o heatmap.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-5">
                            <div className="min-w-[600px]">
                                <table className="w-full border-separate border-spacing-0">
                                    <thead>
                                        <tr>
                                            <th></th>
                                            {Array.from(
                                                { length: 24 },
                                                (_, h) => (
                                                    <th
                                                        key={h}
                                                        className="px-1 text-center text-[10px] font-normal text-gray-400"
                                                    >
                                                        {h}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            'Dom',
                                            'Seg',
                                            'Ter',
                                            'Qua',
                                            'Qui',
                                            'Sex',
                                            'Sáb',
                                        ].map((day, wd) => (
                                            <tr key={wd}>
                                                <td className="pr-2 text-right text-xs text-gray-500">
                                                    {day}
                                                </td>
                                                {Array.from(
                                                    { length: 24 },
                                                    (_, hour) => {
                                                        const cell =
                                                            bestTimes.find(
                                                                (b) =>
                                                                    b.weekday ===
                                                                        wd &&
                                                                    b.hour ===
                                                                        hour,
                                                            );
                                                        const maxEng = Math.max(
                                                            ...bestTimes.map(
                                                                (b) =>
                                                                    b.avg_engagement,
                                                            ),
                                                        );
                                                        const opacity = cell
                                                            ? (cell.avg_engagement /
                                                                  maxEng) *
                                                                  0.9 +
                                                              0.1
                                                            : 0.05;

                                                        return (
                                                            <td
                                                                key={hour}
                                                                className="p-0.5"
                                                            >
                                                                <div
                                                                    className="h-6 w-full rounded"
                                                                    style={{
                                                                        backgroundColor:
                                                                            cell
                                                                                ? `rgba(26, 32, 35, ${opacity})`
                                                                                : '#f3f4f6',
                                                                    }}
                                                                    title={
                                                                        cell
                                                                            ? `${day} ${hour}h — ${cell.posts} posts, engajamento médio ${cell.avg_engagement.toFixed(1)}`
                                                                            : ''
                                                                    }
                                                                />
                                                            </td>
                                                        );
                                                    },
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Todos os posts da conta */}
                <div className="mb-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Todos os posts da conta
                    </h2>
                    {accountPosts.total === 0 ? (
                        <p className="text-sm text-gray-400">
                            Nenhum post encontrado no período.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-5 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500">
                                                Post
                                            </th>
                                            {ACCOUNT_POST_COLUMNS.map(
                                                ({ key, label }) => (
                                                    <th
                                                        key={key}
                                                        className="cursor-pointer px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500 select-none hover:text-gray-900"
                                                        onClick={() =>
                                                            toggleAccountSort(
                                                                key,
                                                            )
                                                        }
                                                    >
                                                        <span className="inline-flex items-center">
                                                            {label}
                                                            <SortIcon
                                                                column={key}
                                                                sort={
                                                                    accountPosts.sort
                                                                }
                                                                dir={
                                                                    accountPosts.dir
                                                                }
                                                            />
                                                        </span>
                                                    </th>
                                                ),
                                            )}
                                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                                                Link
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accountPosts.data.map((post) => (
                                            <tr
                                                key={post.id}
                                                className="border-t border-gray-50 transition-colors hover:bg-gray-50/50"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        {post.thumbnail_url ? (
                                                            <img
                                                                src={
                                                                    post.thumbnail_url
                                                                }
                                                                alt=""
                                                                className="h-10 w-10 flex-shrink-0 rounded object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-100" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {providerLabel(
                                                                    post.provider,
                                                                )}{' '}
                                                                · @{post.handle}
                                                            </p>
                                                            <p
                                                                className="max-w-[200px] truncate text-xs text-gray-400"
                                                                title={
                                                                    post.caption ??
                                                                    ''
                                                                }
                                                            >
                                                                {post.caption ??
                                                                    'Sem legenda'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                                    {new Date(
                                                        post.posted_at,
                                                    ).toLocaleDateString(
                                                        'pt-BR',
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {formatNumber(
                                                        post.likes ?? 0,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {formatNumber(
                                                        post.comments ?? 0,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {formatNumber(
                                                        post.shares ?? 0,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {post.saves
                                                        ? formatNumber(
                                                              post.saves,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {post.views
                                                        ? formatNumber(
                                                              post.views,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {formatNumber(
                                                        post.engagement,
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-gray-700"
                                                    title={
                                                        post.engagement_rate_basis ===
                                                        'followers'
                                                            ? 'Engajamento ÷ seguidores (a rede não deu as views)'
                                                            : 'Engajamento ÷ views'
                                                    }
                                                >
                                                    {post.engagement_rate !==
                                                    null
                                                        ? `${post.engagement_rate.toFixed(2)}%`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {post.permalink ? (
                                                        <a
                                                            href={
                                                                post.permalink
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            Ver
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-300">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <TablePagination
                                current={accountPosts.current_page}
                                last={accountPosts.last_page}
                                total={accountPosts.total}
                                onChange={(p) =>
                                    loadAccountPosts({
                                        ap_sort: accountPosts.sort,
                                        ap_dir: accountPosts.dir,
                                        ap_page: p,
                                    })
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function TikTokAccountPanel({ account }: { account: TikTokAccount }) {
    const insights = account.insights;

    return (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={account.avatar ?? undefined} />
                        <AvatarFallback>
                            {account.handle.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            @{account.handle}
                        </p>
                        <p className="text-xs text-gray-400">TikTok</p>
                    </div>
                </div>
                {insights && (
                    <div className="flex gap-6">
                        {[
                            {
                                label: 'Seguidores',
                                value: insights.followers,
                                icon: Users,
                            },
                            {
                                label: 'Curtidas',
                                value: insights.likes,
                                icon: Heart,
                            },
                            {
                                label: 'Vídeos',
                                value: insights.videos,
                                icon: Film,
                            },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label}>
                                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatNumber(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {account.error ? (
                <p className="text-sm text-red-600">{account.error}</p>
            ) : insights && insights.recent.length === 0 ? (
                <p className="text-sm text-gray-400">
                    Essa conta ainda não tem vídeos publicados.
                </p>
            ) : (
                insights && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {insights.recent.map((video) => (
                            <a
                                key={video.id}
                                href={video.url ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="group w-36 flex-shrink-0"
                            >
                                <div className="mb-2 aspect-[9/16] overflow-hidden rounded-lg bg-gray-100">
                                    {video.cover && (
                                        <img
                                            src={video.cover}
                                            alt=""
                                            className="h-full w-full object-cover group-hover:opacity-90"
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {formatNumber(video.views)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="h-3 w-3" />
                                        {formatNumber(video.likes)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle className="h-3 w-3" />
                                        {formatNumber(video.comments)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Share2 className="h-3 w-3" />
                                        {formatNumber(video.shares)}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
