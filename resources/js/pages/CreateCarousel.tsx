import React from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import CarouselWizardController from '@/actions/App/Http/Controllers/CarouselWizardController';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    ExternalLink,
    Grid2X2,
    Image,
    ImageOff,
    Layers,
    LayoutTemplate,
    Loader2,
    Shuffle,
    Upload,
    X,
} from 'lucide-react';
import type { ImageMode } from '@/components/SlideEditor/hooks/useAiGeneration';
import { FORMATS } from '@/components/SlideEditor/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// ─── Templates & Archetypes ───────────────────────────────────────────────────

const TEMPLATE_IDS = [
    'editorial-press',
    'noir-manifesto',
    'dark-cards',
    'pop-magazine',
    'twitter-x',
    'acid-brutalist',
    'documentary',
    'ticket',
] as const;

/** Template pre-selected in the wizard when the workspace has no saved choice. */
const DEFAULT_TEMPLATE_ID: TemplateId = 'editorial-press';

/**
 * Read an image file and return a downscaled PNG data URL (max 1080px wide, the
 * slide width). Downscaling keeps the CTA image small enough to ride in
 * sessionStorage across the wizard→editor redirect.
 */
function fileToScaledDataUrl(file: File, maxWidth = 1080): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxWidth / img.naturalWidth);
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('canvas unavailable'));
                return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('could not load image'));
        };
        img.src = url;
    });
}

const ARCHETYPE_IDS = [
    'disruptor-social',
    'poder-oculto',
    'paradoxo-social',
    'profecia-provocativa',
    'estrategia-inusitada',
    'autoridade-cientifica',
] as const;

type TemplateId  = typeof TEMPLATE_IDS[number];
type ArchetypeId = typeof ARCHETYPE_IDS[number];
type UrlType     = 'youtube' | 'instagram' | 'blog';

interface WorkspaceConfig {
    template?: TemplateId;
    archetype?: ArchetypeId;
}

interface SavedTemplate {
    id: number;
    title: string;
    format: 'post' | 'stories';
    thumbnail: string | null;
}

interface PageProps extends Record<string, unknown> {
    workspaceConfig: WorkspaceConfig | null;
    savedTemplates: SavedTemplate[];
    auth: { credits: number };
    initialTopic: string | null;
    initialTitle: string | null;
}

// ─── SelectionCard ────────────────────────────────────────────────────────────

function SelectionCard({
    name, description, selected, onClick,
}: { name: string; description: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative w-full text-left rounded-xl border-2 p-4 transition-all ${
                selected
                    ? 'border-[#FFE156] bg-[#FFE156]/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
            {selected && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE156]">
                    <Check className="h-3 w-3 text-white" />
                </span>
            )}
            <p className={`text-sm font-semibold ${selected ? 'text-[#1A1A1A]' : 'text-gray-800'}`}>{name}</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
        </button>
    );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────

interface ImportModalProps {
    onClose: () => void;
    onImport: (title: string, topic: string) => void;
}

