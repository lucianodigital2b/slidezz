import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Files,
    Gift,
    PenLine,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';
import CtaButton from '@/components/cta-button';
import FadeIn from '@/components/fade-in';
import { SlideThumbnail } from '@/components/SlideEditor/SlideThumbnail';
import type { Format } from '@/components/SlideEditor/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
    id: number;
    title: string;
    format: string;
    template: string | null;
    prompt: string | null;
    slide_count: number;
    cover_color: string;
    first_slide: { background: string; elements: unknown[] } | null;
    created_at: string;
}

interface PaginatedProjects {
    data: Project[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ─── CarouselCard ─────────────────────────────────────────────────────────────

function CarouselCard({ project }: { project: Project }) {
    const { t } = useTranslation();
    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? '';

    function copyPrompt() {
        if (project.prompt) {
            navigator.clipboard.writeText(project.prompt);
        }
    }

    async function handleDuplicate() {
        const res = await fetch(
            SlideProjectController.duplicate(project.id).url,
            {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            },
        );

        if (res.ok) {
            router.reload();
        }
    }

    async function handleDelete() {
        await fetch(SlideProjectController.destroy(project.id).url, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': csrfToken() },
        });
        router.reload();
    }

    const templateLabel = project.template
        ? project.template
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Editor';

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E7E2] bg-white transition-colors hover:border-[#1A1A1A]">
            {/* Thumbnail */}
            <div className="relative flex-none overflow-hidden">
                {project.first_slide ? (
                    <SlideThumbnail
                        slide={
                            project.first_slide as Parameters<
                                typeof SlideThumbnail
                            >[0]['slide']
                        }
                        format={project.format as Format}
                    />
                ) : (
                    <div
                        style={{
                            aspectRatio:
                                project.format === 'stories' ? '9/16' : '3/4',
                            background: project.cover_color,
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
                    <BookOpen className="h-3 w-3 text-white/80" />
                    <span className="text-[10px] font-semibold text-white/80">
                        {templateLabel}
                    </span>
                </div>
                <div className="absolute top-3 right-3 rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold text-white/80">
                        {project.slide_count} slides
                    </span>
                </div>
                <div className="absolute right-0 bottom-0 left-0 p-4">
                    <p className="line-clamp-2 font-display text-sm leading-tight font-bold tracking-wide text-white uppercase">
                        {project.title}
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 p-4">
                <div>
                    <p className="line-clamp-1 text-sm font-semibold text-[#1A1A1A]">
                        {project.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[#888880]" />
                        <span className="text-[11px] text-[#888880]">
                            {project.created_at}
                        </span>
                    </div>
                </div>

                {project.prompt && (
                    <div className="rounded-lg border border-[#E8E7E2] bg-[#FAFAF7] px-3 py-2">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider text-[#888880] uppercase">
                                {t('dashboard.promptLabel')}
                            </span>
                            <button
                                type="button"
                                onClick={copyPrompt}
                                className="flex items-center gap-1 text-[10px] text-[#888880] transition-colors hover:text-[#1A1A1A]"
                            >
                                <Copy className="h-3 w-3" />
                                {t('dashboard.copy')}
                            </button>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-[#555550]">
                            {project.prompt}
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            router.visit(
                                SlideProjectController.edit(project.id).url,
                            )
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E8E7E2] py-2 text-xs font-semibold text-[#555550] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('dashboard.open')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDuplicate}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E8E7E2] py-2 text-xs font-semibold text-[#555550] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                    >
                        <Files className="h-3.5 w-3.5" />
                        {t('dashboard.duplicate')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center justify-center rounded-lg border border-[#E8E7E2] p-2 text-[#888880] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
    current,
    last,
    search,
}: {
    current: number;
    last: number;
    search: string;
}) {
    const { t } = useTranslation();

    if (last <= 1) {
        return null;
    }

    const pages: (number | '…')[] = [];

    if (last <= 7) {
        for (let i = 1; i <= last; i++) {
            pages.push(i);
        }
    } else {
        pages.push(1);

        if (current > 3) {
            pages.push('…');
        }

        for (
            let i = Math.max(2, current - 1);
            i <= Math.min(last - 1, current + 1);
            i++
        ) {
            pages.push(i);
        }

        if (current < last - 2) {
            pages.push('…');
        }

        pages.push(last);
    }

    function goTo(page: number) {
        const params: Record<string, string | number> = { page };

        if (search) {
            params.search = search;
        }

        router.get(window.location.pathname, params, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    return (
        <div className="flex items-center justify-center gap-1 pt-10 pb-2">
            <button
                onClick={() => goTo(current - 1)}
                disabled={current === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[#555550] transition-colors hover:text-[#1A1A1A] disabled:opacity-40"
            >
                <ChevronLeft className="h-4 w-4" />
                {t('dashboard.prev')}
            </button>
            {pages.map((p, i) =>
                p === '…' ? (
                    <span key={`e${i}`} className="px-2 text-[#888880]">
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => goTo(p as number)}
                        className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors ${p === current ? 'bg-[#1A1A1A] text-white' : 'text-[#555550] hover:bg-[#1A1A1A]/5 hover:text-[#1A1A1A]'}`}
                    >
                        {p}
                    </button>
                ),
            )}
            <button
                onClick={() => goTo(current + 1)}
                disabled={current === last}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[#555550] transition-colors hover:text-[#1A1A1A] disabled:opacity-40"
            >
                {t('dashboard.next')}
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── WelcomeModal ─────────────────────────────────────────────────────────────

function WelcomeModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    onClose();
                }
            }}
        >
            <DialogContent className="text-center sm:max-w-md">
                <DialogHeader className="items-center gap-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE156]/10">
                        <Gift className="h-8 w-8 text-[#1A1A1A]" />
                    </div>
                    <DialogTitle className="font-display text-2xl tracking-wide text-[#1A1A1A]">
                        {t('dashboard.welcome.title')}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-[#555550]">
                        {t('dashboard.welcome.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="my-2 flex items-center justify-center gap-2 rounded-xl border border-[#FFE156]/15 bg-[#FFE156]/5 px-4 py-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-[#1A1A1A]" />
                    <span className="text-sm font-bold text-[#1A1A1A]">
                        {t('dashboard.welcome.credits')}
                    </span>
                </div>

                <DialogFooter className="sm:justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            router.visit('/carousel/create');
                        }}
                        className="w-full rounded-xl bg-[#FFE156] px-6 py-3 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D]"
                    >
                        {t('dashboard.welcome.cta')}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({
    projects,
    search: initialSearch,
    show_welcome,
}: {
    projects: PaginatedProjects;
    search: string;
    show_welcome: boolean;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(initialSearch ?? '');
    const [welcomeOpen, setWelcomeOpen] = useState(show_welcome);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const params: Record<string, string | number> = { page: 1 };

            if (search.trim()) {
                params.search = search.trim();
            }

            router.get(window.location.pathname, params, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 400);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search]);

    return (
        <>
            <Head title={t('dashboard.pageTitle')}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=outfit:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>
            <WelcomeModal
                open={welcomeOpen}
                onClose={() => setWelcomeOpen(false)}
            />

            <div className="flex-1 bg-[#F9F6F4] font-[Outfit,sans-serif] text-[#1A1A1A]">
                {/* ── Hero ── */}
                <FadeIn className="border-b border-[#1A1A1A]/10 px-6 pt-10 pb-9 sm:px-10">
                    <p className="mb-3 text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                        {t('dashboard.heroEyebrow')}
                    </p>
                    <h1 className="max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] leading-[0.98] tracking-tight">
                        {t('dashboard.question')}
                    </h1>
                    <p className="mt-4 max-w-lg text-lg leading-relaxed font-medium text-[#555550]">
                        {t('dashboard.heroSubtitle')}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                        <CtaButton
                            href="/carousel/create"
                            className="py-2 pr-2 pl-7 text-base"
                        >
                            {t('dashboard.actions.createAi.button')}
                        </CtaButton>
                        <Link
                            href="/slideshow-editor/create"
                            className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A] px-6 py-2.5 text-base font-bold text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                        >
                            <PenLine className="h-4 w-4" />
                            {t('dashboard.actions.scratch.button')}
                        </Link>
                    </div>
                </FadeIn>

                {/* ── Recent projects ── */}
                <section className="px-6 py-9 sm:px-10">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <h2 className="shrink-0 text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                            {t('dashboard.recentLabel')}
                        </h2>
                        <div className="relative w-full max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#888880]" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('dashboard.searchPlaceholder')}
                                className="w-full rounded-full border border-[#E8E7E2] bg-white py-2 pr-3 pl-8 text-sm text-[#1A1A1A] placeholder-[#888880] transition-colors outline-none focus:border-[#FFE156]"
                            />
                        </div>
                    </div>

                    {projects.data.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {projects.data.map((project) => (
                                    <CarouselCard
                                        key={project.id}
                                        project={project}
                                    />
                                ))}
                            </div>
                            <Pagination
                                current={projects.current_page}
                                last={projects.last_page}
                                search={search}
                            />
                        </>
                    ) : search.trim() ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-28">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE156]/10">
                                <Search className="h-6 w-6 text-[#1A1A1A]" />
                            </div>
                            <p className="text-sm text-[#555550]">
                                {t('dashboard.noResults')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="mt-2 rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                            >
                                {t('dashboard.clearSearch')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 py-24">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE156]/10">
                                <Sparkles className="h-6 w-6 text-[#1A1A1A]" />
                            </div>
                            <p className="max-w-sm text-center text-sm leading-relaxed text-[#555550]">
                                {t('dashboard.empty')}
                            </p>
                            <CtaButton
                                href="/carousel/create"
                                className="mt-1 py-2 pr-2 pl-7 text-base"
                            >
                                {t('dashboard.actions.createAi.button')}
                            </CtaButton>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
