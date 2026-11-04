import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    GalleryHorizontal,
    Image as ImageIcon,
    Languages,
    Layers,
    Lightbulb,
    Link2,
    Loader2,
    Palette,
    PenLine,
    Smartphone,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselWizardController from '@/actions/App/Http/Controllers/CarouselWizardController';
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS } from '@/lib/carousel-templates';

type Format = 'post' | 'stories';
type ImageMode = 'mixed' | 'background' | 'grid' | 'alternate' | 'none';
type Language = 'Portuguese (Brazil)' | 'English';
type ChipId = 'format' | 'slideCount' | 'template' | 'imageMode' | 'language';

interface Idea {
    title: string;
    angle: string;
}

interface IdeasResponse {
    ideas?: Idea[];
    error?: boolean;
}

interface ExtractResponse {
    title?: string;
    topic?: string;
    description?: string;
    error?: string;
}

const FORMAT_OPTIONS: Format[] = ['post', 'stories'];
const SLIDE_COUNT_OPTIONS = [3, 5, 7, 10];
const IMAGE_MODE_OPTIONS: ImageMode[] = ['mixed', 'background', 'grid', 'alternate', 'none'];
const LANGUAGE_OPTIONS: Language[] = ['Portuguese (Brazil)', 'English'];

const languageLabel = (value: Language) => (value === 'English' ? 'English' : 'Português');
const browserLanguage = (lang: string | undefined): Language =>
    lang?.startsWith('en') ? 'English' : 'Portuguese (Brazil)';

const toolbarButton =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#555550] transition-colors hover:bg-[#F4F3EF]';

