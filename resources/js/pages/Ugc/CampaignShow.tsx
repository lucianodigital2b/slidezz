import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft, Check, DollarSign, Eye, Plus, RefreshCw, Settings2, Trash2, TrendingUp, Users,
} from 'lucide-react';
import { useState } from 'react';
import { BarList, DonutChart, ViewsAreaChart, formatMoney, formatNumber } from '@/components/ugc/charts';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Campaign {
    id: number;
    name: string;
    status: string;
    objective: string | null;
    currency: string;
    color: string;
    payout_model: string;
    cpm_rate_cents: number;
    flat_fee_cents: number;
    payout_cap_cents: number | null;
    budget_cents: number | null;
    starts_on: string | null;
    ends_on: string | null;
    notes: string | null;
}

interface VideoRow {
    id: number;
    platform: string;
    url: string;
    thumbnail_url: string | null;
    caption: string | null;
    author_handle: string | null;
    creator: string | null;
    creator_id: number | null;
    posted_at: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    engagement_rate: number;
    fetch_status: string;
    last_synced_at: string | null;
    payout_cents: number;
    payout_override_cents: number | null;
    paid: boolean;
}

interface CreatorRow {
    id: number | null;
    name: string;
    handle: string | null;
    avatar: string | null;
    videos: number;
    views: number;
    spend_cents: number;
}

interface Props {
    campaign: Campaign;
    data: {
        kpis: {
            views: number; engagement_rate: number; videos: number; creators: number;
            spend_cents: number; effective_cpm_cents: number;
        };
        timeseries: { date: string; views: number }[];
        platforms: { platform: string; videos: number; views: number }[];
        creators: CreatorRow[];
        videos: VideoRow[];
    };
    creators: { id: number; name: string }[];
    days: number;
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
    tiktok: { label: 'TikTok', color: '#111827' },
    instagram: { label: 'Instagram', color: '#E1306C' },
};

const DAYS = [7, 30, 90];

