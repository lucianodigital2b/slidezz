import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestTikTokDraft, SendToTikTokButton } from '@/components/send-to-tiktok-button';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TEXT_PRESETS, type TextPreset } from '@/lib/tiktok-presets';

interface Slide {
    text: string;
    url: string;
}

interface Slideshow {
    id: number;
    title: string;
    status: 'generating' | 'ready' | 'failed';
    topic: string | null;
    caption: string | null;
    hashtags: string[];
    error: string | null;
    slides: Slide[];
    created_at: string | null;
}

interface TikTokAccount {
    id: number;
    handle: string;
    avatar: string | null;
}

interface Props {
    recent: Slideshow[];
    tiktokAccounts: TikTokAccount[];
}

const SLIDE_COUNTS = [4, 5, 6, 7, 8, 10];

const IMAGE_SOURCES = [
    { value: 'pinterest', label: 'Pinterest', hint: 'Fotos reais, look orgânico' },
    { value: 'ai', label: 'IA (Gemini)', hint: 'Precisa da sua chave Gemini' },
] as const;

const TEXT_POSITIONS = [
    { value: 'top', label: 'Topo' },
    { value: 'center', label: 'Meio' },
    { value: 'bottom', label: 'Base' },
] as const;

const POLL_INTERVAL_MS = 3000;

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function CreateTikTok({ recent, tiktokAccounts }: Props) {
    const [topic, setTopic] = useState('');
    const [slideCount, setSlideCount] = useState(6);
    const [imageSource, setImageSource] = useState<'pinterest' | 'ai'>('pinterest');
    const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center');
    const [textPreset, setTextPreset] = useState<TextPreset>('classic');
    const [accountId, setAccountId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [slideshows, setSlideshows] = useState<Slideshow[]>(recent);

    // Keep polling only while something is still rendering.
    const pending = slideshows.filter((s) => s.status === 'generating').map((s) => s.id);
    const pendingKey = pending.join(',');
    const pendingRef = useRef(pendingKey);
    pendingRef.current = pendingKey;

    const refresh = useCallback(async (ids: number[]) => {
        const results = await Promise.all(
            ids.map(async (id) => {
                const res = await fetch(`/tiktok/${id}`, { headers: { Accept: 'application/json' } });

                return res.ok ? ((await res.json()) as Slideshow) : null;
            }),
        );

        setSlideshows((current) =>
            current.map((item) => results.find((updated) => updated?.id === item.id) ?? item),
        );
    }, []);

    useEffect(() => {
        if (pendingKey === '') return;

        const timer = window.setInterval(() => {
            const ids = pendingRef.current.split(',').filter(Boolean).map(Number);

            if (ids.length > 0) void refresh(ids);
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [pendingKey, refresh]);

    async function generate() {
        if (topic.trim() === '' || submitting) return;

        setSubmitting(true);

        try {
            const res = await fetch('/tiktok', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    topic,
                    slide_count: slideCount,
                    image_source: imageSource,
                    text_position: textPosition,
                    text_preset: textPreset,
                    social_account_id: accountId,
                }),
            });

            const body = await res.json();

            if (!res.ok) {
                toast.error(body.message ?? 'Não foi possível iniciar a geração.');

                return;
            }

            setSlideshows((current) => [body as Slideshow, ...current]);
            setTopic('');
            toast.success('Gerando seu carrossel. Isso leva cerca de 1 minuto.');
        } catch {
            toast.error('Não foi possível iniciar a geração.');
        } finally {
            setSubmitting(false);
        }
    }

    function remove(id: number) {
        router.delete(`/tiktok/${id}`, {
            headers: { 'X-CSRF-TOKEN': csrfToken() },
            preserveScroll: true,
            onSuccess: () => setSlideshows((current) => current.filter((item) => item.id !== id)),
        });
    }

    return (
        <>
            <Head title="TikToks automáticos" />

            <div className="px-6 py-6">
                <div className="mb-8">
                    <h1 className="mb-1 text-xl font-semibold text-gray-900">TikToks automáticos</h1>
                    <p className="text-sm text-gray-500">
                        Escreva o tema e o Slidezz monta o carrossel de fotos vertical, com texto no estilo TikTok.
                    </p>
                </div>

                <div className="mb-10 max-w-3xl rounded-xl border border-gray-200 bg-white p-5">
                    <Label htmlFor="topic" className="mb-2 block text-sm font-medium text-gray-900">
                        Sobre o que é o carrossel?
                    </Label>
                    <Textarea
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Ex: hacks de skincare coreano que eu aprendi morando na Coreia"
                        className="mb-5 resize-none"
                    />

                    <div className="mb-5 grid gap-5 sm:grid-cols-3">
                        <Field label="Slides">
                            <div className="flex flex-wrap gap-1.5">
                                {SLIDE_COUNTS.map((count) => (
                                    <Chip key={count} active={slideCount === count} onClick={() => setSlideCount(count)}>
                                        {count}
                                    </Chip>
                                ))}
                            </div>
                        </Field>

                        <Field label="Imagens">
                            <div className="flex flex-wrap gap-1.5">
                                {IMAGE_SOURCES.map((source) => (
                                    <Chip
                                        key={source.value}
                                        active={imageSource === source.value}
                                        title={source.hint}
                                        onClick={() => setImageSource(source.value)}
                                    >
                                        {source.label}
                                    </Chip>
                                ))}
                            </div>
                        </Field>

                        <Field label="Texto">
                            <div className="flex flex-wrap gap-1.5">
                                {TEXT_POSITIONS.map((position) => (
                                    <Chip
                                        key={position.value}
                                        active={textPosition === position.value}
                                        onClick={() => setTextPosition(position.value)}
                                    >
                                        {position.label}
                                    </Chip>
                                ))}
                            </div>
                        </Field>
                    </div>

                    <div className="mb-5">
                        <Field label="Fonte">
                            <div className="flex flex-wrap gap-1.5">
                                {TEXT_PRESETS.map((preset) => (
                                    <Chip
                                        key={preset.value}
                                        active={textPreset === preset.value}
                                        onClick={() => setTextPreset(preset.value)}
                                    >
                                        <span className={preset.preview}>{preset.label}</span>
                                    </Chip>
                                ))}
                            </div>
                        </Field>
                    </div>

                    {tiktokAccounts.length > 0 && (
                        <Field label="Enviar pro rascunho do TikTok (opcional)">
                            <div className="flex flex-wrap gap-1.5">
                                <Chip active={accountId === null} onClick={() => setAccountId(null)}>
                                    Não enviar
                                </Chip>
                                {tiktokAccounts.map((account) => (
                                    <Chip
                                        key={account.id}
                                        active={accountId === account.id}
                                        onClick={() => setAccountId(account.id)}
                                    >
                                        @{account.handle}
                                    </Chip>
                                ))}
                            </div>
                        </Field>
                    )}

                    <div className="mt-5 flex justify-end">
                        <Button
                            onClick={generate}
                            disabled={submitting || topic.trim() === ''}
                            className="bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Gerar carrossel
                        </Button>
                    </div>
                </div>

                {slideshows.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-400">
                        Nenhum carrossel gerado ainda.
                    </p>
                ) : (
                    <div className="space-y-8">
                        {slideshows.map((slideshow) => (
                            <SlideshowCard key={slideshow.id} slideshow={slideshow} tiktokAccounts={tiktokAccounts} onDelete={remove} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <span className="mb-2 block text-xs font-medium text-gray-500">{label}</span>
            {children}
        </div>
    );
}

function Chip({
    active,
    onClick,
    title,
    children,
}: {
    active: boolean;
    onClick: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
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

function SlideshowCard({
    slideshow,
    tiktokAccounts,
    onDelete,
}: {
    slideshow: Slideshow;
    tiktokAccounts: TikTokAccount[];
    onDelete: (id: number) => void;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium text-gray-900">{slideshow.title}</h2>
                    {slideshow.caption && <p className="mt-1 text-sm text-gray-500">{slideshow.caption}</p>}
                    {slideshow.hashtags.length > 0 && (
                        <p className="mt-1 text-sm text-gray-400">
                            {slideshow.hashtags.map((tag) => `#${tag}`).join(' ')}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {slideshow.status === 'ready' && (
                        <SendToTikTokButton
                            accounts={tiktokAccounts}
                            send={(accountId) => requestTikTokDraft(`/tiktok/${slideshow.id}/draft`, { social_account_id: accountId })}
                            className="h-8"
                        />
                    )}
                    {slideshow.status === 'ready' && (
                        <Button variant="outline" size="sm" asChild>
                            <a href={`/tiktok/${slideshow.id}/download`}>
                                <Download className="h-4 w-4" />
                                ZIP
                            </a>
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onDelete(slideshow.id)}>
                        <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                </div>
            </div>

            {slideshow.status === 'generating' && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="aspect-9/16 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                </div>
            )}

            {slideshow.status === 'failed' && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{slideshow.error ?? 'A geração falhou. Tente de novo.'}</span>
                </div>
            )}

            {slideshow.status === 'ready' && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {slideshow.slides.map((slide, index) => (
                        <a
                            key={index}
                            href={slide.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-lg border border-gray-100"
                        >
                            <img src={slide.url} alt={slide.text} className="aspect-9/16 w-full object-cover" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