function OptionChip<T extends string | number>({
    id,
    icon: Icon,
    label,
    options,
    value,
    optionLabel,
    open,
    onToggle,
    onSelect,
}: {
    id: ChipId;
    icon: LucideIcon;
    label: string;
    options: readonly T[];
    value: T;
    optionLabel: (option: T) => string;
    open: boolean;
    onToggle: (id: ChipId) => void;
    onSelect: (option: T) => void;
}) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => onToggle(id)}
                aria-expanded={open}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F3EF] px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:bg-[#ECEAE4]"
            >
                <Icon className="size-3.5" />
                <span>{label}</span>
            </button>
            {open && (
                <div
                    role="listbox"
                    className="absolute left-0 z-30 mt-2 max-h-72 min-w-44 overflow-y-auto rounded-2xl border border-[#E8E7E2] bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.10)]"
                >
                    {options.map((option) => (
                        <button
                            key={String(option)}
                            type="button"
                            role="option"
                            aria-selected={option === value}
                            onClick={() => onSelect(option)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap text-[#1A1A1A] hover:bg-[#F4F3EF]"
                        >
                            <span>{optionLabel(option)}</span>
                            {option === value && <Check className="size-4" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PostComposer({ defaultTemplate }: { defaultTemplate?: string | null }) {
    const { t, i18n } = useTranslation();
    const initialTemplate: string =
        defaultTemplate && (TEMPLATE_IDS as readonly string[]).includes(defaultTemplate)
            ? defaultTemplate
            : DEFAULT_TEMPLATE_ID;

    const [text, setText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showInspiration, setShowInspiration] = useState(false);
    const [ideas, setIdeas] = useState<Idea[] | null>(null);
    const [ideasLoading, setIdeasLoading] = useState(false);
    const ideasLoaded = useRef(false);

    const [format, setFormat] = useState<Format>('post');
    const [slideCount, setSlideCount] = useState(5);
    const [template, setTemplate] = useState<string>(initialTemplate);
    const [imageMode, setImageMode] = useState<ImageMode>(initialTemplate === 'twitter-x' ? 'grid' : 'mixed');
    const [imageModeTouched, setImageModeTouched] = useState(false);
    // null = follow the UI language (i18n switches to the browser language after hydration).
    const [pickedLanguage, setPickedLanguage] = useState<Language | null>(null);
    const language = pickedLanguage ?? browserLanguage(i18n.language);

    const [popoverOpen, setPopoverOpen] = useState<ChipId | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const chipsRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!popoverOpen) {
            return;
        }

        const handleMouseDown = (event: MouseEvent) => {
            if (chipsRef.current && !chipsRef.current.contains(event.target as Node)) {
                setPopoverOpen(null);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPopoverOpen(null);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [popoverOpen]);

    const fetchIdeas = async () => {
        if (ideasLoaded.current || ideasLoading) {
            return;
        }

        setIdeasLoading(true);

        try {
            const lang = browserLanguage(i18n.language);
            const response = await fetch(`/carousel/ideas?lang=${encodeURIComponent(lang)}`, {
                headers: { Accept: 'application/json' },
            });
            const data = (await response.json()) as IdeasResponse;
            setIdeas(response.ok && !data.error ? (data.ideas ?? []) : []);
        } catch {
            setIdeas([]);
        } finally {
            setIdeasLoading(false);
            ideasLoaded.current = true;
        }
    };

    const toggleInspiration = () => {
        setShowInspiration((prev) => !prev);
        void fetchIdeas();
    };

    const togglePopover = (chip: ChipId) => {
        setPopoverOpen((current) => (current === chip ? null : chip));
    };

    const hostname = (url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    };

    const clearLink = () => {
        setLinkUrl('');
        setShowLinkInput(false);
    };

    const handleSubmit = async () => {
        const link = linkUrl.trim();

        if (submitting || (!text.trim() && !link)) {
            return;
        }

        setSubmitting(true);
        setError(null);

        let topic = text.trim();
        let title = '';

        if (link) {
            let type = 'blog';

            try {
                const host = new URL(link).hostname;

                if (host.includes('youtube.com') || host.includes('youtu.be')) {
                    type = 'youtube';
                } else if (host.includes('instagram.com')) {
                    type = 'instagram';
                }
            } catch {
                // An invalid URL is rejected by the server below.
            }

            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

            try {
                const response = await fetch(CarouselWizardController.extractUrl().url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf,
                    },
                    body: JSON.stringify({ url: link, type }),
                });
                const data = (await response.json().catch(() => null)) as ExtractResponse | null;

                if (!response.ok || !data || data.error) {
                    setError(data?.error ?? t('createCarousel.import.extractError'));
                    setSubmitting(false);

                    return;
                }

                title = data.title ?? '';
                const extracted = data.topic ?? data.description ?? '';
                topic = topic ? `${topic}\n\n${extracted}` : extracted;
            } catch {
                setError(t('createCarousel.import.networkError'));
                setSubmitting(false);

                return;
            }
        } else if (topic.length <= 90 && !topic.includes('\n')) {
            title = topic;
        }

        const params: Record<string, string> = {
            topic,
            format,
            slide_count: String(slideCount),
            template,
            image_mode: imageMode,
            language,
        };

        if (title) {
            params.title = title;
        }

        router.visit(`/carousel/create?${new URLSearchParams(params).toString()}`, {
            onFinish: () => setSubmitting(false),
        });
    };

    const submitDisabled = submitting || (!text.trim() && !linkUrl.trim());

    return (
        <div className="mx-auto max-w-[980px] px-6 pt-14 pb-10 sm:px-10">
            <h1 className="text-center font-display text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold tracking-tight text-[#1A1A1A]">
                {t('dashboard.composer.title')}
            </h1>
            <p className="mt-2 text-center text-[15px] text-[#6B6B66]">{t('dashboard.composer.subtitle')}</p>

            <div className="mt-8 rounded-[28px] bg-white p-5 shadow-[0_2px_6px_rgba(17,17,17,0.04),0_12px_32px_rgba(17,17,17,0.06)] sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowLinkInput((prev) => !prev)}
                        aria-expanded={showLinkInput}
                        className={toolbarButton}
                    >
                        <Link2 className="size-4" />
                        {t('dashboard.composer.link')}
                    </button>
                    <button
                        type="button"
                        onClick={toggleInspiration}
                        aria-expanded={showInspiration}
                        className={toolbarButton}
                    >
                        <Lightbulb className="size-4" />
                        {t('dashboard.composer.inspiration')}
                    </button>
                    {linkUrl && !showLinkInput && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A2023]/20 py-1 pr-1.5 pl-3 text-[13px] font-medium text-[#1A1A1A]">
                            <Link2 className="size-3.5" />
                            {hostname(linkUrl)}
                            <button
                                type="button"
                                onClick={() => setLinkUrl('')}
                                aria-label={t('dashboard.composer.removeLink')}
                                className="flex size-5 items-center justify-center rounded-full hover:bg-black/10"
                            >
                                <X className="size-3.5" />
                            </button>
                        </span>
                    )}
                </div>

                {showLinkInput && (
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="url"
                            value={linkUrl}
                            autoFocus
                            onChange={(event) => setLinkUrl(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    setShowLinkInput(false);
                                }
                            }}
                            placeholder={t('dashboard.composer.linkPlaceholder')}
                            className="min-w-0 flex-1 rounded-xl border border-[#E8E7E2] px-4 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder-[#9A9A94] focus:border-[#CFCEC8]"
                        />
                        <button
                            type="button"
                            onClick={clearLink}
                            aria-label={t('dashboard.composer.removeLink')}
                            className="flex size-9 items-center justify-center rounded-full text-[#6B6B66] hover:bg-[#F4F3EF] hover:text-[#1A1A1A]"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                {showInspiration && (
                    <div className="mt-3">
                        {ideasLoading || ideas === null ? (
                            <div className="flex flex-wrap gap-2">
                                {[0, 1, 2].map((index) => (
                                    <div key={index} className="h-8 w-40 animate-pulse rounded-full bg-[#F4F3EF]" />
                                ))}
                            </div>
                        ) : ideas.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {ideas.map((idea) => (
                                    <button
                                        key={idea.title}
                                        type="button"
                                        onClick={() => {
                                            setText(idea.title);
                                            setShowInspiration(false);
                                            textareaRef.current?.focus();
                                        }}
                                        className="rounded-full border border-[#E8E7E2] px-3 py-1.5 text-left text-sm text-[#1A1A1A] transition-colors hover:border-[#1A1A1A]"
                                    >
                                        {idea.title}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#888880]">{t('dashboard.composer.inspirationEmpty')}</p>
                        )}
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            void handleSubmit();
                        }
                    }}
                    onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text').trim();

                        if (/^https?:\/\/\S+$/.test(pasted)) {
                            event.preventDefault();
                            setLinkUrl(pasted);
                            setShowLinkInput(false);
                        }
                    }}
                    placeholder={t('dashboard.composer.placeholder')}
                    className="mt-3 min-h-[96px] w-full resize-none border-0 bg-transparent px-3 py-2 text-[15px] text-[#1A1A1A] shadow-none outline-none placeholder-[#9A9A94] focus:ring-0 focus:outline-none"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div ref={chipsRef} className="flex flex-wrap gap-2">
                        <OptionChip
                            id="format"
                            icon={Layers}
                            label={t(`dashboard.composer.format.${format}`)}
                            options={FORMAT_OPTIONS}
                            value={format}
                            optionLabel={(option) => t(`dashboard.composer.format.${option}`)}
                            open={popoverOpen === 'format'}
                            onToggle={togglePopover}
                            onSelect={(option) => {
                                setFormat(option);
                                setPopoverOpen(null);
                            }}
                        />
                        <OptionChip
                            id="slideCount"
                            icon={GalleryHorizontal}
                            label={t('dashboard.composer.slides', { count: slideCount })}
                            options={SLIDE_COUNT_OPTIONS}
                            value={slideCount}
                            optionLabel={(option) => t('dashboard.composer.slides', { count: option })}
                            open={popoverOpen === 'slideCount'}
                            onToggle={togglePopover}
                            onSelect={(option) => {
                                setSlideCount(option);
                                setPopoverOpen(null);
                            }}
                        />
                        <OptionChip
                            id="template"
                            icon={Palette}
                            label={t(`createCarousel.templates.${template}.name`)}
                            options={TEMPLATE_IDS as readonly string[]}
                            value={template}
                            optionLabel={(option) => t(`createCarousel.templates.${option}.name`)}
                            open={popoverOpen === 'template'}
                            onToggle={togglePopover}
                            onSelect={(option) => {
                                setTemplate(option);

                                if (!imageModeTouched) {
                                    setImageMode(option === 'twitter-x' ? 'grid' : 'mixed');
                                }

                                setPopoverOpen(null);
                            }}
                        />
                        <OptionChip
                            id="imageMode"
                            icon={ImageIcon}
                            label={t(`slideEditor.ai.imageMode.${imageMode}`)}
                            options={IMAGE_MODE_OPTIONS}
                            value={imageMode}
                            optionLabel={(option) => t(`slideEditor.ai.imageMode.${option}`)}
                            open={popoverOpen === 'imageMode'}
                            onToggle={togglePopover}
                            onSelect={(option) => {
                                setImageMode(option);
                                setImageModeTouched(true);
                                setPopoverOpen(null);
                            }}
                        />
                        <OptionChip
                            id="language"
                            icon={Languages}
                            label={languageLabel(language)}
                            options={LANGUAGE_OPTIONS}
                            value={language}
                            optionLabel={languageLabel}
                            open={popoverOpen === 'language'}
                            onToggle={togglePopover}
                            onSelect={(option) => {
                                setPickedLanguage(option);
                                setPopoverOpen(null);
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitDisabled}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] py-2.5 pr-6 pl-2.5 text-sm font-bold text-white transition-colors hover:bg-[#333] disabled:opacity-40 sm:w-auto"
                    >
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#1A2023] text-white">
                            {submitting ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <ArrowRight className="size-4" />
                            )}
                        </span>
                        {t('dashboard.composer.continue')}
                    </button>
                </div>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-[#6B6B66]">
                <Link
                    href="/slideshow-editor/create"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#1A1A1A]"
                >
                    <PenLine className="size-3.5" />
                    {t('dashboard.actions.scratch.button')}
                </Link>
                <Link
                    href="/app-screenshots/create"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#1A1A1A]"
                >
                    <Smartphone className="size-3.5" />
                    {t('dashboard.actions.appScreenshots.button')}
                </Link>
            </div>
        </div>
    );
}
