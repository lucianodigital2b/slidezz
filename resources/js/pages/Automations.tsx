import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CheckCircle2, Clock, Loader2, Pause, Play, Plus, Trash2, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TEXT_PRESETS, type TextPreset } from '@/lib/tiktok-presets';

interface Run {
    id: number;
    status: 'running' | 'succeeded' | 'failed';
    error: string | null;
    ran_at: string | null;
    content_project_id: number | null;
    title: string | null;
}

interface SocialAccount {
    id: number;
    handle: string;
    avatar: string | null;
}

interface Automation {
    id: number;
    name: string;
    status: 'active' | 'paused';
    niche: string;
    slide_count: number;
    image_source: 'pinterest' | 'ai';
    image_keywords: string[];
    text_position: 'top' | 'center' | 'bottom';
    text_preset: TextPreset;
    post_times: string[];
    timezone: string;
    social_account: SocialAccount | null;
    next_run_at: string | null;
    last_run_at: string | null;
    runs: Run[];
}

interface Props {
    automations: Automation[];
    tiktokAccounts: SocialAccount[];
}

const IMAGE_SOURCES = [
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'ai', label: 'IA (Gemini)' },
] as const;

const TEXT_POSITIONS = [
    { value: 'top', label: 'Topo' },
    { value: 'center', label: 'Meio' },
    { value: 'bottom', label: 'Base' },
] as const;

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

