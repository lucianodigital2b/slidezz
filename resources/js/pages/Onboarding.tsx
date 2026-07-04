import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    ChevronLeft,
    Fingerprint,
    KeyRound,
    Lightbulb,
    Loader2,
    Palette as PaletteIcon,
    RefreshCw,
    Sparkles,
    Target,
    TrendingUp,
    Upload,
    Users,
    Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLogoIcon from '@/components/app-logo-icon';
import FadeIn from '@/components/fade-in';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Plan {
    name: string;
    description: string;
    price_label: string;
    price_id: string | null;
    features: string[];
}

interface Props {
    has_profile: boolean;
    plans: Record<string, Plan>;
}

interface Palette {
    name: string;
    primary: string;
    secondary: string;
    accent: string;
}

interface FormData {
    goal: string;
    brand_name: string;
    brand_description: string;
    target_audience: string;
    tone_of_voice: string[];
    palette: Palette;
    visual_style: string;
    logo: File | null;
    gemini_api_key: string;
}

// ─── Brand tokens (mirrors LandingEn.tsx) ─────────────────────────────────────

const ACCENT = '#FFE156';
const ACCENT_DARK = '#E6CB4D';
const INK = '#1A1A1A';
const BORDER = '#E8E7E2';

const fieldClass =
    'w-full rounded-xl border bg-white px-4 py-3 text-base text-[#1A1A1A] placeholder:text-[#AFACA4] transition-colors focus:border-[#FFE156] focus:outline-none focus:ring-4 focus:ring-[#FFE156]/15';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const GOAL_ICONS: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    sell_products:        { color: 'text-white', bg: 'bg-emerald-500', icon: TrendingUp },
    build_authority:      { color: 'text-white', bg: 'bg-[#7C3AED]', icon: Sparkles },
    increase_engagement:  { color: 'text-[#1A1A1A]', bg: 'bg-[#FFE156]', icon: Zap },
    generate_leads:       { color: 'text-white', bg: 'bg-[#2563EB]', icon: Users },
};

const TONE_KEYS = [
    'casual', 'professional', 'inspirational', 'educational', 'fun',
    'welcoming', 'direct', 'sophisticated', 'friendly', 'motivational',
] as const;

const PALETTES: Palette[] = [
    { name: 'sunset',    primary: '#F97316', secondary: '#FEF3C7', accent: '#D97706' },
    { name: 'softCoral', primary: '#E11D48', secondary: '#FDA4AF', accent: '#F43F5E' },
    { name: 'forest',    primary: '#065F46', secondary: '#A7F3D0', accent: '#059669' },
    { name: 'mint',      primary: '#0F766E', secondary: '#CCFBF1', accent: '#14B8A6' },
];

const EXTRA_PALETTES: Palette[] = [
    { name: 'ocean',    primary: '#1D4ED8', secondary: '#BFDBFE', accent: '#3B82F6' },
    { name: 'violet',   primary: '#7C3AED', secondary: '#EDE9FE', accent: '#8B5CF6' },
    { name: 'rose',     primary: '#BE185D', secondary: '#FCE7F3', accent: '#EC4899' },
    { name: 'slate',    primary: '#1E293B', secondary: '#F1F5F9', accent: '#475569' },
];

// ─── Step nav config ─────────────────────────────────────────────────────────

