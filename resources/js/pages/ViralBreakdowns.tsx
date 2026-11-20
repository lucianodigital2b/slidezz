import { Head } from '@inertiajs/react';
import {
    Check,
    Copy,
    Download,
    Loader2,
    Microscope,
    Trash2,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/csrf';

type BreakdownStatus =
    | 'pending'
    | 'fetching'
    | 'transcribing'
    | 'analyzing'
    | 'rendering'
    | 'done'
    | 'failed';

interface BreakdownSummary {
    id: number;
    title: string;
    status: BreakdownStatus;
    progress: number;
    cover_url: string | null;
    created_at: string;
}

interface BreakdownSlide {
    index: number;
    kind: 'cover' | 'stage';
    key: string;
    title: string;
    duration: number;
    url: string;
}

interface BreakdownStage {
    key: string;
    title: string;
    label: string;
    start: number;
    end: number;
    video_note: string;
}

interface BreakdownAuthor {
    handle: string;
    name: string;
    followers: number | null;
    avatar_url: string | null;
}

interface CurrentBreakdown {
    id: number;
    status: BreakdownStatus;
    progress: number;
    error: string | null;
    source_url: string;
    author: BreakdownAuthor | null;
    views: number | null;
    niche: string | null;
    caption: string | null;
    slides: BreakdownSlide[];
    stages: BreakdownStage[];
    completed_at: string | null;
}

const STATUS_CLASS: Record<BreakdownStatus, string> = {
    pending: 'bg-gray-100 text-gray-600',
    fetching: 'bg-[#EEF1F3] text-[#1A2023]',
    transcribing: 'bg-[#EEF1F3] text-[#1A2023]',
    analyzing: 'bg-[#EEF1F3] text-[#1A2023]',
    rendering: 'bg-[#EEF1F3] text-[#1A2023]',
    done: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
};

const STEP_ORDER: BreakdownStatus[] = [
    'fetching',
    'transcribing',
    'analyzing',
    'rendering',
];

function formatTime(seconds: number): string {
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const remainingSeconds = whole % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatViews(views: number | null): string {
    if (!views) {
        return '';
    }

    return Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(views);
}

function SlideCard({ slide, total }: { slide: BreakdownSlide; total: number }) {
    const [muted, setMuted] = useState(true);

    return (
        <div className="w-[260px] flex-shrink-0 snap-start">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black">
                <video
                    src={slide.url}
                    muted={muted}
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                    className="h-full w-full object-cover"
                    onClick={() => setMuted((prev) => !prev)}
                />
                <button
                    onClick={() => setMuted((prev) => !prev)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                >
                    {muted ? (
                        <VolumeX className="h-4 w-4" />
                    ) : (
                        <Volume2 className="h-4 w-4" />
                    )}
                </button>
            </div>
            <div className="mt-2 space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                    {slide.index + 1}/{total}
                </div>
                <p className="text-sm font-medium">{slide.title}</p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {Math.round(slide.duration)}s
                    </span>
                    <a
                        href={slide.url}
                        download
                        className="text-[#1A2023] hover:underline"
                    >
                        <Download className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function ViralBreakdowns({
    breakdowns,
    prefillUrl,
}: {
    breakdowns: BreakdownSummary[];
    prefillUrl: string | null;
}) {
    const { t, i18n } = useTranslation();
    const [url, setUrl] = useState(prefillUrl || '');
    const [language, setLanguage] = useState<'pt' | 'en'>(() =>
        i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'pt',
    );
    const [submitting, setSubmitting] = useState(false);
    const [current, setCurrent] = useState<CurrentBreakdown | null>(null);
    const [history, setHistory] = useState<BreakdownSummary[]>(breakdowns);

    const isInProgress =
        current !== null && !['done', 'failed'].includes(current.status);
    const isDone = current?.status === 'done';
    const isFailed = current?.status === 'failed';

    async function submitBreakdown(submitUrl: string, lang: 'pt' | 'en') {
        setSubmitting(true);

        try {
            const response = await fetch('/breakdowns', {
                method: 'POST',
                headers: {
                    ...csrfHeaders(),
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: submitUrl, language: lang }),
            });

            const data = await response.json();

            if (response.status === 422) {
                const firstError = data.errors
                    ? Object.values(data.errors).flat()[0]
                    : data.message || t('breakdowns.error');

                throw new Error(firstError);
            }

            if (!response.ok) {
                throw new Error(data?.message || t('breakdowns.error'));
            }

            const id = data.id;

            setCurrent({
                id,
                status: 'pending',
                progress: 0,
                error: null,
                source_url: submitUrl,
                author: null,
                views: null,
                niche: null,
                caption: null,
                slides: [],
                stages: [],
                completed_at: null,
            });

            setHistory((prev) => [
                {
                    id,
                    title: submitUrl || t('breakdowns.untitled'),
                    status: 'pending',
                    progress: 0,
                    cover_url: null,
                    created_at: t('breakdowns.justNow'),
                },
                ...prev,
            ]);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : t('breakdowns.error'),
            );
        } finally {
            setSubmitting(false);
        }
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        submitBreakdown(url, language);
    }

    async function openBreakdown(id: number) {
        try {
            const response = await fetch(`/breakdowns/${id}`, {
                headers: { Accept: 'application/json' },
            });
            const data = await response.json();

            setCurrent(data);
        } catch {
            // Ignore open errors; the history entry remains clickable.
        }
    }

    async function deleteBreakdown(id: number) {
        if (!window.confirm(t('breakdowns.confirmDelete'))) {
            return;
        }

        await fetch(`/breakdowns/${id}`, {
            method: 'DELETE',
            headers: { ...csrfHeaders(), Accept: 'application/json' },
        });

        setHistory((prev) => prev.filter((item) => item.id !== id));

        if (current?.id === id) {
            setCurrent(null);
        }
    }

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('breakdowns.copied'));
        } catch {
            // Clipboard access is unavailable in this browser.
        }
    }

    function retryCurrent() {
        if (current?.source_url) {
            submitBreakdown(current.source_url, language);
        }
    }

    const effectiveStepIndex = (() => {
        if (!current) {
            return -1;
        }

        switch (current.status) {
            case 'pending':
            case 'fetching':
                return 0;
            case 'transcribing':
                return 1;
            case 'analyzing':
                return 2;
            case 'rendering':
                return 3;
            default:
                return -1;
        }
    })();

    useEffect(() => {
        if (!current || ['done', 'failed'].includes(current.status)) {
            return;
        }

        const id = current.id;
        const interval = window.setInterval(async () => {
            try {
                const response = await fetch(`/breakdowns/${id}`, {
                    headers: { Accept: 'application/json' },
                });
                const data = await response.json();

                if (['done', 'failed'].includes(data.status)) {
                    window.clearInterval(interval);
                }

                setCurrent((prev) =>
                    prev?.id === id ? { ...prev, ...data } : prev,
                );

                setHistory((prev) =>
                    prev.map((item) => {
                        if (item.id !== id) {
                            return item;
                        }

                        const authorHandle = data.author?.handle;
                        const views = data.views;
                        const title =
                            authorHandle && views
                                ? `@${authorHandle} · ${formatViews(views)}`
                                : authorHandle
                                  ? `@${authorHandle}`
                                  : item.title;

                        return {
                            ...item,
                            status: data.status,
                            progress: data.progress,
                            cover_url: data.slides?.length
                                ? data.slides[0].url
                                : item.cover_url,
                            title,
                        };
                    }),
                );
            } catch {
                // Polling will retry on the next tick.
            }
        }, 3000);

        return () => window.clearInterval(interval);
    }, [current?.id, current?.status]);

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <Head title={t('breakdowns.title')} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Microscope className="h-6 w-6" />
                            {t('breakdowns.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('breakdowns.subtitle')}
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4 rounded-2xl border p-4"
                    >
                        <div className="space-y-1.5">
                            <label
                                htmlFor="breakdown-url"
                                className="text-sm font-medium"
                            >
                                {t('breakdowns.form.urlLabel')}
                            </label>
                            <input
                                id="breakdown-url"
                                type="url"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                placeholder={t(
                                    'breakdowns.form.urlPlaceholder',
                                )}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-[#1A2023]"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('breakdowns.form.urlHint')}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('breakdowns.form.languageLabel')}
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLanguage('pt')}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                        language === 'pt'
                                            ? 'bg-[#1A2023] text-white'
                                            : 'border bg-background hover:bg-muted'
                                    }`}
                                >
                                    PT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLanguage('en')}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                        language === 'en'
                                            ? 'bg-[#1A2023] text-white'
                                            : 'border bg-background hover:bg-muted'
                                    }`}
                                >
                                    EN
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1.5 rounded-full bg-[#1A2023] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A3438] disabled:opacity-60"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Microscope className="h-4 w-4" />
                            )}
                            {submitting
                                ? t('breakdowns.form.submitting')
                                : t('breakdowns.form.submit')}
                        </button>
                    </form>

                    {isInProgress ? (
                        <div className="space-y-4">
                            {current.author ? (
                                <div className="flex items-center gap-3">
                                    {current.author.avatar_url ? (
                                        <img
                                            src={current.author.avatar_url}
                                            alt={current.author.handle}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                            <Microscope className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium">
                                            @{current.author.handle}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatViews(current.views)}
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-[#1A2023] transition-all"
                                    style={{ width: `${current.progress}%` }}
                                />
                            </div>

                            <div className="space-y-2">
                                {STEP_ORDER.map((step, index) => {
                                    const isCompleted =
                                        index < effectiveStepIndex;
                                    const isCurrentStep =
                                        index === effectiveStepIndex;

                                    return (
                                        <div
                                            key={step}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            {isCompleted ? (
                                                <Check className="h-5 w-5 text-emerald-600" />
                                            ) : isCurrentStep ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-[#1A2023]" />
                                            ) : (
                                                <div className="h-5 w-5 rounded-full border-2 border-muted" />
                                            )}
                                            <span
                                                className={
                                                    isCompleted || isCurrentStep
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground'
                                                }
                                            >
                                                {t(`breakdowns.steps.${step}`)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {current.status === 'rendering' ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t('breakdowns.steps.renderingHint')}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {isFailed ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <p>{current.error || t('breakdowns.error')}</p>
                            <button
                                onClick={retryCurrent}
                                className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                {t('breakdowns.retry')}
                            </button>
                        </div>
                    ) : null}

                    {isDone && current ? (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    {current.author?.avatar_url ? (
                                        <img
                                            src={current.author.avatar_url}
                                            alt={current.author.handle}
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                            <Microscope className="h-6 w-6" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-lg font-semibold">
                                            @{current.author?.handle}
                                        </p>
                                        {current.niche ? (
                                            <p className="text-sm text-muted-foreground">
                                                {current.niche}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={`/breakdowns/${current.id}/download`}
                                        className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
                                    >
                                        <Download className="h-4 w-4" />
                                        {t('breakdowns.downloadAll')}
                                    </a>
                                    <button
                                        onClick={() =>
                                            current.caption &&
                                            copy(current.caption)
                                        }
                                        className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
                                    >
                                        <Copy className="h-4 w-4" />
                                        {t('breakdowns.copyCaption')}
                                    </button>
                                </div>
                            </div>

                            {current.slides.length > 0 ? (
                                <section>
                                    <h3 className="mb-3 text-sm font-semibold">
                                        {t('breakdowns.slidesTitle')}
                                    </h3>
                                    <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                                        {current.slides.map((slide) => (
                                            <SlideCard
                                                key={slide.index}
                                                slide={slide}
                                                total={current.slides.length}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            {current.caption ? (
                                <section className="rounded-2xl border p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            {t('breakdowns.captionLabel')}
                                        </h3>
                                        <button
                                            onClick={() =>
                                                copy(current.caption!)
                                            }
                                            className="flex items-center gap-1.5 text-sm text-[#1A2023] hover:underline"
                                        >
                                            <Copy className="h-4 w-4" />
                                            {t('breakdowns.copyCaption')}
                                        </button>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {current.caption}
                                    </p>
                                </section>
                            ) : null}

                            {current.stages.length > 0 ? (
                                <section>
                                    <h3 className="mb-3 text-sm font-semibold">
                                        {t('breakdowns.stagesTitle')}
                                    </h3>
                                    <div className="space-y-3">
                                        {current.stages.map((stage, stageIndex) => (
                                            <div
                                                key={`${stage.key}-${stageIndex}`}
                                                className="flex items-start gap-3 rounded-2xl border p-4"
                                            >
                                                <span className="rounded-full bg-[#EEF1F3] px-2 py-0.5 text-xs font-medium text-[#1A2023]">
                                                    {stage.label}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium">
                                                            {stage.title}
                                                        </p>
                                                        <span className="shrink-0 text-xs text-muted-foreground">
                                                            {formatTime(
                                                                stage.start,
                                                            )}{' '}
                                                            -{' '}
                                                            {formatTime(
                                                                stage.end,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {stage.video_note ? (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {stage.video_note}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            <p className="text-xs text-muted-foreground">
                                {t('breakdowns.postHint')}
                            </p>
                        </div>
                    ) : null}

                    {current === null ? (
                        <div className="rounded-2xl border p-6">
                            <p className="text-sm">{t('breakdowns.empty')}</p>
                            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                                <li>{t('breakdowns.how.1')}</li>
                                <li>{t('breakdowns.how.2')}</li>
                                <li>{t('breakdowns.how.3')}</li>
                            </ul>
                        </div>
                    ) : null}
                </div>

                <aside>
                    <div className="rounded-2xl border p-4">
                        <h2 className="text-sm font-semibold">
                            {t('breakdowns.history.title')}
                        </h2>
                        <div className="mt-4 space-y-2">
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('breakdowns.history.empty')}
                                </p>
                            ) : (
                                history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 rounded-xl border p-2"
                                    >
                                        {item.cover_url ? (
                                            <video
                                                src={item.cover_url}
                                                muted
                                                playsInline
                                                preload="metadata"
                                                className="h-20 w-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-[#1A2023] text-white">
                                                <Microscope className="h-5 w-5" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() =>
                                                openBreakdown(item.id)
                                            }
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <p className="truncate text-sm font-medium">
                                                {item.title}
                                            </p>
                                            <span
                                                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[item.status]}`}
                                            >
                                                {t(
                                                    `breakdowns.status.${item.status}`,
                                                )}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {item.created_at}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() =>
                                                deleteBreakdown(item.id)
                                            }
                                            title={t('breakdowns.delete')}
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
        </div>
    );
}
