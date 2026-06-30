import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Loader2, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FadeIn from '@/components/fade-in';

// ─── IdeasOfTheDay ──────────────────────────────────────────────────────────────

interface Idea {
    title: string;
    angle: string;
}

// Decoy reel content shown while the cards "spin" before landing on real ideas.
const DECOY_IDEAS: Idea[] = [
    { title: 'O segredo que ninguém te conta', angle: 'mito_verdade' },
    { title: 'O passo a passo definitivo', angle: 'passo_a_passo' },
    { title: 'O erro que custa caro', angle: 'erro_comum' },
    { title: 'Antes e depois, sem filtro', angle: 'antes_depois' },
    { title: 'A pergunta que todo mundo faz', angle: 'pergunta_frequente' },
    { title: 'Os bastidores do processo', angle: 'bastidores' },
    { title: '3 mitos para enterrar hoje', angle: 'comparacao_metodos' },
    { title: 'O que ninguém te avisou', angle: 'curiosidade' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function goToCreate(params: Record<string, string>) {
    router.visit(`/carousel/create?${new URLSearchParams(params).toString()}`);
}

const REEL_ROW_H = 76; // px per decoy row (and the reel window height)
const REEL_STRIP = [...DECOY_IDEAS, ...DECOY_IDEAS]; // doubled for a seamless loop

function IdeaCard({
    index,
    idea,
    spinning,
    disabled,
    label,
}: {
    index: number;
    idea: Idea;
    spinning: boolean;
    disabled: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled || spinning}
            onClick={() => goToCreate({ topic: idea.title, title: idea.title })}
            className="group flex min-h-[150px] flex-col gap-3 overflow-hidden rounded-2xl border border-[#E8E7E2] bg-white p-5 text-left transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-[#E8440A] enabled:hover:shadow-[0_16px_36px_rgba(232,68,10,0.10)]"
            style={spinning ? { borderColor: 'rgba(232,68,10,0.35)' } : undefined}
        >
            <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8440A]/10 text-[11px] font-extrabold text-[#E8440A]">
                    {index + 1}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-[#888880] uppercase">{label}</span>
            </div>

            {spinning ? (
                // Vertical slot reel — scrolls top-to-bottom, faded at the edges.
                <div
                    className="relative"
                    style={{
                        height: REEL_ROW_H,
                        overflow: 'hidden',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 24%, #000 76%, transparent)',
                        maskImage: 'linear-gradient(to bottom, transparent, #000 24%, #000 76%, transparent)',
                    }}
                >
                    <div
                        style={{
                            animation: 'slidezz-reel 0.5s linear infinite',
                            animationDelay: `-${index * 0.16}s`,
                            willChange: 'transform',
                        }}
                    >
                        {REEL_STRIP.map((d, k) => (
                            <div
                                key={k}
                                className="flex flex-col justify-center gap-1"
                                style={{ height: REEL_ROW_H }}
                            >
                                <p className="line-clamp-2 text-base leading-snug font-bold text-[#1A1A1A]/70">{d.title}</p>
                                <span className="font-mono text-[11px] text-[#888880]">{d.angle}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <motion.div
                    key={idea.title}
                    className="flex flex-1 flex-col gap-3"
                    initial={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                    <p className="flex-1 text-base leading-snug font-bold text-[#1A1A1A]">{idea.title}</p>
                    <span className="font-mono text-[11px] text-[#888880]">{idea.angle}</span>
                </motion.div>
            )}
        </button>
    );
}

function IdeasOfTheDay() {
    const { t, i18n } = useTranslation();
    const ideasUrl = (refresh: boolean) => {
        const lang = i18n.language === 'en' ? 'English' : 'Portuguese (Brazil)';
        const params = new URLSearchParams({ lang });
        if (refresh) params.set('refresh', '1');
        return `/carousel/ideas?${params.toString()}`;
    };
    const [ideas, setIdeas] = useState<Idea[] | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);
    const [topic, setTopic] = useState('');

    // Slot-machine state: which of the 3 cards are still spinning (the reel
    // itself is a pure CSS animation, so no JS ticker is needed).
    const [spin, setSpin] = useState<boolean[]>([false, false, false]);
    const rolling = spin.some(Boolean);

    const fetchInitial = useCallback(async () => {
        setInitialLoading(true);
        setError(false);
        try {
            const res = await fetch(ideasUrl(false), { headers: { Accept: 'application/json' } });
            const data = (await res.json()) as { ideas?: Idea[]; error?: boolean };
            if (data.error || !Array.isArray(data.ideas)) {
                setError(true);
                setIdeas([]);
            } else {
                setIdeas(data.ideas);
            }
        } catch {
            setError(true);
            setIdeas([]);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    // Re-roll with the slot-machine effect: spin all three, then land them one by one.
    const roll = async () => {
        if (initialLoading || rolling) return;

        const previous = ideas ?? [];
        if (previous.length < 3) {
            fetchInitial();
            return;
        }

        setError(false);
        setRateLimited(false);
        setSpin([true, true, true]);
        const startedAt = Date.now();

        let next: Idea[] = previous;
        try {
            const res = await fetch(ideasUrl(true), { headers: { Accept: 'application/json' } });
            if (res.status === 429) {
                // Rate limited — keep the current ideas and tell the user to wait a moment.
                setRateLimited(true);
                window.setTimeout(() => setRateLimited(false), 5000);
            } else if (res.ok) {
                const data = (await res.json()) as { ideas?: Idea[]; error?: boolean };
                if (!data.error && Array.isArray(data.ideas) && data.ideas.length >= 3) {
                    next = data.ideas;
                }
            }
        } catch {
            // On failure the reel simply lands back on the previous ideas.
        }

        // Let the reel spin for a beat even if the API was instant.
        await sleep(Math.max(0, 650 - (Date.now() - startedAt)));

        const landed = [...previous];
        for (let i = 0; i < 3; i++) {
            landed[i] = next[i] ?? landed[i];
            setIdeas([...landed]);
            setSpin((s) => s.map((v, idx) => (idx === i ? false : v)));
            await sleep(300);
        }
        setIdeas(next);
    };

    const submitCustom = () => {
        const value = topic.trim();
        if (value) {
            goToCreate({ topic: value });
        }
    };

    const hasIdeas = !initialLoading && (ideas?.length ?? 0) > 0;

    return (
        <div className="space-y-5">
            {/* Slot-reel keyframes: the doubled strip scrolls top-to-bottom and loops seamlessly. */}
            <style>{'@keyframes slidezz-reel{from{transform:translateY(-50%)}to{transform:translateY(0)}}'}</style>

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                    {t('dashboard.ideas.label')}
                </h2>
                <button
                    type="button"
                    onClick={roll}
                    disabled={initialLoading || rolling}
                    className="flex items-center gap-1.5 rounded-full border border-[#E8E7E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#555550] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A] disabled:opacity-50"
                >
                    <RefreshCw className={`h-3 w-3 ${initialLoading || rolling ? 'animate-spin' : ''}`} />
                    {initialLoading || rolling ? t('dashboard.ideas.generatingShort') : t('dashboard.ideas.regenerate')}
                </button>
            </div>

            {rateLimited && (
                <p className="text-right text-xs font-medium text-[#E8440A]">{t('dashboard.ideas.rateLimited')}</p>
            )}

            {/* Initial loading */}
            {initialLoading && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E8E7E2] bg-white px-6 py-14 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E8440A]" />
                    <p className="text-base font-bold text-[#1A1A1A]">{t('dashboard.ideas.generating')}</p>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#888880] uppercase">
                        <Sparkles className="h-3 w-3 text-[#E8440A]" />
                        {t('dashboard.ideas.generatingCount')}
                    </p>
                </div>
            )}

            {/* Error (no ideas at all) */}
            {!initialLoading && error && !hasIdeas && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E8E7E2] bg-white px-6 py-12 text-center">
                    <p className="text-sm text-[#555550]">{t('dashboard.ideas.error')}</p>
                    <button
                        type="button"
                        onClick={fetchInitial}
                        className="rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                    >
                        {t('dashboard.ideas.retry')}
                    </button>
                </div>
            )}

            {/* Ideas (slot-machine cards) */}
            {hasIdeas && (
                <div className="grid gap-4 sm:grid-cols-3">
                    {ideas!.map((idea, i) => (
                        <IdeaCard
                            key={i}
                            index={i}
                            idea={idea}
                            spinning={spin[i]}
                            disabled={rolling}
                            label={t('dashboard.ideas.ideaLabel', { n: i + 1 })}
                        />
                    ))}
                </div>
            )}

            {/* OR divider */}
            <div className="flex items-center gap-4 pt-1">
                <div className="h-px flex-1 bg-[#E8E7E2]" />
                <span className="text-[11px] font-bold tracking-widest text-[#888880] uppercase">{t('dashboard.ideas.or')}</span>
                <div className="h-px flex-1 bg-[#E8E7E2]" />
            </div>

            {/* Describe your own */}
            <div className="space-y-2.5">
                <label className="text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                    {t('dashboard.ideas.describeLabel')}
                </label>
                <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            submitCustom();
                        }
                    }}
                    rows={3}
                    placeholder={t('dashboard.ideas.describePlaceholder')}
                    className="w-full resize-none rounded-2xl border border-[#E8E7E2] bg-white px-4 py-3 text-base text-[#1A1A1A] placeholder-[#AFACA4] transition-colors outline-none focus:border-[#E8440A] focus:ring-4 focus:ring-[#E8440A]/15"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/slideshow-editor/create"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#888880] transition-colors hover:text-[#1A1A1A]"
                    >
                        <PenLine className="h-3.5 w-3.5" />
                        {t('dashboard.actions.scratch.button')}
                    </Link>
                    <button
                        type="button"
                        onClick={submitCustom}
                        disabled={!topic.trim()}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E8440A] px-7 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#D13D09] disabled:opacity-40"
                    >
                        {t('dashboard.ideas.create')}
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Generate() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('generate.pageTitle')}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=bebas-neue:400|outfit:400,500,600,700,800" rel="stylesheet" />
            </Head>

            <div className="flex-1 bg-[#F9F6F4] font-[Outfit,sans-serif] text-[#1A1A1A]">
                <FadeIn className="px-6 pt-10 pb-16 sm:px-10">
                    <p className="mb-3 text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                        {t('generate.eyebrow')}
                    </p>
                    <h1 className="max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] leading-[0.98] tracking-tight">
                        {t('generate.question')}
                    </h1>
                    <p className="mt-4 max-w-lg text-lg leading-relaxed font-medium text-[#555550]">
                        {t('generate.subtitle')}
                    </p>

                    <div className="mt-8 max-w-3xl">
                        <IdeasOfTheDay />
                    </div>
                </FadeIn>
            </div>
        </>
    );
}