const STEP_ICONS = [Target, Building2, Users, Fingerprint, PaletteIcon, KeyRound];
const STEP_KEYS = ['goal', 'brand', 'audience', 'identity', 'style', 'gemini'] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: BORDER }}>
            <div
                className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${(current / total) * 100}%`, background: ACCENT }}
            />
        </div>
    );
}

function StepNav({ current }: { current: number }) {
    const { t } = useTranslation();
    return (
        <div className="mt-5 flex items-start justify-center gap-5 sm:gap-7">
            {STEP_KEYS.map((key, i) => {
                const Icon = STEP_ICONS[i];
                const done = i + 1 <= current;
                const active = i + 1 === current;
                return (
                    <div key={key} className="flex min-w-[52px] flex-col items-center gap-1.5">
                        <div
                            className="flex h-11 w-11 items-center justify-center rounded-full border transition-all"
                            style={{
                                background: done ? ACCENT : '#fff',
                                borderColor: done ? ACCENT : BORDER,
                                boxShadow: active ? `0 0 0 4px ${ACCENT}1f` : 'none',
                            }}
                        >
                            <Icon className="h-5 w-5" style={{ color: done ? '#fff' : '#AFACA4' }} />
                        </div>
                        <span
                            className="text-center text-[11px] font-semibold leading-tight"
                            style={{ color: active ? ACCENT : done ? '#666660' : '#AFACA4' }}
                        >
                            {t(`onboarding.steps.${key}`)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function AdvancedSettings({ children }: { children?: React.ReactNode }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: BORDER }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#FAFAF7]"
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${ACCENT}14` }}>
                    <Lightbulb className="h-4 w-4" style={{ color: ACCENT }} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-[#1A1A1A]">{t('onboarding.advanced.title')}</p>
                    <p className="text-xs leading-snug text-[#888880]">{t('onboarding.advanced.description')}</p>
                </div>
                <ArrowRight className={`h-4 w-4 text-[#AFACA4] transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            {open && (
                <div className="border-t px-5 pb-5" style={{ borderColor: BORDER }}>
                    {children}
                </div>
            )}
        </div>
    );
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-white"
                style={{ background: ACCENT, boxShadow: `0 0 0 10px ${ACCENT}14` }}
            >
                <Icon className="h-7 w-7" />
            </div>
            <div>
                <h2 className="font-display text-4xl leading-none tracking-normal text-[#1A1A1A]">{title}</h2>
                <p className="mt-2 text-lg font-medium text-[#666660]">{subtitle}</p>
            </div>
        </div>
    );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-bold tracking-wide text-[#1A1A1A] uppercase">{children}</label>
            {hint && <p className="text-xs font-medium" style={{ color: ACCENT }}>{hint}</p>}
        </div>
    );
}

// ─── Step 1: Goal ────────────────────────────────────────────────────────────

function Step1({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();
    const goals = [
        { key: 'sell_products',       title: t('onboarding.step1.sellProducts'),       desc: t('onboarding.step1.sellProductsDesc') },
        { key: 'build_authority',     title: t('onboarding.step1.buildAuthority'),     desc: t('onboarding.step1.buildAuthorityDesc') },
        { key: 'increase_engagement', title: t('onboarding.step1.increaseEngagement'), desc: t('onboarding.step1.increaseEngagementDesc') },
        { key: 'generate_leads',      title: t('onboarding.step1.generateLeads'),      desc: t('onboarding.step1.generateLeadsDesc') },
    ];

    return (
        <div className="space-y-8">
            <StepHeader icon={Target} title={t('onboarding.step1.title')} subtitle={t('onboarding.step1.subtitle')} />
            <div className="grid gap-4 sm:grid-cols-2">
                {goals.map(({ key, title, desc }) => {
                    const cfg = GOAL_ICONS[key];
                    const Icon = cfg.icon;
                    const selected = data.goal === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => set('goal', key)}
                            className="relative flex flex-col gap-4 rounded-[20px] border-2 bg-white p-6 text-left transition-all"
                            style={{
                                borderColor: selected ? ACCENT : BORDER,
                                boxShadow: selected ? `0 16px 36px ${ACCENT}1a` : 'none',
                            }}
                        >
                            {selected && (
                                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}>
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.bg}`}>
                                <Icon className={`h-6 w-6 ${cfg.color}`} />
                            </div>
                            <div>
                                <p className="text-lg font-extrabold text-[#1A1A1A]">{title}</p>
                                <p className="mt-1 text-sm font-medium text-[#666660]">{desc}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Step 2: Brand ───────────────────────────────────────────────────────────

function Step2({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <StepHeader icon={Building2} title={t('onboarding.step2.title')} subtitle={t('onboarding.step2.subtitle')} />
            <div className="space-y-5">
                <div className="space-y-2">
                    <FieldLabel>{t('onboarding.step2.brandNameLabel')}</FieldLabel>
                    <input
                        type="text"
                        value={data.brand_name}
                        onChange={(e) => set('brand_name', e.target.value)}
                        placeholder={t('onboarding.step2.brandNamePlaceholder')}
                        className={fieldClass}
                        style={{ borderColor: BORDER }}
                    />
                </div>
                <div className="space-y-2">
                    <FieldLabel hint={t('onboarding.step2.brandDescHint')}>{t('onboarding.step2.brandDescLabel')}</FieldLabel>
                    <textarea
                        value={data.brand_description}
                        onChange={(e) => set('brand_description', e.target.value)}
                        placeholder={t('onboarding.step2.brandDescPlaceholder')}
                        rows={4}
                        className={`${fieldClass} resize-none`}
                        style={{ borderColor: BORDER }}
                    />
                </div>
            </div>
            <AdvancedSettings>
                <div className="space-y-2 pt-4">
                    <FieldLabel>{t('onboarding.advanced.extraLabel')}</FieldLabel>
                    <textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className={`${fieldClass} resize-none`}
                        style={{ borderColor: BORDER }}
                    />
                </div>
            </AdvancedSettings>
        </div>
    );
}

// ─── Step 3: Audience ────────────────────────────────────────────────────────

function Step3({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <StepHeader icon={Users} title={t('onboarding.step3.title')} subtitle={t('onboarding.step3.subtitle')} />
            <div className="space-y-2">
                <FieldLabel hint={t('onboarding.step3.audienceHint')}>{t('onboarding.step3.audienceLabel')}</FieldLabel>
                <textarea
                    value={data.target_audience}
                    onChange={(e) => set('target_audience', e.target.value)}
                    placeholder={t('onboarding.step3.audiencePlaceholder')}
                    rows={5}
                    className={`${fieldClass} resize-none`}
                    style={{ borderColor: BORDER }}
                />
            </div>
            <AdvancedSettings>
                <div className="space-y-2 pt-4">
                    <FieldLabel>{t('onboarding.advanced.extraLabel')}</FieldLabel>
                    <textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className={`${fieldClass} resize-none`}
                        style={{ borderColor: BORDER }}
                    />
                </div>
            </AdvancedSettings>
        </div>
    );
}

// ─── Step 4: Identity ────────────────────────────────────────────────────────

function Step4({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();

    const toggleTone = (key: string) => {
        const current = data.tone_of_voice;
        set('tone_of_voice', current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
    };

    return (
        <div className="space-y-8">
            <StepHeader icon={Fingerprint} title={t('onboarding.step4.title')} subtitle={t('onboarding.step4.subtitle')} />
            <div className="space-y-4">
                <FieldLabel hint={t('onboarding.step4.voiceToneHint')}>{t('onboarding.step4.voiceToneLabel')}</FieldLabel>
                <div className="flex flex-wrap gap-2.5">
                    {TONE_KEYS.map((key) => {
                        const selected = data.tone_of_voice.includes(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggleTone(key)}
                                className="rounded-full border-2 px-4 py-2 text-sm font-bold transition-all"
                                style={{
                                    borderColor: selected ? ACCENT : BORDER,
                                    background: selected ? `${ACCENT}0f` : '#fff',
                                    color: selected ? ACCENT : '#666660',
                                }}
                            >
                                {t(`onboarding.step4.tones.${key}`)}
                            </button>
                        );
                    })}
                </div>
            </div>
            <AdvancedSettings>
                <div className="space-y-2 pt-4">
                    <FieldLabel>{t('onboarding.advanced.extraLabel')}</FieldLabel>
                    <textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className={`${fieldClass} resize-none`}
                        style={{ borderColor: BORDER }}
                    />
                </div>
            </AdvancedSettings>
        </div>
    );
}

// ─── Step 5: Style ───────────────────────────────────────────────────────────

function Step5({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [showExtra, setShowExtra] = useState(false);
    const [customPrimary, setCustomPrimary] = useState(data.palette.primary);
    const [customSecondary, setCustomSecondary] = useState(data.palette.secondary);
    const [customAccent, setCustomAccent] = useState(data.palette.accent);
    const [isCustom, setIsCustom] = useState(false);

    const handleFile = (file: File | null) => {
        if (!file) return;
        set('logo', file);
        setPreview(URL.createObjectURL(file));
    };

    const selectPalette = (p: Palette) => {
        set('palette', p);
        setIsCustom(false);
    };

    const applyCustom = () => {
        set('palette', { name: 'custom', primary: customPrimary, secondary: customSecondary, accent: customAccent });
    };

    const displayPalettes = showExtra ? [...PALETTES, ...EXTRA_PALETTES] : PALETTES;

    return (
        <div className="space-y-8">
            <StepHeader icon={PaletteIcon} title={t('onboarding.step5.title')} subtitle={t('onboarding.step5.subtitle')} />

            {/* Logo upload */}
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-8 transition-colors hover:bg-[#FAFAF7]"
                style={{ borderColor: BORDER }}
            >
                {preview ? (
                    <img src={preview} alt="logo preview" className="h-20 w-20 rounded-xl object-contain" />
                ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: `${ACCENT}12` }}>
                        <Upload className="h-6 w-6" style={{ color: ACCENT }} />
                    </div>
                )}
                <div className="text-center">
                    <p className="text-sm font-bold text-[#1A1A1A]">{t('onboarding.step5.logoTitle')}</p>
                    <p className="text-xs text-[#888880]">{t('onboarding.step5.logoSubtitle')}</p>
                    <p className="text-xs text-[#888880]">{t('onboarding.step5.logoHint')}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </div>
            {preview && (
                <button type="button" className="text-xs font-medium text-[#888880] underline underline-offset-2"
                    onClick={() => { setPreview(null); set('logo', null); }}>
                    {t('onboarding.step5.logoRemove')}
                </button>
            )}

            {/* Brand colors */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PaletteIcon className="h-4 w-4" style={{ color: ACCENT }} />
                        <span className="text-sm font-bold tracking-wide text-[#1A1A1A] uppercase">{t('onboarding.step5.paletteTitle')}</span>
                    </div>
                    <button type="button" onClick={() => setIsCustom(!isCustom)}
                        className="flex items-center gap-2 text-xs font-semibold text-[#666660]">
                        <span>{t('onboarding.step5.paletteCustomize')}</span>
                        <div className="relative h-5 w-9 rounded-full transition-colors" style={{ background: isCustom ? ACCENT : BORDER }}>
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isCustom ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                    </button>
                </div>

                {/* Current colors row */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#888880]">
                    <span>{t('onboarding.step5.paletteCurrentColors')}</span>
                    {(['primary', 'secondary', 'accent'] as const).map((role) => (
                        <div key={role} className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full border" style={{ background: data.palette[role], borderColor: BORDER }} />
                            <span>{t(`onboarding.step5.palette${role.charAt(0).toUpperCase() + role.slice(1)}`)}</span>
                        </div>
                    ))}
                </div>

                {isCustom ? (
                    <div className="space-y-2 rounded-2xl border bg-[#FAFAF7] p-4" style={{ borderColor: BORDER }}>
                        {(['primary', 'secondary', 'accent'] as const).map((key) => {
                            const value = key === 'primary' ? customPrimary : key === 'secondary' ? customSecondary : customAccent;
                            const setter = key === 'primary' ? setCustomPrimary : key === 'secondary' ? setCustomSecondary : setCustomAccent;
                            return (
                                <div key={key} className="flex items-center gap-2">
                                    <input type="color" value={value} onChange={(e) => { setter(e.target.value); }}
                                        className="h-9 w-9 cursor-pointer rounded-lg border p-0.5" style={{ borderColor: BORDER }} />
                                    <input type="text" value={value} maxLength={7}
                                        onChange={(e) => { setter(e.target.value); }}
                                        className="w-28 rounded-lg border px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#FFE156]/20"
                                        style={{ borderColor: BORDER }} />
                                    <span className="text-xs font-medium capitalize text-[#666660]">{t(`onboarding.step5.palette${key.charAt(0).toUpperCase() + key.slice(1)}`)}</span>
                                </div>
                            );
                        })}
                        <button type="button" onClick={applyCustom}
                            className="mt-1 text-xs font-bold" style={{ color: ACCENT }}>
                            {t('onboarding.step5.paletteApply', 'Apply')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {displayPalettes.map((p) => {
                            const selected = data.palette.name === p.name;
                            return (
                                <button key={p.name} type="button" onClick={() => selectPalette(p)}
                                    className="flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-3 transition-all"
                                    style={{
                                        borderColor: selected ? ACCENT : BORDER,
                                        boxShadow: selected ? `0 10px 24px ${ACCENT}1a` : 'none',
                                    }}>
                                    <div className="flex gap-1">
                                        {[p.primary, p.secondary, p.accent].map((c) => (
                                            <div key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />
                                        ))}
                                    </div>
                                    <span className="text-center text-[10px] font-medium leading-tight text-[#666660]">
                                        {t(`onboarding.step5.palettes.${p.name}`, p.name)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <button type="button" onClick={() => setShowExtra(!showExtra)}
                    className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-[#666660] hover:text-[#1A1A1A]">
                    <RefreshCw className="h-3 w-3" />
                    {t('onboarding.step5.paletteMorePalettes')}
                </button>
            </div>

            {/* Visual style */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
                    <span className="text-sm font-bold tracking-wide text-[#1A1A1A] uppercase">{t('onboarding.step5.visualStyleTitle')}</span>
                </div>
                <p className="text-xs font-medium text-[#888880]">{t('onboarding.step5.visualStyleHint')}</p>
                <textarea
                    value={data.visual_style}
                    onChange={(e) => set('visual_style', e.target.value)}
                    placeholder={t('onboarding.step5.visualStylePlaceholder')}
                    rows={4}
                    className={`${fieldClass} resize-none`}
                    style={{ borderColor: BORDER }}
                />
                <div className="flex items-center justify-between">
                    {/* <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-[#666660] hover:text-[#1A1A1A]">
                        <Upload className="h-3 w-3" />
                        {t('onboarding.step5.addVisualRef')}
                    </button> */}
                    {/* <button type="button" className="flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-xs font-bold text-[#1A1A1A] transition-colors hover:bg-[#FAFAF7]" style={{ borderColor: BORDER }}>
                        <RefreshCw className="h-3 w-3" />
                        {t('onboarding.step5.refineWithAI')}
                    </button> */}
                </div>
            </div>
        </div>
    );
}

// ─── Step 6: Gemini key (BYOK) ───────────────────────────────────────────────

function Step6GeminiKey({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center">
                <h2 className="font-display text-5xl leading-none tracking-normal text-[#1A1A1A]">{t('onboarding.gemini.title')}</h2>
                <p className="text-lg font-medium text-[#666660]">{t('onboarding.gemini.subtitle')}</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="gemini_api_key" className="text-sm font-bold text-[#1A1A1A]">
                    {t('onboarding.gemini.label')}
                </label>
                <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#AFACA4]" />
                    <input
                        id="gemini_api_key"
                        type="password"
                        autoComplete="off"
                        className={`${fieldClass} pl-11`}
                        placeholder={t('onboarding.gemini.placeholder')}
                        value={data.gemini_api_key}
                        onChange={(e) => set('gemini_api_key', e.target.value)}
                    />
                </div>
                <a
                    href="/chave-gemini"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-semibold text-[#888880] underline underline-offset-2 transition-colors hover:text-[#1A1A1A]"
                >
                    {t('onboarding.gemini.guideLink')}
                </a>
                <p className="text-xs font-medium text-[#AFACA4]">{t('onboarding.gemini.hint')}</p>
            </div>
        </div>
    );
}

// ─── Step 7: Plans ───────────────────────────────────────────────────────────

function StepPlans({
    plans,
    onSubscribe,
    subscribingTo,
}: {
    plans: Record<string, Plan>;
    onSubscribe: (key: string) => void;
    subscribingTo: string | null;
}) {
    const { t } = useTranslation();
    const entries = Object.entries(plans);
    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center">
                <h2 className="font-display text-5xl leading-none tracking-normal text-[#1A1A1A]">{t('onboarding.plans.title')}</h2>
                <p className="text-lg font-medium text-[#666660]">{t('onboarding.plans.subtitle')}</p>
            </div>

            <div className={`grid items-stretch gap-6 ${entries.length >= 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
                {entries.map(([key, plan], i) => {
                    const featured = entries.length >= 3 ? i === 1 : false;
                    return (
                        <div
                            key={key}
                            className="relative flex flex-col rounded-[24px] border-2 bg-white p-7 shadow-sm"
                            style={{ borderColor: featured ? ACCENT : BORDER }}
                        >
                            {featured && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold tracking-wide text-white uppercase shadow-sm">
                                    {t('onboarding.plans.popular', 'Mais popular')}
                                </div>
                            )}
                            <div>
                                <p className="text-2xl font-extrabold text-[#1A1A1A]">{plan.name}</p>
                                <p className="mt-1 text-sm font-medium text-[#666660]">{plan.description}</p>
                                <p className="mt-4 font-display text-5xl leading-none tracking-normal text-[#1A1A1A]">{plan.price_label}</p>
                                <p className="mt-1 text-xs font-medium text-[#888880]">{t('onboarding.plans.afterTrial')}</p>
                            </div>
                            <ul className="my-6 flex-1 space-y-3 border-t pt-6" style={{ borderColor: BORDER }}>
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-sm font-medium text-[#555550]">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-lg font-bold text-white transition-colors disabled:opacity-60"
                                style={{ background: featured ? ACCENT : INK }}
                                onMouseEnter={(e) => { (e.currentTarget.style.background = featured ? ACCENT_DARK : '#333'); }}
                                onMouseLeave={(e) => { (e.currentTarget.style.background = featured ? ACCENT : INK); }}
                                disabled={subscribingTo !== null || !plan.price_id}
                                onClick={() => onSubscribe(key)}
                            >
                                {subscribingTo === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {t('onboarding.plans.startFree', { plan: plan.name })}
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="text-center text-xs font-medium text-[#888880]">{t('onboarding.plans.terms')}</p>

            <div className="flex justify-center">
                <button type="button" onClick={() => router.post('/logout')}
                    className="text-sm font-medium text-[#888880] underline underline-offset-2 transition-colors hover:text-[#1A1A1A]">
                    {t('onboarding.plans.logout')}
                </button>
            </div>
        </div>
    );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep(step: number, data: FormData, t: (k: string) => string): string | null {
    if (step === 1 && !data.goal) return t('onboarding.errors.goalRequired');
    if (step === 2) {
        if (!data.brand_name.trim()) return t('onboarding.errors.brandNameRequired');
        if (!data.brand_description.trim()) return t('onboarding.errors.brandDescRequired');
    }
    if (step === 3 && !data.target_audience.trim()) return t('onboarding.errors.audienceRequired');
    if (step === 4 && data.tone_of_voice.length === 0) return t('onboarding.errors.toneRequired');
    return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding({ has_profile, plans }: Props) {
    const { t } = useTranslation();
    const [step, setStep] = useState(has_profile ? 7 : 1);
    const [saving, setSaving] = useState(false);
    const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FormData>({
        goal: '',
        brand_name: '',
        brand_description: '',
        target_audience: '',
        tone_of_voice: [],
        palette: PALETTES[0],
        visual_style: '',
        logo: null,
        gemini_api_key: '',
    });

    const set = (key: keyof FormData, value: any) => {
        setData((prev) => ({ ...prev, [key]: value }));
        setError(null);
    };

    const next = () => {
        const err = validateStep(step, data, t);
        if (err) { setError(err); return; }
        setError(null);
        if (step === TOTAL_STEPS) {
            saveAndAdvance();
        } else {
            setStep((s) => s + 1);
        }
    };

    const back = () => {
        setError(null);
        setStep((s) => Math.max(s - 1, 1));
    };

    const saveAndAdvance = (skipGeminiKey = false) => {
        const form = new FormData();
        form.append('goal', data.goal);
        form.append('brand_name', data.brand_name);
        form.append('brand_description', data.brand_description);
        form.append('target_audience', data.target_audience);
        data.tone_of_voice.forEach((t_) => form.append('tone_of_voice[]', t_));
        form.append('palette[name]', data.palette.name);
        form.append('palette[primary]', data.palette.primary);
        form.append('palette[secondary]', data.palette.secondary);
        form.append('palette[accent]', data.palette.accent);
        if (data.visual_style) form.append('visual_style', data.visual_style);
        if (data.logo) form.append('logo', data.logo);
        if (!skipGeminiKey && data.gemini_api_key.trim()) form.append('gemini_api_key', data.gemini_api_key.trim());

        setSaving(true);
        router.post('/onboarding/profile', form, {
            forceFormData: true,
            preserveState: true,
            onSuccess: () => { setStep(7); setSaving(false); },
            onError: () => setSaving(false),
        });
    };

    const subscribeToPlan = (planKey: string) => {
        setSubscribingTo(planKey);
        router.post('/onboarding/subscribe', { plan: planKey }, {
            onError: () => setSubscribingTo(null),
        });
    };

    const isOnPlansStep = step === 7;

    const stepComponents: Record<number, React.ReactNode> = {
        1: <Step1 data={data} set={set} />,
        2: <Step2 data={data} set={set} />,
        3: <Step3 data={data} set={set} />,
        4: <Step4 data={data} set={set} />,
        5: <Step5 data={data} set={set} />,
        6: <Step6GeminiKey data={data} set={set} />,
        7: <StepPlans plans={plans} onSubscribe={subscribeToPlan} subscribingTo={subscribingTo} />,
    };

    return (
        <>
            <Head title={t('onboarding.header.subtitle')}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=bebas-neue:400|outfit:400,500,600,700,800" rel="stylesheet" />
            </Head>

            <div className="flex min-h-screen flex-col font-[Outfit,sans-serif]" style={{ background: '#F9F6F4', color: INK }}>
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: INK }}>
                            <AppLogoIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="leading-none">
                            <span className="font-display text-2xl tracking-wide text-[#1A1A1A]">Slidezz</span>
                            <p className="mt-0.5 text-xs font-medium text-[#888880]">{t('onboarding.header.subtitle')}</p>
                        </div>
                    </div>
                    {!isOnPlansStep && (
                        <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold tracking-wide text-[#666660] tabular-nums" style={{ borderColor: BORDER }}>
                            {t('onboarding.header.step', { current: step, total: TOTAL_STEPS })}
                        </span>
                    )}
                </header>

                {/* Progress + step nav */}
                {!isOnPlansStep && (
                    <div className="px-6 pb-6">
                        <div className="mx-auto max-w-2xl">
                            <ProgressBar current={step} total={TOTAL_STEPS} />
                            <StepNav current={step} />
                        </div>
                    </div>
                )}

                {/* Content */}
                <main className="flex flex-1 items-start justify-center px-4 pb-16">
                    <div className={`w-full space-y-8 ${isOnPlansStep ? 'max-w-5xl' : 'max-w-xl'}`}>
                        <FadeIn key={step}>{stepComponents[step]}</FadeIn>

                        {error && (
                            <p className="rounded-xl px-4 py-3 text-sm font-semibold text-[#B91C1C]" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                {error}
                            </p>
                        )}

                        {!isOnPlansStep && (
                            <div className="flex items-center justify-between gap-4 border-t pt-6" style={{ borderColor: BORDER }}>
                                {step > 1 ? (
                                    <button type="button" onClick={back} disabled={saving}
                                        className="flex items-center gap-1.5 text-sm font-semibold text-[#666660] transition-colors hover:text-[#1A1A1A] disabled:opacity-50">
                                        <ChevronLeft className="h-4 w-4" />
                                        {t('onboarding.nav.back')}
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <div className="flex items-center gap-4">
                                    {step === TOTAL_STEPS && (
                                        <button type="button" onClick={() => saveAndAdvance(true)} disabled={saving}
                                            className="text-sm font-semibold text-[#888880] underline underline-offset-2 transition-colors hover:text-[#1A1A1A] disabled:opacity-50">
                                            {t('onboarding.gemini.skip')}
                                        </button>
                                    )}
                                    <button type="button" onClick={next} disabled={saving}
                                        className="flex items-center gap-2 rounded-full px-7 py-3 text-base font-bold text-white shadow-sm transition-colors disabled:opacity-50"
                                        style={{ background: ACCENT }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_DARK; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; }}>
                                        {saving ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> {t('onboarding.nav.saving')}</>
                                        ) : (
                                            <>{step === TOTAL_STEPS ? t('onboarding.nav.viewPlans') : t('onboarding.nav.continue')} <ArrowRight className="h-4 w-4" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isOnPlansStep && !has_profile && (
                            <div className="flex justify-center">
                                <button type="button" onClick={back} disabled={subscribingTo !== null}
                                    className="flex items-center gap-1.5 text-sm font-semibold text-[#888880] transition-colors hover:text-[#1A1A1A] disabled:opacity-50">
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('onboarding.nav.back')}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
