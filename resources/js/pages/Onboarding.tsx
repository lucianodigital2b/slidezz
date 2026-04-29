import { router } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Fingerprint,
    Lightbulb,
    Loader2,
    Palette,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const GOAL_ICONS: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    sell_products:        { color: 'text-white', bg: 'bg-emerald-500', icon: TrendingUp },
    build_authority:      { color: 'text-white', bg: 'bg-pink-500', icon: Sparkles },
    increase_engagement:  { color: 'text-white', bg: 'bg-rose-500', icon: Zap },
    generate_leads:       { color: 'text-white', bg: 'bg-blue-500', icon: Users },
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

const STEP_ICONS = [Target, Building2, Users, Fingerprint, Palette];
const STEP_KEYS = ['goal', 'brand', 'audience', 'identity', 'style'] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(current / total) * 100}%` }}
            />
        </div>
    );
}

function StepNav({ current }: { current: number }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-start justify-center gap-6 mt-4">
            {STEP_KEYS.map((key, i) => {
                const Icon = STEP_ICONS[i];
                const done = i + 1 <= current;
                const active = i + 1 === current;
                return (
                    <div key={key} className="flex flex-col items-center gap-1.5 min-w-[52px]">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                            done ? 'bg-blue-500 shadow-md shadow-blue-200' : 'bg-gray-100'
                        }`}>
                            <Icon className={`w-5 h-5 ${done ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <span className={`text-[11px] font-medium text-center leading-tight ${
                            active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'
                        }`}>
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
        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
            >
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{t('onboarding.advanced.title')}</p>
                    <p className="text-xs text-gray-500 leading-snug">{t('onboarding.advanced.description')}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 border-t border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
}

function StepIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
    return (
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${color}`}>
            <Icon className="w-7 h-7" />
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
            <div className="flex flex-col items-center text-center gap-3">
                <StepIcon icon={Target} color="bg-blue-500 text-white" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.step1.title')}</h2>
                    <p className="mt-1 text-gray-500">{t('onboarding.step1.subtitle')}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {goals.map(({ key, title, desc }) => {
                    const cfg = GOAL_ICONS[key];
                    const Icon = cfg.icon;
                    const selected = data.goal === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => set('goal', key)}
                            className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 text-left transition-all ${
                                selected ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-gray-200 hover:border-blue-200'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg}`}>
                                <Icon className={`w-5 h-5 ${cfg.color}`} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
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
        <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
                <StepIcon icon={Building2} color="bg-blue-50 text-blue-500" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.step2.title')}</h2>
                    <p className="mt-1 text-gray-500">{t('onboarding.step2.subtitle')}</p>
                </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.step2.brandNameLabel')}</label>
                    <input
                        type="text"
                        value={data.brand_name}
                        onChange={(e) => set('brand_name', e.target.value)}
                        placeholder={t('onboarding.step2.brandNamePlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.step2.brandDescLabel')}</label>
                    <p className="text-xs text-blue-600">{t('onboarding.step2.brandDescHint')}</p>
                    <Textarea
                        value={data.brand_description}
                        onChange={(e) => set('brand_description', e.target.value)}
                        placeholder={t('onboarding.step2.brandDescPlaceholder')}
                        rows={4}
                        className="rounded-xl border-gray-200 text-sm resize-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
            </div>
            <AdvancedSettings>
                <div className="pt-3 space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.advanced.extraLabel')}</label>
                    <Textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className="rounded-xl border-gray-200 text-sm resize-none"
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
        <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
                <StepIcon icon={Users} color="bg-blue-50 text-blue-500" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.step3.title')}</h2>
                    <p className="mt-1 text-gray-500">{t('onboarding.step3.subtitle')}</p>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t('onboarding.step3.audienceLabel')}</label>
                <p className="text-xs text-blue-600">{t('onboarding.step3.audienceHint')}</p>
                <Textarea
                    value={data.target_audience}
                    onChange={(e) => set('target_audience', e.target.value)}
                    placeholder={t('onboarding.step3.audiencePlaceholder')}
                    rows={5}
                    className="rounded-xl border-gray-200 text-sm resize-none focus:ring-2 focus:ring-blue-400"
                />
            </div>
            <AdvancedSettings>
                <div className="pt-3 space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.advanced.extraLabel')}</label>
                    <Textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className="rounded-xl border-gray-200 text-sm resize-none"
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
        <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
                <StepIcon icon={Fingerprint} color="bg-rose-50 text-rose-400" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.step4.title')}</h2>
                    <p className="mt-1 text-gray-500">{t('onboarding.step4.subtitle')}</p>
                </div>
            </div>
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.step4.voiceToneLabel')}</label>
                    <p className="text-xs text-gray-500 mt-0.5">{t('onboarding.step4.voiceToneHint')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {TONE_KEYS.map((key) => {
                        const selected = data.tone_of_voice.includes(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggleTone(key)}
                                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                                    selected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'
                                }`}
                            >
                                {t(`onboarding.step4.tones.${key}`)}
                            </button>
                        );
                    })}
                </div>
            </div>
            <AdvancedSettings>
                <div className="pt-3 space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('onboarding.advanced.extraLabel')}</label>
                    <Textarea
                        placeholder={t('onboarding.advanced.extraPlaceholder')}
                        rows={3}
                        className="rounded-xl border-gray-200 text-sm resize-none"
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
        <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
                <StepIcon icon={Palette} color="bg-purple-50 text-purple-500" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.step5.title')}</h2>
                    <p className="mt-1 text-gray-500">{t('onboarding.step5.subtitle')}</p>
                </div>
            </div>

            {/* Logo upload */}
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-blue-300 hover:bg-blue-50/50 bg-white"
            >
                {preview ? (
                    <img src={preview} alt="logo preview" className="h-20 w-20 rounded-xl object-contain" />
                ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
                        <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                )}
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">{t('onboarding.step5.logoTitle')}</p>
                    <p className="text-xs text-gray-400">{t('onboarding.step5.logoSubtitle')}</p>
                    <p className="text-xs text-gray-400">{t('onboarding.step5.logoHint')}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </div>
            {preview && (
                <button type="button" className="text-xs text-gray-400 underline underline-offset-2"
                    onClick={() => { setPreview(null); set('logo', null); }}>
                    {t('onboarding.step5.logoRemove')}
                </button>
            )}

            {/* Brand colors */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-700">{t('onboarding.step5.paletteTitle')}</span>
                    </div>
                    <button type="button" onClick={() => setIsCustom(!isCustom)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                        <span>{t('onboarding.step5.paletteCustomize')}</span>
                        <div className={`relative w-8 h-4 rounded-full transition-colors ${isCustom ? 'bg-blue-500' : 'bg-gray-200'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isCustom ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                    </button>
                </div>

                {/* Current colors row */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{t('onboarding.step5.paletteCurrentColors')}</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: data.palette.primary }} />
                        <span>{t('onboarding.step5.palettePrimary')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: data.palette.secondary }} />
                        <span>{t('onboarding.step5.paletteSecondary')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: data.palette.accent }} />
                        <span>{t('onboarding.step5.paletteAccent')}</span>
                    </div>
                </div>

                {isCustom ? (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        {(['primary', 'secondary', 'accent'] as const).map((key) => {
                            const value = key === 'primary' ? customPrimary : key === 'secondary' ? customSecondary : customAccent;
                            const setter = key === 'primary' ? setCustomPrimary : key === 'secondary' ? setCustomSecondary : setCustomAccent;
                            return (
                                <div key={key} className="flex items-center gap-2">
                                    <input type="color" value={value} onChange={(e) => { setter(e.target.value); }}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
                                    <input type="text" value={value} maxLength={7}
                                        onChange={(e) => { setter(e.target.value); }}
                                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                    <span className="text-xs text-gray-500 capitalize">{t(`onboarding.step5.palette${key.charAt(0).toUpperCase() + key.slice(1)}`)}</span>
                                </div>
                            );
                        })}
                        <button type="button" onClick={applyCustom}
                            className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                            Apply
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {displayPalettes.map((p) => {
                            const selected = data.palette.name === p.name;
                            return (
                                <button key={p.name} type="button" onClick={() => selectPalette(p)}
                                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                                        selected ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-gray-200 bg-white hover:border-blue-200'
                                    }`}>
                                    <div className="flex gap-1">
                                        {[p.primary, p.secondary, p.accent].map((c) => (
                                            <div key={c} className="w-4 h-4 rounded-full" style={{ background: c }} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-600 text-center leading-tight">
                                        {t(`onboarding.step5.palettes.${p.name}`, p.name)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <button type="button" onClick={() => setShowExtra(!showExtra)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mx-auto">
                    <RefreshCw className="w-3 h-3" />
                    {t('onboarding.step5.paletteMorePalettes')}
                </button>
            </div>

            {/* Visual style */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">{t('onboarding.step5.visualStyleTitle')}</span>
                </div>
                <p className="text-xs text-gray-500">{t('onboarding.step5.visualStyleHint')}</p>
                <Textarea
                    value={data.visual_style}
                    onChange={(e) => set('visual_style', e.target.value)}
                    placeholder={t('onboarding.step5.visualStylePlaceholder')}
                    rows={4}
                    className="rounded-xl border-gray-200 text-sm resize-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex items-center justify-between">
                    <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                        <Upload className="w-3 h-3" />
                        {t('onboarding.step5.addVisualRef')}
                    </button>
                    <button type="button" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <RefreshCw className="w-3 h-3" />
                        {t('onboarding.step5.refineWithAI')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Step 6: Plans ───────────────────────────────────────────────────────────

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
    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.plans.title')}</h2>
                <p className="text-gray-500">{t('onboarding.plans.subtitle')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(plans).map(([key, plan]) => (
                    <div key={key} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
                        <div>
                            <p className="font-bold text-lg text-gray-900">{plan.name}</p>
                            <p className="text-sm text-gray-500">{plan.description}</p>
                            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{plan.price_label}</p>
                            <p className="text-xs text-gray-400">{t('onboarding.plans.afterTrial')}</p>
                        </div>
                        <ul className="flex-1 space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm text-gray-500">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <Button
                            className="mt-auto w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60"
                            disabled={subscribingTo !== null || !plan.price_id}
                            onClick={() => onSubscribe(key)}
                        >
                            {subscribingTo === key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {t('onboarding.plans.startFree', { plan: plan.name })}
                        </Button>
                    </div>
                ))}
            </div>

            <p className="text-center text-xs text-gray-400">{t('onboarding.plans.terms')}</p>

            <div className="flex justify-center">
                <button type="button" onClick={() => router.post('/logout')}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">
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
    const [step, setStep] = useState(has_profile ? 6 : 1);
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

    const saveAndAdvance = () => {
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

        setSaving(true);
        router.post('/onboarding/profile', form, {
            forceFormData: true,
            preserveState: true,
            onSuccess: () => { setStep(6); setSaving(false); },
            onError: () => setSaving(false),
        });
    };

    const subscribeToPlan = (planKey: string) => {
        setSubscribingTo(planKey);
        router.post('/onboarding/subscribe', { plan: planKey }, {
            onError: () => setSubscribingTo(null),
        });
    };

    const isOnPlansStep = step === 6;

    const stepComponents: Record<number, React.ReactNode> = {
        1: <Step1 data={data} set={set} />,
        2: <Step2 data={data} set={set} />,
        3: <Step3 data={data} set={set} />,
        4: <Step4 data={data} set={set} />,
        5: <Step5 data={data} set={set} />,
        6: <StepPlans plans={plans} onSubscribe={subscribeToPlan} subscribingTo={subscribingTo} />,
    };

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between bg-white border-b border-gray-100 px-6 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-gray-900 text-sm">Slidezz</span>
                        <p className="text-[11px] text-gray-400 leading-none">{t('onboarding.header.subtitle')}</p>
                    </div>
                </div>
                {!isOnPlansStep && (
                    <span className="text-xs text-gray-400 tabular-nums">
                        {t('onboarding.header.step', { current: step, total: TOTAL_STEPS })}
                    </span>
                )}
            </header>

            {/* Progress + step nav */}
            {!isOnPlansStep && (
                <div className="bg-white border-b border-gray-100 px-6 pb-4">
                    <ProgressBar current={step} total={TOTAL_STEPS} />
                    <StepNav current={step} />
                </div>
            )}

            {/* Content */}
            <main className="flex flex-1 items-start justify-center px-4 py-8">
                <div className="w-full max-w-xl space-y-6">
                    {stepComponents[step]}

                    {error && (
                        <p className="text-sm font-medium text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
                    )}

                    {!isOnPlansStep && (
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200 bg-gray-50 -mx-4 px-4 py-3 sticky bottom-0">
                            {step > 1 ? (
                                <button type="button" onClick={back} disabled={saving}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('onboarding.nav.back')}
                                </button>
                            ) : (
                                <span />
                            )}
                            <button type="button" onClick={next} disabled={saving}
                                className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors shadow-sm">
                                {saving ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> {t('onboarding.nav.saving')}</>
                                ) : (
                                    <>{step === TOTAL_STEPS ? t('onboarding.nav.viewPlans') : t('onboarding.nav.continue')} <ChevronRight className="h-4 w-4" /></>
                                )}
                            </button>
                        </div>
                    )}

                    {isOnPlansStep && !has_profile && (
                        <div className="flex justify-start border-t border-gray-200 pt-3">
                            <button type="button" onClick={back} disabled={subscribingTo !== null}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                                {t('onboarding.nav.back')}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
