import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Globe,
    GripVertical,
    Loader2,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppScreenshotController from '@/actions/App/Http/Controllers/AppScreenshotController';
import type { ScreenshotLayout } from '@/components/SlideEditor/appStore';
import {
    DEVICE_FRAMES,
    MAX_SCREENSHOTS,
    SCREENSHOT_THEMES,
    STORE_LOCALES,
    exportTargetsFor,
    resolveTheme,
} from '@/components/SlideEditor/appStore';
import { SCREENSHOT_UPLOADS_KEY } from '@/components/SlideEditor/hooks/useScreenshotGeneration';
import type { StoreFormat } from '@/components/SlideEditor/types';
import { FORMATS, storeOf } from '@/components/SlideEditor/types';

interface PageProps extends Record<string, unknown> {
    brand: { color: string | null; accent: string | null; logoUrl: string | null } | null;
    appName: string | null;
    auth: { premium_access: boolean };
}

interface Shot {
    src: string;
    label: string;
}

const STORE_FORMAT_IDS: StoreFormat[] = ['appstore', 'appstore_ipad', 'playstore'];

const LANGUAGES = [
    { id: 'Portuguese (Brazil)', label: 'Português (BR)' },
    { id: 'English', label: 'English' },
    { id: 'Spanish', label: 'Español' },
    { id: 'French', label: 'Français' },
    { id: 'German', label: 'Deutsch' },
];

/**
 * Read an image file and return a downscaled JPEG data URL. The device shots
 * ride to the editor through sessionStorage, so they are scaled to roughly the
 * pixel size the exported screenshot needs and no more.
 */