export default function CampaignShow({ campaign, data, creators, days }: Props) {
    const { kpis, timeseries, platforms, videos } = data;
    const cur = campaign.currency;
    const [editing, setEditing] = useState<VideoRow | null>(null);

    const setDays = (d: number) =>
        router.get(`/ugc/${campaign.id}`, { days: d }, { preserveState: true, preserveScroll: true, replace: true });

    const tiles = [
        { label: 'Views', value: formatNumber(kpis.views), icon: Eye },
        { label: 'Engajamento', value: `${kpis.engagement_rate}%`, icon: TrendingUp },
        { label: 'Vídeos', value: String(kpis.videos), icon: Eye },
        { label: 'Criadoras', value: String(kpis.creators), icon: Users },
        { label: 'Pago', value: formatMoney(kpis.spend_cents, cur), icon: DollarSign },
        { label: 'CPM real', value: formatMoney(kpis.effective_cpm_cents, cur), icon: DollarSign },
    ];

    const donutSlices = platforms.map((p) => ({
        label: PLATFORM_META[p.platform]?.label ?? p.platform,
        value: p.views,
        color: PLATFORM_META[p.platform]?.color ?? '#9CA3AF',
    }));

    const creatorBars = data.creators.map((c) => ({
        label: c.name,
        sublabel: `${c.videos} vídeos · ${formatMoney(c.spend_cents, cur)}`,
        value: c.views,
        color: campaign.color,
    }));

    const paidCount = videos.filter((v) => v.paid).length;
    const budgetPct = campaign.budget_cents ? Math.min(100, Math.round((kpis.spend_cents / campaign.budget_cents) * 100)) : null;

    return (
        <>
            <Head title={campaign.name} />

            <div className="p-6">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="mt-1 h-10 w-1.5 rounded-full" style={{ background: campaign.color }} />
                        <div>
                            <Link href="/ugc" className="mb-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                                <ArrowLeft className="h-3 w-3" /> Campanhas
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                            {campaign.objective && <p className="text-sm text-gray-500">{campaign.objective}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
                            {DAYS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDays(d)}
                                    className={`rounded-md px-3 py-1 text-sm ${days === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                        <PayoutSettingsDialog campaign={campaign} />
                    </div>
                </div>

                {/* KPIs */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {tiles.map(({ label, value, icon: Icon }, i) => (
                        <div key={`${label}-${i}`} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
                                <Icon className="h-3.5 w-3.5" /> {label}
                            </div>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>

                {budgetPct !== null && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Orçamento usado</span>
                            <span className="font-medium text-gray-900">
                                {formatMoney(kpis.spend_cents, cur)} / {formatMoney(campaign.budget_cents!, cur)}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, background: budgetPct >= 90 ? '#DC2626' : campaign.color }} />
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">Views no tempo</h2>
                        <ViewsAreaChart data={timeseries} color={campaign.color} />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">Por plataforma</h2>
                        <DonutChart slices={donutSlices} />
                    </div>
                </div>

                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold text-gray-900">Ranking de criadoras</h2>
                    <BarList items={creatorBars} color={campaign.color} />
                </div>

                {/* Videos */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Vídeos rastreados</h2>
                            <p className="text-xs text-gray-400">{videos.length} vídeos · {paidCount} pagos</p>
                        </div>
                        <AddVideoForm campaignId={campaign.id} creators={creators} />
                    </div>

                    {videos.length === 0 ? (
                        <p className="px-5 py-12 text-center text-sm text-gray-400">
                            Cole o link público de um TikTok ou Reel pra começar a rastrear.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                                        <th className="px-5 py-3 text-left font-medium">Vídeo</th>
                                        <th className="px-3 py-3 text-right font-medium">Views</th>
                                        <th className="px-3 py-3 text-right font-medium">Eng.</th>
                                        <th className="px-3 py-3 text-right font-medium">Pagamento</th>
                                        <th className="px-3 py-3 text-center font-medium">Pago</th>
                                        <th className="px-5 py-3 text-right font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {videos.map((v) => (
                                        <tr key={v.id} className="border-t border-gray-50">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {v.thumbnail_url ? (
                                                        <img src={v.thumbnail_url} alt="" className="h-12 w-9 shrink-0 rounded object-cover" loading="lazy" />
                                                    ) : (
                                                        <div className="h-12 w-9 shrink-0 rounded bg-gray-100" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_META[v.platform]?.color }} />
                                                            <a href={v.url} target="_blank" rel="noreferrer" className="truncate font-medium text-gray-900 hover:underline">
                                                                {v.creator ?? (v.author_handle ? `@${v.author_handle}` : 'Ver vídeo')}
                                                            </a>
                                                        </div>
                                                        <p className="max-w-[240px] truncate text-xs text-gray-400" title={v.caption ?? ''}>
                                                            {v.caption ?? v.url}
                                                        </p>
                                                        {v.fetch_status !== 'ok' && (
                                                            <span className="text-xs text-amber-500">
                                                                {v.fetch_status === 'manual' ? 'métricas manuais' : 'falha ao sincronizar'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-right text-gray-900">{formatNumber(v.views)}</td>
                                            <td className="px-3 py-3 text-right text-gray-600">{v.engagement_rate}%</td>
                                            <td className="px-3 py-3 text-right text-gray-900">
                                                {formatMoney(v.payout_cents, cur)}
                                                {v.payout_override_cents !== null && <span className="ml-1 text-xs text-gray-400">(fixo)</span>}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => router.patch(`/ugc/videos/${v.id}`, { paid: !v.paid }, { preserveScroll: true })}
                                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${v.paid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300 hover:text-gray-400'}`}
                                                    aria-label={v.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {v.platform === 'tiktok' && (
                                                        <button
                                                            onClick={() => router.post(`/ugc/videos/${v.id}/sync`, {}, { preserveScroll: true })}
                                                            className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                                            title="Atualizar métricas"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setEditing(v)}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                                        title="Editar"
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Remover este vídeo?')) {
router.delete(`/ugc/videos/${v.id}`, { preserveScroll: true });
}
                                                        }}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {editing && (
                <EditVideoDialog
                    key={editing.id}
                    video={editing}
                    creators={creators}
                    currency={cur}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

function AddVideoForm({ campaignId, creators }: { campaignId: number; creators: { id: number; name: string }[] }) {
    const { data, setData, post, processing, reset } = useForm({ url: '', ugc_creator_id: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/ugc/${campaignId}/videos`, { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="flex items-center gap-2">
            <Input
                value={data.url}
                onChange={(e) => setData('url', e.target.value)}
                placeholder="Cole o link do TikTok ou Reel"
                className="w-64"
                required
            />
            <select
                value={data.ugc_creator_id}
                onChange={(e) => setData('ugc_creator_id', e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
            >
                <option value="">Sem criadora</option>
                {creators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <Button type="submit" size="sm" disabled={processing} className="flex items-center gap-1.5 bg-[#1A1A1A] text-white hover:bg-black">
                <Plus className="h-3.5 w-3.5" /> Add
            </Button>
        </form>
    );
}

function EditVideoDialog({
    video, creators, currency, onClose,
}: { video: VideoRow; creators: { id: number; name: string }[]; currency: string; onClose: () => void }) {
    const manual = video.fetch_status !== 'ok';
    const form = useForm({
        ugc_creator_id: video.creator_id ? String(video.creator_id) : '',
        views: String(video.views),
        likes: String(video.likes),
        comments: String(video.comments),
        shares: String(video.shares),
        payout_override: video.payout_override_cents !== null ? (video.payout_override_cents / 100).toFixed(2) : '',
    });
    const { data, setData, processing } = form;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ugc_creator_id: d.ugc_creator_id === '' ? null : Number(d.ugc_creator_id),
            ...(manual ? {
                views: Number(d.views),
                likes: Number(d.likes),
                comments: Number(d.comments),
                shares: Number(d.shares),
            } : {}),
            payout_override_cents: d.payout_override === '' ? null : Math.round(parseFloat(d.payout_override) * 100),
        }));
        form.patch(`/ugc/videos/${video.id}`, { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar vídeo</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="creator">Criadora</Label>
                        <select
                            id="creator"
                            value={data.ugc_creator_id}
                            onChange={(e) => setData('ugc_creator_id', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                        >
                            <option value="">Sem criadora</option>
                            {creators.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {manual ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="views">Views</Label>
                                <Input id="views" type="number" min="0" value={data.views} onChange={(e) => setData('views', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="likes">Curtidas</Label>
                                <Input id="likes" type="number" min="0" value={data.likes} onChange={(e) => setData('likes', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="comments">Comentários</Label>
                                <Input id="comments" type="number" min="0" value={data.comments} onChange={(e) => setData('comments', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="shares">Compart.</Label>
                                <Input id="shares" type="number" min="0" value={data.shares} onChange={(e) => setData('shares', e.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                            As métricas do TikTok são atualizadas automaticamente. Use o botão de sincronizar na tabela.
                        </p>
                    )}

                    <div>
                        <Label htmlFor="payout_override">Pagamento fixo ({currency})</Label>
                        <Input
                            id="payout_override"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.payout_override}
                            onChange={(e) => setData('payout_override', e.target.value)}
                            placeholder="deixe vazio pra usar a regra da campanha"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={processing} className="bg-[#1A1A1A] text-white hover:bg-black">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PayoutSettingsDialog({ campaign }: { campaign: Campaign }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective ?? '',
        payout_model: campaign.payout_model,
        currency: campaign.currency,
        color: campaign.color,
        cpm_rate: (campaign.cpm_rate_cents / 100).toFixed(2),
        flat_fee: (campaign.flat_fee_cents / 100).toFixed(2),
        payout_cap: campaign.payout_cap_cents !== null ? (campaign.payout_cap_cents / 100).toFixed(2) : '',
        budget: campaign.budget_cents !== null ? (campaign.budget_cents / 100).toFixed(2) : '',
    });
    const { data, setData, processing } = form;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const toCents = (v: string) => (v === '' ? null : Math.round(parseFloat(v) * 100));
        form.transform((d) => ({
            name: d.name,
            status: d.status,
            objective: d.objective,
            payout_model: d.payout_model,
            currency: d.currency,
            color: d.color,
            cpm_rate_cents: toCents(d.cpm_rate) ?? 0,
            flat_fee_cents: toCents(d.flat_fee) ?? 0,
            payout_cap_cents: toCents(d.payout_cap),
            budget_cents: toCents(d.budget),
        }));
        form.put(`/ugc/${campaign.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-1.5 rounded-lg">
                    <Settings2 className="h-3.5 w-3.5" /> Configurar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configurar campanha</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="s-name">Nome</Label>
                            <Input id="s-name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="s-status">Status</Label>
                            <select id="s-status" value={data.status} onChange={(e) => setData('status', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm">
                                <option value="active">Ativa</option>
                                <option value="paused">Pausada</option>
                                <option value="ended">Encerrada</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="s-objective">Objetivo</Label>
                        <Input id="s-objective" value={data.objective} onChange={(e) => setData('objective', e.target.value)} placeholder="opcional" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="s-model">Modelo de pagamento</Label>
                            <select id="s-model" value={data.payout_model} onChange={(e) => setData('payout_model', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm">
                                <option value="cpm">CPM (por 1000 views)</option>
                                <option value="flat">Fixo por vídeo</option>
                                <option value="cpm_plus_flat">Fixo + CPM</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="s-currency">Moeda</Label>
                            <select id="s-currency" value={data.currency} onChange={(e) => setData('currency', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm">
                                <option value="USD">USD</option>
                                <option value="BRL">BRL</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="s-cpm">CPM</Label>
                            <Input id="s-cpm" type="number" step="0.01" min="0" value={data.cpm_rate} onChange={(e) => setData('cpm_rate', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="s-flat">Fixo/vídeo</Label>
                            <Input id="s-flat" type="number" step="0.01" min="0" value={data.flat_fee} onChange={(e) => setData('flat_fee', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="s-cap">Teto/vídeo</Label>
                            <Input id="s-cap" type="number" step="0.01" min="0" value={data.payout_cap} onChange={(e) => setData('payout_cap', e.target.value)} placeholder="opcional" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="s-budget">Orçamento total</Label>
                            <Input id="s-budget" type="number" step="0.01" min="0" value={data.budget} onChange={(e) => setData('budget', e.target.value)} placeholder="opcional" />
                        </div>
                        <div>
                            <Label htmlFor="s-color">Cor</Label>
                            <Input id="s-color" type="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="h-10 p-1" />
                        </div>
                    </div>
                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        <button
                            type="button"
                            onClick={() => {
 if (confirm('Excluir a campanha e todos os vídeos?')) {
router.delete(`/ugc/${campaign.id}`);
} 
}}
                            className="text-sm text-red-600 hover:underline"
                        >
                            Excluir campanha
                        </button>
                        <Button type="submit" disabled={processing} className="bg-[#1A1A1A] text-white hover:bg-black">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
