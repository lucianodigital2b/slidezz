import { Head, router } from '@inertiajs/react';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Files,
    PenLine,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
    id: number;
    title: string;
    format: string;
    template: string | null;
    prompt: string | null;
    slide_count: number;
    cover_color: string;
    created_at: string;
}

interface PaginatedProjects {
    data: Project[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ─── ActionCard ───────────────────────────────────────────────────────────────

function ActionCard({
    icon, title, description, buttonLabel, onClick, primary,
}: {
    icon: React.ReactNode; title: string; description: string;
    buttonLabel: string; onClick: () => void; primary?: boolean;
}) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 hover:border-gray-300 transition-colors shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">{icon}</div>
            <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">{description}</p>
            </div>
            <button
                type="button"
                onClick={onClick}
                className={`flex items-center gap-2 self-start rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    primary ? 'bg-black text-white hover:bg-gray-800' : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
                {buttonLabel} <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
        </div>
    );
}

// ─── CarouselCard ─────────────────────────────────────────────────────────────

function CarouselCard({ project }: { project: Project }) {
    const { t } = useTranslation();
    const csrfToken = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

    function copyPrompt() {
        if (project.prompt) navigator.clipboard.writeText(project.prompt);
    }

    async function handleDuplicate() {
        const res = await fetch(SlideProjectController.duplicate(project.id).url, {
            method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken() },
        });
        if (res.ok) router.reload();
    }

    async function handleDelete() {
        await fetch(SlideProjectController.destroy(project.id).url, {
            method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrfToken() },
        });
        router.reload();
    }

    const templateLabel = project.template
        ? project.template.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Editor';

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition-colors">
            {/* Thumbnail */}
            <div
                className="relative flex-none overflow-hidden"
                style={{ aspectRatio: project.format === 'stories' ? '9/16' : '3/4', background: project.cover_color }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
                    <BookOpen className="h-3 w-3 text-white/80" />
                    <span className="text-[10px] font-semibold text-white/80">{templateLabel}</span>
                </div>
                <div className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold text-white/80">{project.slide_count} slides</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm font-bold text-white leading-tight line-clamp-2 uppercase tracking-wide">
                        {project.title}
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 p-4">
                <div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{project.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-[11px] text-gray-500">{project.created_at}</span>
                    </div>
                </div>

                {project.prompt && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.promptLabel')}</span>
                            <button type="button" onClick={copyPrompt} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors">
                                <Copy className="h-3 w-3" />{t('dashboard.copy')}
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{project.prompt}</p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.visit(SlideProjectController.edit(project.id).url)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />{t('dashboard.open')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDuplicate}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
                    >
                        <Files className="h-3.5 w-3.5" />{t('dashboard.duplicate')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ current, last }: { current: number; last: number }) {
    const { t } = useTranslation();
    if (last <= 1) return null;

    const pages: (number | '…')[] = [];
    if (last <= 7) {
        for (let i = 1; i <= last; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('…');
        for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) pages.push(i);
        if (current < last - 2) pages.push('…');
        pages.push(last);
    }

    function goTo(page: number) {
        router.get(window.location.pathname, { page } as Record<string, unknown>, { preserveScroll: true, preserveState: true });
    }

    return (
        <div className="flex items-center justify-center gap-1 pt-8 pb-2">
            <button onClick={() => goTo(current - 1)} disabled={current === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors">
                <ChevronLeft className="h-4 w-4" />{t('dashboard.prev')}
            </button>
            {pages.map((p, i) =>
                p === '…' ? (
                    <span key={`e${i}`} className="px-2 text-gray-400">…</span>
                ) : (
                    <button key={p} onClick={() => goTo(p as number)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${p === current ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                        {p}
                    </button>
                )
            )}
            <button onClick={() => goTo(current + 1)} disabled={current === last}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors">
                {t('dashboard.next')}<ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ projects }: { projects: PaginatedProjects }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('dashboard.pageTitle')} />
            <div className="flex-1 p-6">

                {/* Action cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
                    <ActionCard primary
                        icon={<Sparkles className="h-5 w-5 text-gray-900" />}
                        title={t('dashboard.actions.createAi.title')}
                        description={t('dashboard.actions.createAi.description')}
                        buttonLabel={t('dashboard.actions.createAi.button')}
                        onClick={() => router.visit('/carousel/create')}
                    />
                    <ActionCard
                        icon={<BookOpen className="h-5 w-5 text-gray-500" />}
                        title={t('dashboard.actions.train.title')}
                        description={t('dashboard.actions.train.description')}
                        buttonLabel={t('dashboard.actions.train.button')}
                        onClick={() => router.visit('/automations')}
                    />
                    <ActionCard
                        icon={<PenLine className="h-5 w-5 text-gray-500" />}
                        title={t('dashboard.actions.scratch.title')}
                        description={t('dashboard.actions.scratch.description')}
                        buttonLabel={t('dashboard.actions.scratch.button')}
                        onClick={() => router.visit('/slideshow-editor/create')}
                    />
                </div>

                {/* Projects grid */}
                {projects.data.length > 0 ? (
                    <>
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                            {t('dashboard.recentLabel')}
                        </p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {projects.data.map((project) => (
                                <CarouselCard key={project.id} project={project} />
                            ))}
                        </div>
                        <Pagination current={projects.current_page} last={projects.last_page} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-28 gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                            <Sparkles className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">{t('dashboard.empty')}</p>
                        <button type="button" onClick={() => router.visit('/carousel/create')}
                            className="mt-2 rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
                            {t('dashboard.actions.createAi.button')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
