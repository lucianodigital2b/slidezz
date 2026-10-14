import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { analytics as analyticsRoute } from '@/routes';
import { sync as analyticsSync } from '@/routes/analytics';
import {
    Eye, Heart, MessageCircle, TrendingUp,
    RefreshCw, LayoutGrid, List, ChevronDown,
    ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal,
    Users, Film, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface Props {
    stats: Stats;
    posts: Post[];
    period: number;
    tiktokAccounts?: TikTokAccount[];
}

type SortKey = 'views' | 'likes' | 'comments' | 'shares' | 'bookmarks' | 'engagement_rate' | 'published_at';
type SortDir = 'asc' | 'desc';

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
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
    { key: 'total_comments' as const, label: 'Total de Comentários', icon: MessageCircle },
    { key: 'avg_engagement_rate' as const, label: 'Engajamento Médio', icon: TrendingUp, isPercent: true },
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

function SortIcon({ column, sort, dir }: { column: SortKey; sort: SortKey; dir: SortDir }) {
    if (column !== sort) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-gray-300" />;
    return dir === 'desc'
        ? <ArrowDown className="w-3.5 h-3.5 ml-1 text-gray-700" />
        : <ArrowUp className="w-3.5 h-3.5 ml-1 text-gray-700" />;
}

export default function Analytics({ stats, posts, period, tiktokAccounts }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const [view, setView] = useState<'table' | 'grid'>('table');
    const [sort, setSort] = useState<SortKey>('views');
    const [dir, setDir] = useState<SortDir>('desc');
    const [syncing, setSyncing] = useState(false);

    const handlePeriod = (p: number) => {
        router.get(analyticsRoute.url(), { period: p }, { preserveState: true, replace: true });
    };

    const handleSync = () => {
        setSyncing(true);
        router.post(analyticsSync.url(), {}, {
            preserveScroll: true,
            onFinish: () => setSyncing(false),
        });
    };

    const toggleSort = (key: SortKey) => {
        if (sort === key) {
            setDir(dir === 'desc' ? 'asc' : 'desc');
        } else {
            setSort(key);
            setDir('desc');
        }
    };

    const sorted = [...posts].sort((a, b) => {
        const av = sort === 'published_at' ? new Date(a.published_at).getTime() : (a[sort] as number);
        const bv = sort === 'published_at' ? new Date(b.published_at).getTime() : (b[sort] as number);
        return dir === 'desc' ? bv - av : av - bv;
    });

    return (
        <>
            <Head title="Analytics" />

            <div className="p-6">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Visão Geral de Analytics</h1>
                        <p className="text-sm text-gray-500">Acompanhe suas métricas de desempenho e engajamento</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2 border-gray-200 text-gray-600 hover:text-gray-900 rounded-lg text-sm"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setView('table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'table' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <List className="w-3.5 h-3.5" /> Tabela
                            </button>
                            <button
                                onClick={() => setView('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-gray-200 transition-colors ${view === 'grid' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Grade
                            </button>
                        </div>
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) => handlePeriod(Number(e.target.value))}
                                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FFE156] cursor-pointer"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="mb-5 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* TikTok accounts, read straight from TikTok */}
                <Deferred
                    data="tiktokAccounts"
                    fallback={<div className="mb-6 h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />}
                >
                    <>
                        {(tiktokAccounts ?? []).map((account) => (
                            <TikTokAccountPanel key={account.id} account={account} />
                        ))}
                    </>
                </Deferred>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    {STAT_CARDS.map(({ key, label, icon: Icon, isPercent }) => (
                        <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                                <Icon className="w-4 h-4" />
                                {label}
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {isPercent ? `${stats[key]}%` : formatNumber(stats[key] as number)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Table / Grid */}
                {view === 'table' ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 whitespace-nowrap">Publicação</th>
                                        {COLUMNS.map(({ key, label }) => (
                                            <th
                                                key={key}
                                                className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-900 select-none"
                                                onClick={() => toggleSort(key)}
                                            >
                                                <span className="inline-flex items-center">
                                                    {label}
                                                    <SortIcon column={key} sort={sort} dir={dir} />
                                                </span>
                                            </th>
                                        ))}
                                        <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.length === 0 ? (
                                        <tr>
                                            <td colSpan={COLUMNS.length + 2} className="py-20 text-center">
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Você ainda não tem publicações pelo Slidezz.
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    Após publicar pelo Slidezz, os dados aparecerão aqui.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        sorted.map((post) => (
                                            <tr key={post.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                                            <AvatarImage src={post.avatar ?? undefined} />
                                                            <AvatarFallback>{post.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">@{post.handle}</p>
                                                            <p className="text-xs text-gray-400 truncate max-w-[180px]" title={post.title}>{post.title}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900" title={pendingHint(post)}>{metric(post, formatNumber(post.views))}</td>
                                                <td className="px-4 py-3 text-gray-700" title={pendingHint(post)}>{metric(post, formatNumber(post.likes))}</td>
                                                <td className="px-4 py-3 text-gray-700" title={pendingHint(post)}>{metric(post, formatNumber(post.comments))}</td>
                                                <td className="px-4 py-3 text-gray-700" title={pendingHint(post)}>{metric(post, formatNumber(post.shares))}</td>
                                                <td className="px-4 py-3 text-gray-700" title={pendingHint(post)}>{metric(post, formatNumber(post.bookmarks))}</td>
                                                <td className="px-4 py-3 text-gray-700" title={pendingHint(post)}>{metric(post, `${post.engagement_rate}%`)}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                    {new Date(post.published_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button className="p-1 text-gray-400 hover:text-gray-700 rounded">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    sorted.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Você ainda não tem publicações pelo Slidezz.
                            </p>
                            <p className="text-sm text-gray-400">
                                Após publicar pelo Slidezz, os dados aparecerão aqui.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {sorted.map((post) => (
                                <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={post.avatar ?? undefined} />
                                            <AvatarFallback>{post.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">@{post.handle}</p>
                                            <p className="text-xs text-gray-400 capitalize">{post.platform}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{post.title}</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Views', value: metric(post, formatNumber(post.views)) },
                                            { label: 'Curtidas', value: metric(post, formatNumber(post.likes)) },
                                            { label: 'Engajamento', value: metric(post, `${post.engagement_rate}%`) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                                                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                                                <p className="text-sm font-semibold text-gray-900">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </>
    );
}

function TikTokAccountPanel({ account }: { account: TikTokAccount }) {
    const insights = account.insights;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={account.avatar ?? undefined} />
                        <AvatarFallback>{account.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">@{account.handle}</p>
                        <p className="text-xs text-gray-400">TikTok</p>
                    </div>
                </div>
                {insights && (
                    <div className="flex gap-6">
                        {[
                            { label: 'Seguidores', value: insights.followers, icon: Users },
                            { label: 'Curtidas', value: insights.likes, icon: Heart },
                            { label: 'Vídeos', value: insights.videos, icon: Film },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label}>
                                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </p>
                                <p className="text-xl font-bold text-gray-900">{formatNumber(value)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {account.error ? (
                <p className="text-sm text-red-600">{account.error}</p>
            ) : insights && insights.recent.length === 0 ? (
                <p className="text-sm text-gray-400">Essa conta ainda não tem vídeos publicados.</p>
            ) : insights && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {insights.recent.map((video) => (
                        <a
                            key={video.id}
                            href={video.url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="w-36 flex-shrink-0 group"
                        >
                            <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 mb-2">
                                {video.cover && (
                                    <img src={video.cover} alt="" className="w-full h-full object-cover group-hover:opacity-90" />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-600">
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(video.views)}</span>
                                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(video.likes)}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(video.comments)}</span>
                                <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{formatNumber(video.shares)}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
