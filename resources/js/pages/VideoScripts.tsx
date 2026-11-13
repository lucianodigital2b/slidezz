import { Head } from '@inertiajs/react';
import { Copy, Loader2, ScrollText, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/csrf';

interface Hook {
    text: string;
    style: string;
}

interface Beat {
    beat: string;
    line: string;
    on_screen_text: string;
    b_roll: string;
}

interface Source {
    title: string;
    url: string;
}

interface ScriptResult {
    title: string;
    hooks: Hook[];
    chosen_hook: number;
    body: Beat[];
    cta: string;
    full_script: string;
    estimated_seconds: number;
    caption: string;
    hashtags: string[];
    sources: Source[];
}

interface ScriptSummary {
    id: number;
    title: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    created_at: string;
}

interface CurrentScript {
    id: number;
    status: string;
    result?: ScriptResult;
    error?: string;
}

const STATUS_CLASS: Record<ScriptSummary['status'], string> = {
    pending: 'bg-gray-100 text-gray-600',
    running: 'bg-[#EEF1F3] text-[#1A2023]',
    done: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
};

export default function VideoScripts({ videoScripts, prefillTopic }: { videoScripts: ScriptSummary[]; prefillTopic: string | null }) {
    const { t } = useTranslation();
    const [topic, setTopic] = useState(prefillTopic || '');
    const [referenceUrl, setReferenceUrl] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [duration, setDuration] = useState('45');
    const [submitting, setSubmitting] = useState(false);
    const [current, setCurrent] = useState<CurrentScript | null>(null);
    const [selectedHook, setSelectedHook] = useState(0);
    const [history, setHistory] = useState<ScriptSummary[]>(videoScripts);
    const [teleprompter, setTeleprompter] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(3);

    const result = current?.status === 'done' ? current.result : null;
    const chosenHook = result?.hooks?.[selectedHook] ?? result?.hooks?.[0];
    const previewText = result
        ? [chosenHook?.text, ...(result.body?.map((beat) => beat.line) ?? []), result.cta]
              .filter(Boolean)
              .join('\n\n')
        : '';

    useEffect(() => {
        if (!current || ['done', 'failed'].includes(current.status)) {
            return;
        }

        const id = current.id;
        const interval = window.setInterval(async () => {
            try {
                const response = await fetch(`/video-scripts/${id}`, {
                    headers: { Accept: 'application/json' },
                });
                const data = await response.json();

                if (['done', 'failed'].includes(data.status)) {
                    window.clearInterval(interval);
                }

                setCurrent((prev) => (prev?.id === id
                    ? { id, status: data.status, result: data.result, error: data.error }
                    : prev));
            } catch {
                // Polling will retry on the next tick.
            }
        }, 3000);

        return () => window.clearInterval(interval);
    }, [current?.id, current?.status]);

    useEffect(() => {
        if (!teleprompter) {
            return;
        }

        const container = document.getElementById('teleprompter-scroll');

        if (!container) {
            return;
        }

        const interval = window.setInterval(() => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
                window.clearInterval(interval);

                return;
            }

            container.scrollBy({ top: 1 });
        }, 160 - scrollSpeed * 10);

        return () => window.clearInterval(interval);
    }, [teleprompter, scrollSpeed]);

    async function createScript(event: React.FormEvent) {
        event.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch('/video-scripts', {
                method: 'POST',
                headers: {
                    ...csrfHeaders(),
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic || null,
                    reference_url: referenceUrl || null,
                    source_url: sourceUrl || null,
                    target_seconds: Number(duration),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || t('videoScripts.error'));
            }

            const id = data.id;

            setCurrent({ id, status: 'pending' });
            setSelectedHook(0);
            setHistory((prev) => [
                {
                    id,
                    title: topic || referenceUrl || t('videoScripts.untitled'),
                    status: 'pending',
                    created_at: t('videoScripts.justNow'),
                },
                ...prev,
            ]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('videoScripts.error'));
        } finally {
            setSubmitting(false);
        }
    }

    async function openScript(id: number) {
        const response = await fetch(`/video-scripts/${id}`, {
            headers: { Accept: 'application/json' },
        });
        const data = await response.json();

        setCurrent({ id, status: data.status, result: data.result, error: data.error });
        setSelectedHook(
            Number.isInteger(data.result?.chosen_hook)
                ? Math.min(data.result.chosen_hook, (data.result?.hooks?.length ?? 1) - 1)
                : 0,
        );
    }

    async function deleteScript(id: number) {
        if (!window.confirm(t('videoScripts.confirmDelete'))) {
            return;
        }

        await fetch(`/video-scripts/${id}`, {
            method: 'DELETE',
            headers: { ...csrfHeaders(), Accept: 'application/json' },
        });

        setHistory((prev) => prev.filter((script) => script.id !== id));

        if (current?.id === id) {
            setCurrent(null);
            setSelectedHook(0);
        }
    }

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('videoScripts.copied'));
        } catch {
            // Clipboard access is unavailable in this browser.
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <Head title={t('videoScripts.title')} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('videoScripts.title')}</h1>
                        <p className="text-sm text-muted-foreground">{t('videoScripts.subtitle')}</p>
                    </div>

                    <form onSubmit={createScript} className="space-y-4 rounded-2xl border p-4">
                        <div className="space-y-1.5">
                            <label htmlFor="topic" className="text-sm font-medium">
                                {t('videoScripts.form.topicLabel')}
                            </label>
                            <textarea
                                id="topic"
                                value={topic}
                                onChange={(event) => setTopic(event.target.value)}
                                placeholder={t('videoScripts.form.topicPlaceholder')}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-[#1A2023]"
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="reference_url" className="text-sm font-medium">
                                    {t('videoScripts.form.referenceLabel')}
                                </label>
                                <input
                                    id="reference_url"
                                    type="url"
                                    value={referenceUrl}
                                    onChange={(event) => setReferenceUrl(event.target.value)}
                                    placeholder="https://vm.tiktok.com/..."
                                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-[#1A2023]"
                                />
                                <p className="text-xs text-muted-foreground">{t('videoScripts.form.referenceHint')}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="source_url" className="text-sm font-medium">
                                    {t('videoScripts.form.sourceLabel')}
                                </label>
                                <input
                                    id="source_url"
                                    type="url"
                                    value={sourceUrl}
                                    onChange={(event) => setSourceUrl(event.target.value)}
                                    placeholder="https://..."
                                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-[#1A2023]"
                                />
                                <p className="text-xs text-muted-foreground">{t('videoScripts.form.sourceHint')}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="duration" className="text-sm font-medium">
                                    {t('videoScripts.form.durationLabel')}
                                </label>
                                <select
                                    id="duration"
                                    value={duration}
                                    onChange={(event) => setDuration(event.target.value)}
                                    className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-[#1A2023]"
                                >
                                    <option value="15">15s</option>
                                    <option value="30">30s</option>
                                    <option value="45">45s</option>
                                    <option value="60">60s</option>
                                    <option value="90">90s</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-1.5 rounded-full bg-[#1A2023] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A3438] disabled:opacity-60"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
                                {submitting ? t('videoScripts.form.submitting') : t('videoScripts.form.submit')}
                            </button>
                        </div>
                    </form>

                    {current?.status === 'pending' || current?.status === 'running' ? (
                        <div className="flex items-center gap-3 rounded-2xl border p-4 text-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-[#1A2023]" />
                            <span>{t(`videoScripts.status.${current.status}`)}</span>
                        </div>
                    ) : null}

                    {current?.status === 'failed' ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {current.error || t('videoScripts.error')}
                        </div>
                    ) : null}

                    {result ? (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold">{result.title}</h2>
                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS.done}`}>
                                        {t('videoScripts.status.done')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTeleprompter(true)}
                                    className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
                                >
                                    <ScrollText className="h-4 w-4" />
                                    {t('videoScripts.teleprompter.toggle')}
                                </button>
                            </div>

                            <section>
                                <h3 className="mb-2 text-sm font-semibold">{t('videoScripts.hooks.title')}</h3>
                                <p className="mb-3 text-xs text-muted-foreground">{t('videoScripts.hooks.selectHint')}</p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {result.hooks.map((hook, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedHook(index)}
                                            className={`rounded-2xl border p-4 text-left transition ${
                                                selectedHook === index
                                                    ? 'border-[#1A2023] bg-[#1A2023] text-white'
                                                    : 'border bg-card hover:border-[#1A2023]'
                                            }`}
                                        >
                                            <span className="text-xs uppercase tracking-wide opacity-70">{hook.style}</span>
                                            <p className="mt-1 text-sm font-medium">{hook.text}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl border p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">{t('videoScripts.copyScript')}</h3>
                                    <button
                                        onClick={() => copy(previewText)}
                                        className="flex items-center gap-1.5 text-sm text-[#1A2023] hover:underline"
                                    >
                                        <Copy className="h-4 w-4" />
                                        {t('videoScripts.copy')}
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-relaxed">{previewText}</pre>
                            </section>

                            <section>
                                <h3 className="mb-3 text-sm font-semibold">{t('videoScripts.beats.title')}</h3>
                                <div className="overflow-x-auto rounded-2xl border">
                                    <table className="w-full min-w-[600px] text-left text-sm">
                                        <thead className="bg-muted text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-2">{t('videoScripts.beats.beat')}</th>
                                                <th className="px-4 py-2">{t('videoScripts.beats.line')}</th>
                                                <th className="px-4 py-2">{t('videoScripts.beats.onScreenText')}</th>
                                                <th className="px-4 py-2">{t('videoScripts.beats.bRoll')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.body.map((beat, index) => (
                                                <tr key={index} className="border-t">
                                                    <td className="px-4 py-2 font-medium">{beat.beat}</td>
                                                    <td className="px-4 py-2">{beat.line}</td>
                                                    <td className="px-4 py-2">{beat.on_screen_text}</td>
                                                    <td className="px-4 py-2">{beat.b_roll}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border p-4">
                                    <h3 className="mb-2 text-sm font-semibold">{t('videoScripts.cta')}</h3>
                                    <p className="text-sm">{result.cta}</p>
                                </div>

                                <div className="rounded-2xl border p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">{t('videoScripts.caption')}</h3>
                                        <button
                                            onClick={() => copy(result.caption)}
                                            className="flex items-center gap-1.5 text-sm text-[#1A2023] hover:underline"
                                        >
                                            <Copy className="h-4 w-4" />
                                            {t('videoScripts.copy')}
                                        </button>
                                    </div>
                                    <p className="text-sm">{result.caption}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {result.hashtags.map((hashtag) => (
                                            <span key={hashtag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                                #{hashtag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {result.sources.length > 0 ? (
                                <section className="rounded-2xl border p-4">
                                    <h3 className="mb-2 text-sm font-semibold">{t('videoScripts.sources')}</h3>
                                    <ul className="space-y-2 text-sm">
                                        {result.sources.map((source, index) => (
                                            <li key={index}>
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#1A2023] underline"
                                                >
                                                    {source.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            <button
                                onClick={() => copy(previewText)}
                                className="flex items-center gap-1.5 rounded-full bg-[#1A2023] px-5 py-2 text-sm font-medium text-white hover:bg-[#2A3438]"
                            >
                                <Copy className="h-4 w-4" />
                                {t('videoScripts.copyScript')}
                            </button>
                        </div>
                    ) : current?.status === 'failed' ? null : null}
                </div>

                <aside>
                    <div className="rounded-2xl border p-4">
                        <h2 className="text-sm font-semibold">{t('videoScripts.history.title')}</h2>
                        <div className="mt-4 space-y-2">
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('videoScripts.history.empty')}</p>
                            ) : (
                                history.map((script) => (
                                    <div key={script.id} className="flex items-center gap-2 rounded-xl border p-2">
                                        <button
                                            onClick={() => openScript(script.id)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <p className="truncate text-sm font-medium">{script.title}</p>
                                            <span className="text-xs text-muted-foreground">
                                                {t(`videoScripts.status.${script.status}`)} · {script.created_at}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => deleteScript(script.id)}
                                            title={t('videoScripts.delete')}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {teleprompter ? (
                <div className="fixed inset-0 z-50 bg-black/95 text-white">
                    <div className="flex items-center justify-between gap-4 p-4">
                        <button
                            onClick={() => setTeleprompter(false)}
                            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm hover:bg-white/10"
                        >
                            <X className="h-4 w-4" />
                            {t('videoScripts.teleprompter.close')}
                        </button>
                        <label className="flex items-center gap-2 text-sm">
                            {t('videoScripts.teleprompter.speed')}
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={scrollSpeed}
                                onChange={(event) => setScrollSpeed(Number(event.target.value))}
                                className="accent-white"
                            />
                        </label>
                    </div>
                    <div
                        id="teleprompter-scroll"
                        className="mx-auto h-[calc(100vh-5rem)] max-w-3xl overflow-y-auto px-6 py-10 text-4xl leading-relaxed whitespace-pre-wrap"
                    >
                        {previewText}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
