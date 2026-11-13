import { Head, Link, router } from '@inertiajs/react';
import { Copy, ExternalLink, Loader2, ScanSearch } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/csrf';

interface ConnectedAccount {
    provider: string;
    username: string | null;
}

interface AnalysisSummary {
    id: number;
    status: 'pending' | 'running' | 'done' | 'failed';
    created_at: string;
    summary: string | null;
    error: string | null;
}

interface WhatWorksItem {
    pattern: string;
    evidence: string;
}

interface GapItem {
    gap: string;
    why: string;
}

interface TopPost {
    url: string;
    why_it_worked: string;
}

interface NextPost {
    format: 'carousel' | 'slideshow' | 'talking_video';
    idea: string;
    hook: string;
}

interface Report {
    summary: string;
    what_works: WhatWorksItem[];
    what_is_missing: GapItem[];
    top_posts: TopPost[];
    hooks_that_work: string[];
    next_posts: NextPost[];
    posting_frequency: string;
}

interface Props {
    analyses: AnalysisSummary[];
    latestReport: Report | null;
    latestStatus: 'pending' | 'running' | 'done' | 'failed' | null;
    latestError: string | null;
    connectedAccounts: ConnectedAccount[];
}

const FORMAT_BADGE: Record<NextPost['format'], string> = {
    carousel: 'bg-purple-100 text-purple-700',
    slideshow: 'bg-emerald-100 text-emerald-700',
    talking_video: 'bg-blue-100 text-blue-700',
};