function formatDateTime(value: string | null): string {
    if (!value) return '—';

    return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Automations({ automations, tiktokAccounts }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);

    function toggleStatus(automation: Automation) {
        router.put(
            `/automations/${automation.id}`,
            {
                name: automation.name,
                niche: automation.niche,
                status: automation.status === 'active' ? 'paused' : 'active',
                slide_count: automation.slide_count,
                image_source: automation.image_source,
                image_keywords: automation.image_keywords,
                text_position: automation.text_position,
                text_preset: automation.text_preset,
                post_times: automation.post_times,
                timezone: automation.timezone,
                social_account_id: automation.social_account?.id ?? null,
            },
            { headers: { 'X-CSRF-TOKEN': csrfToken() }, preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Automações" />

            <div className="px-6 py-6">
                <div className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="mb-1 text-xl font-semibold text-gray-900">Automações</h1>
                        <p className="text-sm text-gray-500">
                            O Slidezz gera e agenda carrosséis de TikTok sozinho, nos horários que você definir.
                        </p>
                    </div>
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
                    >
                        <Plus className="h-4 w-4" />
                        Nova automação
                    </Button>
                </div>

                {automations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-24">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                            <Zap className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">
                            Nenhuma automação criada ainda. Crie a primeira para começar.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {automations.map((automation) => (
                            <AutomationCard
                                key={automation.id}
                                automation={automation}
                                onToggleStatus={() => toggleStatus(automation)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AutomationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                tiktokAccounts={tiktokAccounts}
            />
        </>
    );
}

function AutomationCard({
    automation,
    onToggleStatus,
}: {
    automation: Automation;
    onToggleStatus: () => void;
}) {
    const isActive = automation.status === 'active';

    function runNow() {
        router.post(`/automations/${automation.id}/run`, {}, {
            headers: { 'X-CSRF-TOKEN': csrfToken() },
            preserveScroll: true,
        });
    }

    function remove() {
        router.delete(`/automations/${automation.id}`, {
            headers: { 'X-CSRF-TOKEN': csrfToken() },
            preserveScroll: true,
        });
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                        <h2 className="text-sm font-medium text-gray-900">{automation.name}</h2>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                                isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {isActive ? 'Ativa' : 'Pausada'}
                        </span>
                    </div>
                    <p className="line-clamp-2 max-w-xl text-sm text-gray-500">{automation.niche}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {automation.post_times.join(' · ')} ({automation.timezone})
                        </span>
                        <span>{automation.slide_count} slides</span>
                        <span>{automation.image_source === 'ai' ? 'Imagens por IA' : 'Fotos do Pinterest'}</span>
                        <span>
                            {TEXT_PRESETS.find((preset) => preset.value === automation.text_preset)?.label ?? 'Classic'}
                        </span>
                        <span>
                            {automation.social_account ? `@${automation.social_account.handle}` : 'Sem conta conectada'}
                        </span>
                        <span>Próxima: {formatDateTime(automation.next_run_at)}</span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={runNow}>
                        <Zap className="h-4 w-4" />
                        Rodar agora
                    </Button>
                    <Button variant="outline" size="sm" onClick={onToggleStatus}>
                        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={remove}>
                        <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                </div>
            </div>

            {automation.runs.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
                    {automation.runs.map((run) => (
                        <li key={run.id} className="flex items-center gap-2 text-xs text-gray-500">
                            <RunIcon status={run.status} />
                            <span className="w-28 shrink-0 text-gray-400">{formatDateTime(run.ran_at)}</span>
                            <span className="truncate">{run.error ?? run.title ?? 'Gerando...'}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function RunIcon({ status }: { status: Run['status'] }) {
    if (status === 'succeeded') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />;

    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />;
}

function AutomationDialog({
    open,
    onOpenChange,
    tiktokAccounts,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tiktokAccounts: SocialAccount[];
}) {
    const form = useForm({
        name: '',
        niche: '',
        slide_count: 6,
        image_source: 'pinterest' as 'pinterest' | 'ai',
        image_keywords: [] as string[],
        text_position: 'center' as 'top' | 'center' | 'bottom',
        text_preset: 'classic' as TextPreset,
        post_times: ['09:00'],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        social_account_id: null as number | null,
    });

    const [keywords, setKeywords] = useState('');

    function submit(event: React.FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            image_keywords: keywords
                .split(',')
                .map((keyword) => keyword.trim())
                .filter(Boolean),
        }));

        form.post('/automations', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setKeywords('');
                onOpenChange(false);
            },
        });
    }

    function setPostTime(index: number, value: string) {
        form.setData(
            'post_times',
            form.data.post_times.map((time, i) => (i === index ? value : time)),
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Nova automação</DialogTitle>
                        <DialogDescription>
                            A cada horário definido, o Slidezz escreve, monta e agenda um carrossel novo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-5 space-y-4">
                        <div>
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Skincare coreano"
                                required
                            />
                            {form.errors.name && <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>}
                        </div>

                        <div>
                            <Label htmlFor="niche">Nicho / tema</Label>
                            <Textarea
                                id="niche"
                                value={form.data.niche}
                                onChange={(e) => form.setData('niche', e.target.value)}
                                rows={3}
                                placeholder="Rotinas e produtos de skincare coreano para pele oleosa"
                                className="resize-none"
                                required
                            />
                            {form.errors.niche && <p className="mt-1 text-xs text-red-600">{form.errors.niche}</p>}
                        </div>

                        <div>
                            <Label htmlFor="keywords">Palavras-chave de imagem (opcional, separadas por vírgula)</Label>
                            <Input
                                id="keywords"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder="glass skin, shelfie, morning routine"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="slide_count">Slides</Label>
                                <Input
                                    id="slide_count"
                                    type="number"
                                    min={2}
                                    max={12}
                                    value={form.data.slide_count}
                                    onChange={(e) => form.setData('slide_count', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="post_time">Horário</Label>
                                <Input
                                    id="post_time"
                                    type="time"
                                    value={form.data.post_times[0]}
                                    onChange={(e) => setPostTime(0, e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {form.data.post_times.length > 1 && (
                            <div className="grid grid-cols-2 gap-4">
                                {form.data.post_times.slice(1).map((time, index) => (
                                    <Input
                                        key={index}
                                        type="time"
                                        value={time}
                                        onChange={(e) => setPostTime(index + 1, e.target.value)}
                                    />
                                ))}
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setData('post_times', [...form.data.post_times, '19:00'])}
                            disabled={form.data.post_times.length >= 8}
                        >
                            <Plus className="h-4 w-4" />
                            Mais um horário por dia
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Imagens</Label>
                                <div className="mt-1 flex gap-1.5">
                                    {IMAGE_SOURCES.map((source) => (
                                        <OptionChip
                                            key={source.value}
                                            active={form.data.image_source === source.value}
                                            onClick={() => form.setData('image_source', source.value)}
                                        >
                                            {source.label}
                                        </OptionChip>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>Posição do texto</Label>
                                <div className="mt-1 flex gap-1.5">
                                    {TEXT_POSITIONS.map((position) => (
                                        <OptionChip
                                            key={position.value}
                                            active={form.data.text_position === position.value}
                                            onClick={() => form.setData('text_position', position.value)}
                                        >
                                            {position.label}
                                        </OptionChip>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>Fonte</Label>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {TEXT_PRESETS.map((preset) => (
                                    <OptionChip
                                        key={preset.value}
                                        active={form.data.text_preset === preset.value}
                                        onClick={() => form.setData('text_preset', preset.value)}
                                    >
                                        <span className={preset.preview}>{preset.label}</span>
                                    </OptionChip>
                                ))}
                            </div>
                        </div>

                        {tiktokAccounts.length > 0 && (
                            <div>
                                <Label>Conta do TikTok</Label>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    <OptionChip
                                        active={form.data.social_account_id === null}
                                        onClick={() => form.setData('social_account_id', null)}
                                    >
                                        Só gerar
                                    </OptionChip>
                                    {tiktokAccounts.map((account) => (
                                        <OptionChip
                                            key={account.id}
                                            active={form.data.social_account_id === account.id}
                                            onClick={() => form.setData('social_account_id', account.id)}
                                        >
                                            @{account.handle}
                                        </OptionChip>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
                        >
                            {form.processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Criar automação
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function OptionChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
        >
            {children}
        </button>
    );
}