function ImportModal({ onClose, onImport }: ImportModalProps) {
    const { t } = useTranslation();
    const [urlType, setUrlType]   = useState<UrlType>('youtube');
    const [url, setUrl]           = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');

    const urlTypePlaceholders: Record<UrlType, string> = {
        youtube:   'https://youtube.com/watch?v=...',
        instagram: 'https://instagram.com/p/...',
        blog:      'https://exemplo.com/artigo...',
    };

    async function handleExtract() {
        if (!url.trim()) return;
        setLoading(true);
        setError('');
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        try {
            const res = await fetch(CarouselWizardController.extractUrl().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ url, type: urlType }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error ?? t('createCarousel.import.extractError'));
            } else {
                onImport(data.title ?? '', data.topic ?? data.description ?? '');
                onClose();
            }
        } catch {
            setError(t('createCarousel.import.networkError'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t('createCarousel.import.subtitle')}</p>
                        <h2 className="text-base font-bold text-gray-800">{t('createCarousel.import.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* URL type tabs */}
                    <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
                        {(['youtube', 'instagram', 'blog'] as UrlType[]).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => { setUrlType(type); setError(''); }}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                                    urlType === type ? 'bg-[#FFE156] text-[#1A1A1A]' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {type === 'blog' ? 'Blog / Artigo' : type === 'instagram' ? 'Instagram' : 'YouTube'}
                            </button>
                        ))}
                    </div>

                    {/* URL input */}
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-[#FFE156] focus-within:ring-1 focus-within:ring-[#FFE156]">
                        <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); setError(''); }}
                            placeholder={urlTypePlaceholders[urlType]}
                            className="flex-1 text-sm focus:outline-none"
                        />
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <button
                        type="button"
                        onClick={handleExtract}
                        disabled={!url.trim() || loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFE156] py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#E6CB4D] disabled:opacity-50 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t('createCarousel.import.extractBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step, labels }: { step: number; labels: string[] }) {
    return (
        <div className="flex items-center gap-0">
            {labels.map((label, i) => {
                const idx = i + 1;
                const done    = idx < step;
                const current = idx === step;
                return (
                    <div key={label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                done    ? 'bg-[#FFE156] text-[#1A1A1A]' :
                                current ? 'bg-[#FFE156] text-[#1A1A1A] ring-4 ring-[#FFE156]/20' :
                                          'bg-gray-100 text-gray-400'
                            }`}>
                                {done ? <Check className="h-3.5 w-3.5" /> : idx}
                            </div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${current ? 'text-[#1A1A1A]' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                                {label}
                            </span>
                        </div>
                        {i < labels.length - 1 && (
                            <div className={`h-0.5 w-16 mx-2 mb-4 rounded transition-colors ${done ? 'bg-[#FFE156]' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/** Field limits mirrored from the backend validation in CarouselWizardController@store. */
const TITLE_MAX = 255;
const TOPIC_MAX = 2000;

export default function CreateCarousel() {
    const { t } = useTranslation();
    const { workspaceConfig, savedTemplates, auth, initialTopic, initialTitle } = usePage<PageProps>().props;

    const [step, setStep]                   = useState(1);
    const [title, setTitle]                 = useState(initialTitle ?? '');
    const [topic, setTopic]                 = useState(initialTopic ?? '');
    const [customPrompt, setCustomPrompt]   = useState('');
    const [template, setTemplate]           = useState<TemplateId | ''>(workspaceConfig?.template ?? DEFAULT_TEMPLATE_ID);
    const [archetype, setArchetype]         = useState<ArchetypeId | ''>(workspaceConfig?.archetype ?? '');
    const [slideCount, setSlideCount]       = useState(3);
    // Twitter/X defaults to grid (its tweet copy can't sit over a full-bleed photo);
    // every other template starts on the varied hero+layouts mode.
    const [imageMode, setImageMode] = useState<ImageMode>(
        (workspaceConfig?.template ?? DEFAULT_TEMPLATE_ID) === 'twitter-x' ? 'grid' : 'mixed',
    );
    const [imageStyle, setImageStyle]       = useState('');
    const [ctaImage, setCtaImage]           = useState<string | null>(null);
    const [saveConfig, setSaveConfig]       = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [format, setFormat]               = useState<'post' | 'stories'>('post');
    const [language, setLanguage]           = useState('Portuguese (Brazil)');
    const [importOpen, setImportOpen]       = useState(false);
    const [submitting, setSubmitting]       = useState(false);

    const selectedTemplateName  = template  ? t(`createCarousel.templates.${template}.name`)  : null;
    const selectedArchetypeName = archetype ? t(`createCarousel.archetypes.${archetype}.name`) : null;

    const stepLabels = [
        t('createCarousel.steps.input'),
        t('createCarousel.steps.config'),
        t('createCarousel.steps.generate'),
    ];

    function canAdvance() {
        if (step === 1) {
            return (
                title.trim().length > 0 &&
                title.length <= TITLE_MAX &&
                topic.trim().length > 0 &&
                topic.length <= TOPIC_MAX
            );
        }
        if (step === 2) return template !== '';
        return true;
    }

    function handleNext() {
        if (canAdvance() && step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    }

    function handleImport(importedTitle: string, importedTopic: string) {
        if (importedTitle) setTitle(importedTitle);
        if (importedTopic) setTopic(importedTopic);
    }

    function applySavedTemplate(id: number) {
        if (submitting) return;
        setSubmitting(true);
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        router.post(`/slide-templates/${id}/use`, {}, {
            headers: { 'X-CSRF-TOKEN': csrfToken },
            onError: (errors) => {
                setSubmitting(false);
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    toast.error(firstError);
                }
            },
        });
    }

    function handleSubmit() {
        if (submitting) return;
        // Soft paywall: browsing is free, generating needs the lifetime offer
        // (or an active subscription).
        if (!auth.premium_access) {
            toast.error(t('createCarousel.premiumRequired'));
            router.visit('/settings/billing');
            return;
        }
        setSubmitting(true);
        // The CTA image (if any) rides to the editor in sessionStorage — it survives
        // the same-tab Inertia redirect and becomes the final slide during generation.
        try {
            if (ctaImage) {
                sessionStorage.setItem('wizardCtaImage', ctaImage);
            } else {
                sessionStorage.removeItem('wizardCtaImage');
            }
        } catch {
            setSubmitting(false);
            toast.error(t('createCarousel.step3.ctaImageTooLarge'));
            return;
        }
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        router.post(
            CarouselWizardController.store().url,
            { title, topic, template, archetype, slide_count: slideCount, save_config: saveConfig, save_as_template: saveAsTemplate, format, custom_prompt: customPrompt, image_mode: imageMode, image_style: imageStyle, language },
            {
                headers: { 'X-CSRF-TOKEN': csrfToken },
                onError: (errors) => {
                    setSubmitting(false);
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        toast.error(firstError);
                    }
                },
            },
        );
    }

    return (
        <>
            <Head title={t('createCarousel.pageTitle')} />
            <div className="min-h-screen bg-gray-50">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.visit('/dashboard'))}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('createCarousel.back')}
                            </button>
                            <div className="h-4 w-px bg-gray-200" />
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                    {t('createCarousel.stepIndicator', { current: step, total: 3 })}
                                </p>
                                <h1 className="text-lg font-bold text-gray-900">{t('createCarousel.pageTitle')}</h1>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <Stepper step={step} labels={stepLabels} />
                        </div>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

                    {/* ── Step 1: INPUT ─────────────────────────────────── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('createCarousel.step1.title')}</h2>
                                <p className="text-sm text-gray-500 mt-1">{t('createCarousel.step1.subtitle')}</p>
                            </div>

                            {/* Start from a saved template */}
                            {savedTemplates.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        {t('createCarousel.step3.savedTemplatesTitle')}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                                        {savedTemplates.map((tpl) => (
                                            <button
                                                key={tpl.id}
                                                type="button"
                                                onClick={() => applySavedTemplate(tpl.id)}
                                                disabled={submitting}
                                                title={`${tpl.title} — ${t('createCarousel.step3.useTemplate')}`}
                                                className="group flex flex-col gap-1.5 rounded-xl border border-gray-200 p-1.5 text-left hover:border-[#FFE156] disabled:opacity-60 transition-colors"
                                            >
                                                <div
                                                    className="relative w-full overflow-hidden rounded-lg bg-gray-100"
                                                    style={{ aspectRatio: tpl.format === 'stories' ? '9 / 16' : '4 / 5' }}
                                                >
                                                    {tpl.thumbnail ? (
                                                        <img src={tpl.thumbnail} alt={tpl.title} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                                                            <LayoutTemplate className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="truncate px-1 text-[11px] font-medium text-gray-700">{tpl.title}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                                {/* Title */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t('createCarousel.step1.titleLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={TITLE_MAX}
                                        placeholder={t('createCarousel.step1.titlePlaceholder')}
                                        className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFE156] focus:border-transparent"
                                    />
                                </div>

                                {/* Topic / Description */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t('createCarousel.step1.topicLabel')}
                                    </label>
                                    <textarea
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        rows={5}
                                        maxLength={TOPIC_MAX}
                                        placeholder={t('createCarousel.step1.topicPlaceholder')}
                                        className={`rounded-lg border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE156] focus:border-transparent ${topic.length > TOPIC_MAX ? 'border-red-400' : 'border-gray-200'}`}
                                    />
                                    <span className={`self-end text-xs ${topic.length > TOPIC_MAX ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                        {topic.length}/{TOPIC_MAX}
                                    </span>
                                </div>

                                {/* TODO: Import from a URL — feature to be implemented later */}
                                {/* Import divider */}
                                {/* <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <span className="text-xs text-gray-400">{t('createCarousel.step1.or')}</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div> */}

                                {/* Import URL button */}
                                {/* <button
                                    type="button"
                                    onClick={() => setImportOpen(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-[#FFE156] hover:text-[#1A1A1A] transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    {t('createCarousel.step1.importBtn')}
                                </button> */}
                            </div>

                            {/* Format */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('createCarousel.step1.formatLabel')}</p>
                                <div className="flex gap-3">
                                    {(['post', 'stories'] as const).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFormat(f)}
                                            className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                                                format === f ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-flex items-center justify-center border-2 rounded-sm shrink-0 ${format === f ? 'border-[#FFE156]' : 'border-gray-400'}`}
                                                style={{ width: f === 'post' ? 20 : 14, height: f === 'post' ? 20 : 24 }} />
                                            <div className="text-left">
                                                <p className={`text-sm font-semibold ${format === f ? 'text-[#1A1A1A]' : 'text-gray-700'}`}>
                                                    {f === 'post' ? 'Post' : 'Stories'}
                                                </p>
                                                <p className="text-xs text-gray-400">{FORMATS[f as keyof typeof FORMATS].ratio} · {FORMATS[f as keyof typeof FORMATS].w}×{FORMATS[f as keyof typeof FORMATS].h}</p>
                                            </div>
                                            {format === f && <Check className="h-4 w-4 text-[#1A1A1A] ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: CONFIG ────────────────────────────────── */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Templates */}
                                <div>
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('createCarousel.step2.templateTitle')}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {TEMPLATE_IDS.map((id) => (
                                            <SelectionCard
                                                key={id}
                                                name={t(`createCarousel.templates.${id}.name`)}
                                                description={t(`createCarousel.templates.${id}.description`)}
                                                selected={template === id}
                                                onClick={() => {
                                                    setTemplate(id);
                                                    // The Twitter/X template is a tweet with a media card, and its
                                                    // dark-on-white copy is unreadable over a full-bleed photo — so
                                                    // default its images to the grid (card) layout.
                                                    if (id === 'twitter-x') setImageMode('grid');
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Archetypes */}
                                <div>
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('createCarousel.step2.archetypeTitle')}</h2>
                                    <p className="text-xs text-gray-400 mb-3">{t('createCarousel.step2.archetypeSubtitle')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ARCHETYPE_IDS.map((id) => (
                                            <SelectionCard
                                                key={id}
                                                name={t(`createCarousel.archetypes.${id}.name`)}
                                                description={t(`createCarousel.archetypes.${id}.description`)}
                                                selected={archetype === id}
                                                onClick={() => setArchetype(id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Preview panel — desktop only (hidden on mobile) */}
                            <div className="hidden lg:block lg:col-span-1">
                                <div className="sticky top-6">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('createCarousel.step2.preview')}</p>
                                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                                        <div className="aspect-square bg-gray-900 flex items-center justify-center p-6">
                                            {template ? (
                                                <div className="text-center space-y-2">
                                                    <p className="text-white text-xs font-bold uppercase tracking-widest opacity-60">{selectedTemplateName}</p>
                                                    <p className="text-white/40 text-[10px] leading-relaxed">{t(`createCarousel.templates.${template}.description`)}</p>
                                                </div>
                                            ) : (
                                                <p className="text-white/30 text-xs text-center">{t('createCarousel.step2.previewEmpty')}</p>
                                            )}
                                        </div>
                                        {archetype && (
                                            <div className="px-4 py-3 border-t border-gray-100">
                                                <p className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-wider">{t('createCarousel.step2.hook')}</p>
                                                <p className="text-xs font-semibold text-gray-800 mt-0.5">{selectedArchetypeName}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{t(`createCarousel.archetypes.${archetype}.description`)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: CONFIRMAR ─────────────────────────────── */}
                    {step === 3 && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('createCarousel.step3.title')}</h2>
                                <p className="text-sm text-gray-500 mt-1">{t('createCarousel.step3.subtitle')}</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                                <div className="px-5 py-4">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('createCarousel.step3.summaryTitle')}</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{topic}</p>
                                </div>
                                <div className="px-5 py-4 flex gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('createCarousel.step3.template')}</p>
                                        <p className="text-sm font-semibold text-gray-800 mt-1">{selectedTemplateName ?? '—'}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('createCarousel.step3.archetype')}</p>
                                        <p className="text-sm font-semibold text-gray-800 mt-1">{selectedArchetypeName ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('createCarousel.step3.format')}</p>
                                        <p className="text-sm font-semibold text-gray-800 mt-1 capitalize">{format}</p>
                                    </div>
                                </div>
                                <div className="px-5 py-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('createCarousel.step3.slideCountLabel')}</p>
                                        <span className="text-sm font-bold text-[#1A1A1A] w-6 text-center">{slideCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={2}
                                        max={10}
                                        value={slideCount}
                                        onChange={(e) => setSlideCount(Number(e.target.value))}
                                        className="w-full accent-[#FFE156]"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                                        <span>2</span>
                                        <span>10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Custom AI prompt */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('createCarousel.step3.customPromptLabel')}
                                </label>
                                <p className="text-xs text-gray-400">{t('createCarousel.step3.customPromptHint')}</p>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    rows={3}
                                    placeholder={t('createCarousel.step3.customPromptPlaceholder')}
                                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE156] focus:border-transparent"
                                />
                            </div>

                            {/* Image Mode Selector */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('createCarousel.step3.imageModeLabel')}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { id: 'none'       as ImageMode, label: t('slideEditor.ai.imageMode.none'),       Icon: ImageOff  },
                                        { id: 'background' as ImageMode, label: t('slideEditor.ai.imageMode.background'), Icon: Image     },
                                        { id: 'grid'       as ImageMode, label: t('slideEditor.ai.imageMode.grid'),       Icon: Grid2X2   },
                                        { id: 'alternate'  as ImageMode, label: t('slideEditor.ai.imageMode.alternate'),  Icon: Layers    },
                                        { id: 'mixed'      as ImageMode, label: t('slideEditor.ai.imageMode.mixed'),      Icon: Shuffle   },
                                    ] as { id: ImageMode; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setImageMode(id)}
                                            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                                                imageMode === id
                                                    ? 'border-[#FFE156] bg-[#FFE156]/5 text-[#1A1A1A]'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Image Style Refinement */}
                            {imageMode !== 'none' && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('createCarousel.step3.imageStyleLabel')}</p>
                                    <textarea
                                        value={imageStyle}
                                        onChange={(e) => setImageStyle(e.target.value)}
                                        placeholder={t('createCarousel.step3.imageStylePlaceholder')}
                                        rows={2}
                                        className="w-full resize-none rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors focus:border-[#FFE156] focus:outline-none focus:ring-2 focus:ring-[#FFE156]/20"
                                    />
                                </div>
                            )}

                            {/* CTA image (optional): becomes the final slide, AI skips the CTA */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('createCarousel.step3.ctaImageLabel')}</p>
                                {ctaImage ? (
                                    <div className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-2">
                                        <img src={ctaImage} alt="" className="h-16 w-16 rounded object-cover" />
                                        <p className="flex-1 text-xs text-gray-500">{t('createCarousel.step3.ctaImageSet')}</p>
                                        <button
                                            type="button"
                                            onClick={() => setCtaImage(null)}
                                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                            aria-label={t('createCarousel.step3.ctaImageRemove')}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300">
                                        <Upload className="h-4 w-4 shrink-0" />
                                        {t('createCarousel.step3.ctaImageUpload')}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = '';
                                                if (!file) return;
                                                try {
                                                    setCtaImage(await fileToScaledDataUrl(file));
                                                } catch {
                                                    toast.error(t('createCarousel.step3.ctaImageError'));
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                                <p className="mt-1.5 text-xs text-gray-400">{t('createCarousel.step3.ctaImageHint')}</p>
                            </div>

                            {/* Language Selector */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('createCarousel.step3.languageLabel')}</p>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors focus:border-[#FFE156] focus:outline-none focus:ring-2 focus:ring-[#FFE156]/20"
                                >
                                    {([
                                        { id: 'Portuguese (Brazil)', label: 'Português (BR)' },
                                        { id: 'English',             label: 'English' },
                                        { id: 'Spanish',             label: 'Español' },
                                        { id: 'French',              label: 'Français' },
                                        { id: 'German',              label: 'Deutsch' },
                                        { id: 'Italian',             label: 'Italiano' },
                                    ] as { id: string; label: string }[]).map(({ id, label }) => (
                                        <option key={id} value={id}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Save as workspace default */}
                            <button
                                type="button"
                                onClick={() => setSaveConfig((v) => !v)}
                                className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                    saveConfig ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                    saveConfig ? 'border-[#FFE156] bg-[#FFE156]' : 'border-gray-300'
                                }`}>
                                    {saveConfig && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{t('createCarousel.step3.saveConfigLabel')}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{t('createCarousel.step3.saveConfigDesc')}</p>
                                </div>
                            </button>

                            {/* Save generated result as a reusable template */}
                            <button
                                type="button"
                                onClick={() => setSaveAsTemplate((v) => !v)}
                                className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                    saveAsTemplate ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                    saveAsTemplate ? 'border-[#FFE156] bg-[#FFE156]' : 'border-gray-300'
                                }`}>
                                    {saveAsTemplate && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{t('createCarousel.step3.saveAsTemplateLabel')}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{t('createCarousel.step3.saveAsTemplateDesc')}</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ── Navigation ──────────────────────────────────────── */}
                    <div className="mt-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.visit('/dashboard'))}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('createCarousel.back')}
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canAdvance()}
                                className="flex items-center gap-2 rounded-lg bg-[#FFE156] px-6 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#E6CB4D] disabled:opacity-40 transition-colors"
                            >
                                {t('createCarousel.next')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 rounded-lg bg-[#FFE156] px-6 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#E6CB4D] disabled:opacity-50 transition-colors"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('createCarousel.step3.generateBtn')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {importOpen && (
                <ImportModal onClose={() => setImportOpen(false)} onImport={handleImport} />
            )}
        </>
    );
}