function fileToScaledDataUrl(file: File, maxWidth: number, quality: number): Promise<string> {
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
            resolve(canvas.toDataURL('image/jpeg', quality));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('could not load image'));
        };

        img.src = url;
    });
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
    return (
        <div className="flex items-center gap-2">
            {labels.map((label, index) => {
                const number = index + 1;
                const done = step > number;

                return (
                    <div key={label} className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                            step === number ? 'bg-[#FFE156] text-[#1A1A1A]' : done ? 'bg-[#1A1A1A] text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                            {done ? <Check className="h-3 w-3" /> : number}
                        </span>
                        <span className={`text-xs font-semibold ${step === number ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                        {index < labels.length - 1 && <span className="h-px w-6 bg-gray-200" />}
                    </div>
                );
            })}
        </div>
    );
}

export default function CreateAppScreenshots() {
    const { brand, appName: initialAppName, auth } = usePage<PageProps>().props;
    const { t } = useTranslation();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [submitting, setSubmitting] = useState(false);

    const [appName, setAppName] = useState(initialAppName ?? '');
    const [pitch, setPitch] = useState('');
    const [format, setFormat] = useState<StoreFormat>('appstore');
    const [shots, setShots] = useState<Shot[]>([]);
    const [theme, setTheme] = useState('midnight');
    const [deviceFrame, setDeviceFrame] = useState(DEVICE_FRAMES[0].id);
    const [layout, setLayout] = useState<ScreenshotLayout>('caption_top');
    const [language, setLanguage] = useState('Portuguese (Brazil)');
    const [tone, setTone] = useState('');
    const [aiCopy, setAiCopy] = useState(true);
    const [locales, setLocales] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const store = storeOf(format) ?? 'appstore';
    const maxShots = MAX_SCREENSHOTS[store];
    const resolvedTheme = resolveTheme(theme, { color: brand?.color ?? null, accent: brand?.accent ?? null });

    const stepLabels = [
        t('appScreenshots.wizard.steps.app'),
        t('appScreenshots.wizard.steps.screens'),
        t('appScreenshots.wizard.steps.style'),
    ];

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) {
            return;
        }

        setUploading(true);
        const room = Math.max(0, maxShots - shots.length);
        const picked = Array.from(files).slice(0, room);

        try {
            const added = await Promise.all(picked.map(async (file) => ({
                src: await fileToScaledDataUrl(file, 1200, 0.9),
                label: '',
            })));
            setShots((prev) => [...prev, ...added]);
        } catch {
            toast.error(t('appScreenshots.wizard.uploadError'));
        } finally {
            setUploading(false);
        }
    }

    function moveShot(index: number, direction: -1 | 1) {
        setShots((prev) => {
            const target = index + direction;

            if (target < 0 || target >= prev.length) {
                return prev;
            }

            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];

            return next;
        });
    }

    function toggleLocale(code: string) {
        setLocales((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
    }

    function canAdvance(): boolean {
        if (step === 1) {
            return appName.trim() !== '' && pitch.trim() !== '';
        }

        if (step === 2) {
            return shots.length > 0;
        }

        return true;
    }

    /** Park the device shots in sessionStorage, shrinking them if the quota bites. */
    function stashUploads(): boolean {
        const sources = shots.map((shot) => shot.src);

        try {
            sessionStorage.setItem(SCREENSHOT_UPLOADS_KEY, JSON.stringify(sources));

            return true;
        } catch {
            toast.error(t('appScreenshots.wizard.tooLarge'));

            return false;
        }
    }

    function handleSubmit() {
        if (submitting) {
            return;
        }

        if (aiCopy && !auth.premium_access) {
            toast.error(t('createCarousel.premiumRequired'));
            router.visit('/settings/billing');

            return;
        }

        if (!stashUploads()) {
            return;
        }

        setSubmitting(true);
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        router.post(
            AppScreenshotController.store().url,
            {
                title: `${appName} — ${t('appScreenshots.wizard.projectSuffix')}`,
                app_name: appName,
                pitch,
                format,
                theme,
                layout,
                device_frame: deviceFrame,
                screen_count: shots.length,
                language,
                tone,
                screen_labels: shots.map((shot) => shot.label),
                locales,
                ai_copy: aiCopy,
            },
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
            <Head title={t('appScreenshots.wizard.pageTitle')} />
            <div className="min-h-screen bg-gray-50">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
                    <div className="mx-auto flex max-w-4xl items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.visit('/dashboard'))}
                                className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('createCarousel.back')}
                            </button>
                            <div className="h-4 w-px bg-gray-200" />
                            <div>
                                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                                    {t('createCarousel.stepIndicator', { current: step, total: 3 })}
                                </p>
                                <h1 className="text-lg font-bold text-gray-900">{t('appScreenshots.wizard.pageTitle')}</h1>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <Stepper step={step} labels={stepLabels} />
                        </div>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

                    {/* ── Step 1: APP ─────────────────────────────────────── */}
                    {step === 1 && (
                        <div className="mx-auto max-w-lg space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('appScreenshots.wizard.step1.title')}</h2>
                                <p className="mt-1 text-sm text-gray-500">{t('appScreenshots.wizard.step1.subtitle')}</p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step1.appNameLabel')}
                                </label>
                                <input
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                    placeholder={t('appScreenshots.wizard.step1.appNamePlaceholder')}
                                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FFE156] focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step1.pitchLabel')}
                                </label>
                                <p className="text-xs text-gray-400">{t('appScreenshots.wizard.step1.pitchHint')}</p>
                                <textarea
                                    value={pitch}
                                    onChange={(e) => setPitch(e.target.value)}
                                    rows={4}
                                    placeholder={t('appScreenshots.wizard.step1.pitchPlaceholder')}
                                    className="resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FFE156] focus:outline-none"
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step1.formatLabel')}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {STORE_FORMAT_IDS.map((id) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setFormat(id)}
                                            className={`rounded-xl border-2 p-3 text-left transition-all ${
                                                format === id ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-sm font-semibold text-gray-800">{t(`slideEditor.formats.${id}`)}</p>
                                            <p className="mt-0.5 text-[11px] text-gray-500">{exportTargetsFor(id)[0].label}</p>
                                            <p className="mt-1 text-[10px] text-gray-400">
                                                {t('appScreenshots.wizard.step1.maxShots', { count: MAX_SCREENSHOTS[storeOf(id) ?? 'appstore'] })}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step1.languageLabel')}
                                </p>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors focus:border-[#FFE156] focus:ring-2 focus:ring-[#FFE156]/20 focus:outline-none"
                                >
                                    {LANGUAGES.map(({ id, label }) => (
                                        <option key={id} value={id}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: SCREENS ─────────────────────────────────── */}
                    {step === 2 && (
                        <div className="mx-auto max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('appScreenshots.wizard.step2.title')}</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {t('appScreenshots.wizard.step2.subtitle', { max: maxShots })}
                                </p>
                            </div>

                            <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                                shots.length >= maxShots ? 'cursor-not-allowed border-gray-100 text-gray-300' : 'border-gray-200 text-gray-600 hover:border-[#FFE156]'
                            }`}>
                                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                                <span className="text-sm font-semibold">{t('appScreenshots.wizard.step2.uploadCta')}</span>
                                <span className="text-xs text-gray-400">{t('appScreenshots.wizard.step2.uploadHint')}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={shots.length >= maxShots}
                                    className="hidden"
                                    onChange={(e) => {
 handleUpload(e.target.files); e.target.value = ''; 
}}
                                />
                            </label>

                            {shots.length > 0 && (
                                <div className="space-y-2">
                                    {shots.map((shot, index) => (
                                        <div key={`${index}-${shot.src.slice(-24)}`} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5">
                                            <div className="flex flex-col text-gray-300">
                                                <button type="button" onClick={() => moveShot(index, -1)} className="hover:text-gray-600" aria-label={t('appScreenshots.wizard.step2.moveUp')}>
                                                    <ArrowLeft className="h-3.5 w-3.5 rotate-90" />
                                                </button>
                                                <GripVertical className="h-3.5 w-3.5" />
                                                <button type="button" onClick={() => moveShot(index, 1)} className="hover:text-gray-600" aria-label={t('appScreenshots.wizard.step2.moveDown')}>
                                                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                                                </button>
                                            </div>
                                            <img src={shot.src} alt="" className="h-20 w-12 rounded-md object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                                                    {t('appScreenshots.wizard.step2.screenNumber', { number: index + 1 })}
                                                </p>
                                                <input
                                                    value={shot.label}
                                                    onChange={(e) => setShots((prev) => prev.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))}
                                                    placeholder={t('appScreenshots.wizard.step2.labelPlaceholder')}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-[#FFE156] focus:ring-2 focus:ring-[#FFE156]/20 focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShots((prev) => prev.filter((_, i) => i !== index))}
                                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                aria-label={t('appScreenshots.wizard.step2.remove')}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 3: STYLE + LOCALES ─────────────────────────── */}
                    {step === 3 && (
                        <div className="mx-auto max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('appScreenshots.wizard.step3.title')}</h2>
                                <p className="mt-1 text-sm text-gray-500">{t('appScreenshots.wizard.step3.subtitle')}</p>
                            </div>

                            {/* Theme */}
                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step3.themeLabel')}
                                </p>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                    {SCREENSHOT_THEMES.map((option) => {
                                        const preview = resolveTheme(option.id, { color: brand?.color ?? null, accent: brand?.accent ?? null });

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setTheme(option.id)}
                                                className={`rounded-xl border-2 p-1.5 transition-all ${theme === option.id ? 'border-[#FFE156]' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div
                                                    className="mb-1.5 flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg"
                                                    style={{ background: preview.background }}
                                                >
                                                    <span className="h-1.5 w-8 rounded-full" style={{ background: preview.text }} />
                                                    <span className="h-1.5 w-5 rounded-full" style={{ background: preview.accent }} />
                                                    <span className="mt-0.5 h-5 w-6 rounded-sm" style={{ background: preview.frame }} />
                                                </div>
                                                <p className="text-[10px] font-semibold text-gray-600">{option.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Device frame */}
                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step3.frameLabel')}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {DEVICE_FRAMES.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setDeviceFrame(option.id)}
                                            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                                                deviceFrame === option.id ? 'border-[#FFE156] bg-[#FFE156]/5 text-[#1A1A1A]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {option.src ? (
                                                <img src={option.src} alt="" className="h-10 w-auto" />
                                            ) : (
                                                <span className="h-10 w-[19px] rounded-[3px]" style={{ background: resolvedTheme.frame }} />
                                            )}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout */}
                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    {t('appScreenshots.wizard.step3.layoutLabel')}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {(['caption_top', 'caption_bottom', 'alternate'] as ScreenshotLayout[]).map((id) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setLayout(id)}
                                            className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                                                layout === id ? 'border-[#FFE156] bg-[#FFE156]/5 text-[#1A1A1A]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {t(`appScreenshots.wizard.step3.layouts.${id}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI copy */}
                            <button
                                type="button"
                                onClick={() => setAiCopy((v) => !v)}
                                className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                    aiCopy ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                    aiCopy ? 'border-[#FFE156] bg-[#FFE156]' : 'border-gray-300'
                                }`}>
                                    {aiCopy && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div>
                                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                        <Sparkles className="h-3.5 w-3.5" /> {t('appScreenshots.wizard.step3.aiCopyLabel')}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500">{t('appScreenshots.wizard.step3.aiCopyDesc')}</p>
                                </div>
                            </button>

                            {aiCopy && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                        {t('appScreenshots.wizard.step3.toneLabel')}
                                    </label>
                                    <input
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        placeholder={t('appScreenshots.wizard.step3.tonePlaceholder')}
                                        className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FFE156] focus:outline-none"
                                    />
                                </div>
                            )}

                            {/* Locales */}
                            <div>
                                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    <Globe className="h-3.5 w-3.5" /> {t('appScreenshots.wizard.step3.localesLabel')}
                                </p>
                                <p className="mb-2 text-xs text-gray-400">{t('appScreenshots.wizard.step3.localesHint')}</p>
                                <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-gray-100 p-2 sm:grid-cols-3">
                                    {STORE_LOCALES.map((locale) => (
                                        <button
                                            key={locale.code}
                                            type="button"
                                            onClick={() => toggleLocale(locale.code)}
                                            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                                                locales.includes(locale.code) ? 'bg-[#FFE156]/15 text-[#1A1A1A]' : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                                                locales.includes(locale.code) ? 'border-[#FFE156] bg-[#FFE156]' : 'border-gray-300'
                                            }`}>
                                                {locales.includes(locale.code) && <Check className="h-2.5 w-2.5 text-white" />}
                                            </span>
                                            <span className="truncate">{locale.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                                    {t('appScreenshots.wizard.step3.summary')}
                                </p>
                                <p className="mt-1 text-sm text-gray-700">
                                    {t('appScreenshots.wizard.step3.summaryLine', {
                                        shots: shots.length,
                                        size: `${FORMATS[format].w}×${FORMATS[format].h}`,
                                        locales: locales.length + 1,
                                        theme: resolvedTheme.label,
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Navigation ──────────────────────────────────────── */}
                    <div className="mt-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.visit('/dashboard'))}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('createCarousel.back')}
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => canAdvance() && setStep((s) => (s + 1) as 1 | 2 | 3)}
                                disabled={!canAdvance()}
                                className="flex items-center gap-2 rounded-lg bg-[#FFE156] px-6 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D] disabled:opacity-40"
                            >
                                {t('createCarousel.next')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 rounded-lg bg-[#FFE156] px-6 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D] disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('appScreenshots.wizard.generateBtn')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