export default function ProfileAnalysis({ analyses, latestReport, latestStatus, latestError, connectedAccounts }: Props) {
    const { t } = useTranslation();
    const [links, setLinks] = useState('');
    const [busy, setBusy] = useState(false);
    const [analysisId, setAnalysisId] = useState<number | null>(null);
    const [status, setStatus] = useState<'pending' | 'running' | 'done' | 'failed' | null>(latestStatus ?? null);
    const [report, setReport] = useState<Report | null>(latestReport);
    const [error, setError] = useState<string | null>(latestError);

    useEffect(() => {
        if (!analysisId || (status !== 'pending' && status !== 'running')) {
            return;
        }

        const interval = window.setInterval(async () => {
            try {
                const response = await fetch(`/profile-analysis/${analysisId}`, {
                    headers: { Accept: 'application/json', ...csrfHeaders() },
                });

                if (!response.ok) {
                    window.clearInterval(interval);
                    setBusy(false);
                    setStatus('failed');
                    setError(t('profileAnalysis.failed'));

                    return;
                }

                const data = await response.json();
                setStatus(data.status);
                setReport(data.report ?? null);
                setError(data.error ?? null);

                if (data.status === 'done' || data.status === 'failed') {
                    window.clearInterval(interval);
                    setBusy(false);

                    if (data.status === 'done') {
                        router.reload({ only: ['analyses'] });
                    }
                }
            } catch {
                window.clearInterval(interval);
                setBusy(false);
                setStatus('failed');
                setError(t('profileAnalysis.failed'));
            }
        }, 3000);

        return () => window.clearInterval(interval);
    }, [analysisId, status, t]);

    async function startAnalysis() {
        if (busy) {
            return;
        }

        const parsedLinks = links
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '');

        if (parsedLinks.length === 0 && connectedAccounts.length === 0) {
            toast.error(t('profileAnalysis.noAnalysis'));

            return;
        }

        setBusy(true);
        setStatus('pending');
        setError(null);

        try {
            const response = await fetch('/profile-analysis', {
                method: 'POST',
                headers: { ...csrfHeaders(), Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: parsedLinks }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message ?? t('profileAnalysis.failed'));
            }

            setAnalysisId(data.id);
            setStatus(data.status);
        } catch (e) {
            setBusy(false);
            setStatus('failed');
            setError(e instanceof Error ? e.message : t('profileAnalysis.failed'));
            toast.error(t('profileAnalysis.failed'));
        }
    }

    async function copyText(text: string, successMessage: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(successMessage);
        } catch {
            toast.error(t('profileAnalysis.copyFailed'));
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <Head title={t('profileAnalysis.title')} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{t('profileAnalysis.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('profileAnalysis.subtitle')}</p>
                </div>
                <button
                    onClick={() => router.visit('/profile-analysis')}
                    className="hidden items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                    <ScanSearch className="h-4 w-4" />
                    {t('profileAnalysis.history')}
                </button>
            </div>

            {connectedAccounts.length > 0 && (
                <div className="mb-4 rounded-2xl border bg-card p-4 text-sm">
                    <span className="font-medium">{t('profileAnalysis.connectedAccounts')} </span>
                    {connectedAccounts.map((account) => (
                        <span key={`${account.provider}-${account.username}`} className="mr-2 inline-flex rounded-full bg-muted px-3 py-1">
                            @{account.username ?? account.provider}
                        </span>
                    ))}
                </div>
            )}

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <label className="mb-1 block text-sm font-medium">{t('profileAnalysis.linksLabel')}</label>
                    <textarea
                        value={links}
                        onChange={(e) => setLinks(e.target.value)}
                        rows={5}
                        placeholder={t('profileAnalysis.linksPlaceholder')}
                        className="w-full rounded-xl border bg-card p-3 text-sm"
                    />
                    <div className="mt-3">
                        <button
                            onClick={startAnalysis}
                            disabled={busy}
                            className="flex items-center gap-1.5 rounded-full bg-[#1A2023] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A3438] disabled:opacity-60"
                        >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                            {busy ? t('profileAnalysis.analyzing') : t('profileAnalysis.analyzeButton')}
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="mb-2 text-sm font-medium">{t('profileAnalysis.history')}</h2>
                    <div className="space-y-2">
                        {analyses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('profileAnalysis.historyEmpty')}</p>
                        ) : (
                            analyses.map((analysis) => (
                                <div key={analysis.id} className="rounded-xl border bg-card p-3 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">#{analysis.id}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(analysis.status)}`}>
                                            {t(`profileAnalysis.status.${analysis.status}`)}
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                        {analysis.summary ?? analysis.error ?? analysis.created_at}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {status === 'failed' && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {t('profileAnalysis.error', { error: error ?? '' })}
                </div>
            )}

            {report && (
                <div className="space-y-6">
                    <section className="rounded-2xl border bg-card p-5">
                        <h2 className="mb-2 text-xl font-semibold">{t('profileAnalysis.summary')}</h2>
                        <p className="text-sm leading-relaxed">{report.summary}</p>
                        <p className="mt-3 text-sm font-medium">{t('profileAnalysis.postingFrequency')}: {report.posting_frequency}</p>
                    </section>

                    {report.what_works.length > 0 && (
                        <section className="rounded-2xl border bg-card p-5">
                            <h2 className="mb-3 text-xl font-semibold">{t('profileAnalysis.whatWorks')}</h2>
                            <ul className="space-y-3">
                                {report.what_works.map((item) => (
                                    <li key={item.pattern} className="rounded-xl bg-muted/50 p-3">
                                        <p className="font-medium">{item.pattern}</p>
                                        <p className="text-sm text-muted-foreground">{item.evidence}</p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {report.what_is_missing.length > 0 && (
                        <section className="rounded-2xl border bg-card p-5">
                            <h2 className="mb-3 text-xl font-semibold">{t('profileAnalysis.whatIsMissing')}</h2>
                            <ul className="space-y-3">
                                {report.what_is_missing.map((item) => (
                                    <li key={item.gap} className="rounded-xl bg-muted/50 p-3">
                                        <p className="font-medium">{item.gap}</p>
                                        <p className="text-sm text-muted-foreground">{item.why}</p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {report.top_posts.length > 0 && (
                        <section className="rounded-2xl border bg-card p-5">
                            <h2 className="mb-3 text-xl font-semibold">{t('profileAnalysis.topPosts')}</h2>
                            <ul className="space-y-3">
                                {report.top_posts.map((post) => (
                                    <li key={post.url} className="rounded-xl bg-muted/50 p-3">
                                        <a
                                            href={post.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            {t('profileAnalysis.viewPost')}
                                        </a>
                                        <p className="text-sm text-muted-foreground">{post.why_it_worked}</p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {report.hooks_that_work.length > 0 && (
                        <section className="rounded-2xl border bg-card p-5">
                            <h2 className="mb-3 text-xl font-semibold">{t('profileAnalysis.hooksThatWork')}</h2>
                            <div className="flex flex-wrap gap-2">
                                {report.hooks_that_work.map((hook) => (
                                    <button
                                        key={hook}
                                        onClick={() => copyText(hook, t('profileAnalysis.copied'))}
                                        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        {hook}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {report.next_posts.length > 0 && (
                        <section className="rounded-2xl border bg-card p-5">
                            <h2 className="mb-3 text-xl font-semibold">{t('profileAnalysis.nextPosts')}</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {report.next_posts.map((post) => (
                                    <div key={post.idea} className="rounded-xl border p-4">
                                        <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${FORMAT_BADGE[post.format]}`}>
                                            {t(`profileAnalysis.format.${post.format}`)}
                                        </span>
                                        <p className="text-sm font-medium">{post.idea}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{post.hook}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            {post.format === 'carousel' && (
                                                <button
                                                    onClick={() => copyText(post.idea, t('profileAnalysis.copiedIdea'))}
                                                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    {t('profileAnalysis.copyIdea')}
                                                </button>
                                            )}
                                            {post.format === 'talking_video' && (
                                                <Link
                                                    href={`/video-scripts?topic=${encodeURIComponent(post.idea)}`}
                                                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    {t('profileAnalysis.openVideoScript')}
                                                </Link>
                                            )}
                                            {post.format === 'slideshow' && (
                                                <button
                                                    onClick={() => copyText(post.idea, t('profileAnalysis.copiedIdea'))}
                                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    {t('profileAnalysis.copyIdea')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

function statusBadge(status: AnalysisSummary['status']): string {
    return {
        pending: 'bg-gray-100 text-gray-600',
        running: 'bg-[#EEF1F3] text-[#1A2023]',
        done: 'bg-emerald-100 text-emerald-700',
        failed: 'bg-red-100 text-red-700',
    }[status];
}
