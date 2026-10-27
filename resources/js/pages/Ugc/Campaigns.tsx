import { Head, Link, router, useForm } from '@inertiajs/react';
import { BarChart3, DollarSign, Eye, Film, Plus, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { BarList, DonutChart, ViewsAreaChart, formatMoney, formatNumber } from '@/components/ugc/charts';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Kpis {
    campaigns: number;
    videos: number;
    creators: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
    spend_cents: number;
    effective_cpm_cents: number;
}

interface CampaignCard {
    id: number;
    name: string;
    status: string;
    color: string;
    currency: string;
    videos: number;
    creators: number;
    views: number;
    spend_cents: number;
    budget_cents: number | null;
}

interface TopVideo {
    id: number;
    platform: string;
    url: string;
    thumbnail_url: string | null;
    author_handle: string | null;
    creator: string | null;
    views: number;
    engagement_rate: number;
}

interface Overview {
    kpis: Kpis;
    timeseries: { date: string; views: number }[];
    platforms: { platform: string; videos: number; views: number }[];
    topVideos: TopVideo[];
    campaigns: CampaignCard[];
}

interface Props {
    overview: Overview;
    creators: { id: number; name: string }[];
    days: number;
    currency: string;
    defaults: { payout_model: string; currency: string; color: string };
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
    tiktok: { label: 'TikTok', color: '#111827' },
    instagram: { label: 'Instagram', color: '#E1306C' },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
    active: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
    paused: { label: 'Pausada', className: 'bg-amber-100 text-amber-700' },
    ended: { label: 'Encerrada', className: 'bg-gray-100 text-gray-500' },
};

const DAYS = [7, 30, 90];

export default function Campaigns({ overview, days, currency, defaults }: Props) {
    const { kpis, timeseries, platforms, topVideos, campaigns } = overview;
    const [open, setOpen] = useState(false);

    const setDays = (d: number) =>
        router.get('/ugc', { days: d }, { preserveState: true, preserveScroll: true, replace: true });

    const tiles = [
        { label: 'Views', value: formatNumber(kpis.views), icon: Eye },
        { label: 'Engajamento', value: `${kpis.engagement_rate}%`, icon: TrendingUp },
        { label: 'Vídeos', value: String(kpis.videos), icon: Film },
        { label: 'Criadoras', value: String(kpis.creators), icon: Users },
        { label: 'Pago', value: formatMoney(kpis.spend_cents, currency), icon: DollarSign },
        { label: 'CPM real', value: formatMoney(kpis.effective_cpm_cents, currency), icon: BarChart3 },
    ];

    const donutSlices = platforms.map((p) => ({
        label: PLATFORM_META[p.platform]?.label ?? p.platform,
        value: p.views,
        color: PLATFORM_META[p.platform]?.color ?? '#9CA3AF',
    }));

    const topBars = topVideos.map((v) => ({
        label: v.creator ?? (v.author_handle ? `@${v.author_handle}` : 'Vídeo'),
        sublabel: PLATFORM_META[v.platform]?.label,
        value: v.views,
        color: PLATFORM_META[v.platform]?.color,
    }));

    return (
        <>
            <Head title="Campanhas UGC" />

            <div className="p-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="mb-1 text-2xl font-bold text-gray-900">Campanhas UGC</h1>
                        <p className="text-sm text-gray-500">
                            Rastreie vídeos de criadoras por link público, com views, engajamento e pagamento.
                        </p>
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
                        <NewCampaignDialog open={open} setOpen={setOpen} defaults={defaults} />
                    </div>
                </div>

                {/* KPI tiles */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {tiles.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
                                <Icon className="h-3.5 w-3.5" /> {label}
                            </div>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">Views no tempo</h2>
                        <ViewsAreaChart data={timeseries} />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">Por plataforma</h2>
                        <DonutChart slices={donutSlices} />
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-4 text-sm font-semibold text-gray-900">Top vídeos</h2>
                        <BarList items={topBars} />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-4 text-sm font-semibold text-gray-900">Campanhas</h2>
                        {campaigns.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                                Nenhuma campanha ainda. Crie a primeira pra começar a rastrear.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {campaigns.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/ugc/${c.id}`}
                                        className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                                    >
                                        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate font-medium text-gray-900">{c.name}</p>
                                                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_META[c.status]?.className ?? ''}`}>
                                                    {STATUS_META[c.status]?.label ?? c.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {c.videos} vídeos · {c.creators} criadoras
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">{formatNumber(c.views)}</p>
                                            <p className="text-xs text-gray-400">{formatMoney(c.spend_cents, c.currency)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function NewCampaignDialog({
    open, setOpen, defaults,
}: { open: boolean; setOpen: (v: boolean) => void; defaults: Props['defaults'] }) {
    const form = useForm({
        name: '',
        payout_model: defaults.payout_model,
        currency: defaults.currency,
        color: defaults.color,
        cpm_rate: '1.00',
        flat_fee: '0',
        payout_cap: '',
        budget: '',
    });
    const { data, setData, processing } = form;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const toCents = (v: string) => (v === '' ? null : Math.round(parseFloat(v) * 100));
        form.transform((d) => ({
            name: d.name,
            payout_model: d.payout_model,
            currency: d.currency,
            color: d.color,
            cpm_rate_cents: toCents(d.cpm_rate) ?? 0,
            flat_fee_cents: toCents(d.flat_fee) ?? 0,
            payout_cap_cents: toCents(d.payout_cap),
            budget_cents: toCents(d.budget),
        }));
        form.post('/ugc', {
            onSuccess: () => {
 form.reset(); setOpen(false); 
},
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] text-white hover:bg-black">
                    <Plus className="h-3.5 w-3.5" /> Nova campanha
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova campanha UGC</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nome</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Ex: Lançamento out/26" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="payout_model">Modelo de pagamento</Label>
                            <select
                                id="payout_model"
                                value={data.payout_model}
                                onChange={(e) => setData('payout_model', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                            >
                                <option value="cpm">CPM (por 1000 views)</option>
                                <option value="flat">Fixo por vídeo</option>
                                <option value="cpm_plus_flat">Fixo + CPM</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="currency">Moeda</Label>
                            <select
                                id="currency"
                                value={data.currency}
                                onChange={(e) => setData('currency', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                            >
                                <option value="USD">USD</option>
                                <option value="BRL">BRL</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="cpm_rate">CPM ({data.currency})</Label>
                            <Input id="cpm_rate" type="number" step="0.01" min="0" value={data.cpm_rate} onChange={(e) => setData('cpm_rate', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="flat_fee">Fixo/vídeo</Label>
                            <Input id="flat_fee" type="number" step="0.01" min="0" value={data.flat_fee} onChange={(e) => setData('flat_fee', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="payout_cap">Teto/vídeo</Label>
                            <Input id="payout_cap" type="number" step="0.01" min="0" value={data.payout_cap} onChange={(e) => setData('payout_cap', e.target.value)} placeholder="opcional" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="budget">Orçamento total</Label>
                            <Input id="budget" type="number" step="0.01" min="0" value={data.budget} onChange={(e) => setData('budget', e.target.value)} placeholder="opcional" />
                        </div>
                        <div>
                            <Label htmlFor="color">Cor</Label>
                            <Input id="color" type="color" value={data.color} onChange={(e) => setData('color', e.target.value)} className="h-10 p-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={processing} className="bg-[#1A1A1A] text-white hover:bg-black">
                            Criar campanha
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
