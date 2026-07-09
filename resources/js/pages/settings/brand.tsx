import { Head, useForm } from '@inertiajs/react';
import { Sparkles, TrendingUp, Upload, Users, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { edit, update } from '@/routes/brand';

// Mirrors the onboarding option lists (labels come from the shared onboarding.* i18n keys).
const GOALS = [
    { key: 'sell_products', icon: TrendingUp, bg: 'bg-emerald-500', color: 'text-white' },
    { key: 'build_authority', icon: Sparkles, bg: 'bg-[#7C3AED]', color: 'text-white' },
    { key: 'increase_engagement', icon: Zap, bg: 'bg-[#FFE156]', color: 'text-[#1A1A1A]' },
    { key: 'generate_leads', icon: Users, bg: 'bg-[#2563EB]', color: 'text-white' },
] as const;

const GOAL_LABEL_KEY: Record<string, string> = {
    sell_products: 'sellProducts',
    build_authority: 'buildAuthority',
    increase_engagement: 'increaseEngagement',
    generate_leads: 'generateLeads',
};

const TONE_KEYS = [
    'casual', 'professional', 'inspirational', 'educational', 'fun',
    'welcoming', 'direct', 'sophisticated', 'friendly', 'motivational',
] as const;

interface Palette {
    name: string;
    primary: string;
    secondary: string;
    accent: string;
}

const PALETTES: Palette[] = [
    { name: 'sunset', primary: '#F97316', secondary: '#FEF3C7', accent: '#D97706' },
    { name: 'softCoral', primary: '#E11D48', secondary: '#FDA4AF', accent: '#F43F5E' },
    { name: 'forest', primary: '#065F46', secondary: '#A7F3D0', accent: '#059669' },
    { name: 'mint', primary: '#0F766E', secondary: '#CCFBF1', accent: '#14B8A6' },
    { name: 'ocean', primary: '#1D4ED8', secondary: '#BFDBFE', accent: '#3B82F6' },
    { name: 'violet', primary: '#7C3AED', secondary: '#EDE9FE', accent: '#8B5CF6' },
    { name: 'rose', primary: '#BE185D', secondary: '#FCE7F3', accent: '#EC4899' },
    { name: 'slate', primary: '#1E293B', secondary: '#F1F5F9', accent: '#475569' },
];

interface BrandProfile {
    goal: string;
    brand_name: string;
    brand_description: string;
    target_audience: string;
    tone_of_voice: string[];
    palette: Palette | null;
    visual_style: string;
}

export default function Brand({ profile, logoUrl }: { profile: BrandProfile; logoUrl: string | null }) {
    const { t } = useTranslation();
    const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);

    const form = useForm<{
        goal: string;
        brand_name: string;
        brand_description: string;
        target_audience: string;
        tone_of_voice: string[];
        palette: Palette;
        visual_style: string;
        logo: File | null;
    }>({
        goal: profile.goal || 'build_authority',
        brand_name: profile.brand_name || '',
        brand_description: profile.brand_description || '',
        target_audience: profile.target_audience || '',
        tone_of_voice: profile.tone_of_voice ?? [],
        palette: profile.palette ?? PALETTES[0],
        visual_style: profile.visual_style || '',
        logo: null,
    });

    // A saved palette whose name isn't one of the presets is a custom one — open
    // the custom editor for it.
    const isPreset = (name?: string) => PALETTES.some((p) => p.name === name);
    const [customMode, setCustomMode] = useState(!isPreset(profile.palette?.name));

    function setPaletteColor(role: 'primary' | 'secondary' | 'accent', value: string) {
        form.setData('palette', { ...form.data.palette, name: 'custom', [role]: value });
    }

    function toggleTone(key: string) {
        const next = form.data.tone_of_voice.includes(key)
            ? form.data.tone_of_voice.filter((k) => k !== key)
            : [...form.data.tone_of_voice, key];
        form.setData('tone_of_voice', next);
    }

    function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : logoUrl);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post(update().url, { forceFormData: true, preserveScroll: true });
    }

    const paletteError = form.errors.palette
        || form.errors['palette.primary' as keyof typeof form.errors]
        || form.errors['palette.name' as keyof typeof form.errors];

    return (
        <>
            <Head title={t('settings.brand.title')} />
            <h1 className="sr-only">{t('settings.brand.title')}</h1>

            <form onSubmit={submit} className="space-y-8">
                <Heading variant="small" title={t('settings.brand.title')} description={t('settings.brand.description')} />

                {/* Goal */}
                <div className="grid gap-2">
                    <Label>{t('settings.brand.goalLabel')}</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {GOALS.map(({ key, icon: Icon, bg, color }) => {
                            const selected = form.data.goal === key;
                            return (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => form.setData('goal', key)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                                        selected ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-border hover:border-muted-foreground/40',
                                    )}
                                >
                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', bg, color)}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-sm font-medium">{t(`onboarding.step1.${GOAL_LABEL_KEY[key]}`)}</span>
                                </button>
                            );
                        })}
                    </div>
                    <InputError message={form.errors.goal} />
                </div>

                {/* Brand name */}
                <div className="grid gap-2">
                    <Label htmlFor="brand_name">{t('settings.brand.nameLabel')}</Label>
                    <Input
                        id="brand_name"
                        value={form.data.brand_name}
                        onChange={(e) => form.setData('brand_name', e.target.value)}
                        placeholder={t('settings.brand.namePlaceholder')}
                    />
                    <InputError message={form.errors.brand_name} />
                </div>

                {/* Brand description */}
                <div className="grid gap-2">
                    <Label htmlFor="brand_description">{t('settings.brand.descriptionLabel')}</Label>
                    <Textarea
                        id="brand_description"
                        rows={3}
                        value={form.data.brand_description}
                        onChange={(e) => form.setData('brand_description', e.target.value)}
                        placeholder={t('settings.brand.descriptionPlaceholder')}
                    />
                    <InputError message={form.errors.brand_description} />
                </div>

                {/* Target audience */}
                <div className="grid gap-2">
                    <Label htmlFor="target_audience">{t('settings.brand.audienceLabel')}</Label>
                    <Textarea
                        id="target_audience"
                        rows={3}
                        value={form.data.target_audience}
                        onChange={(e) => form.setData('target_audience', e.target.value)}
                        placeholder={t('settings.brand.audiencePlaceholder')}
                    />
                    <InputError message={form.errors.target_audience} />
                </div>

                {/* Tone of voice */}
                <div className="grid gap-2">
                    <Label>{t('settings.brand.toneLabel')}</Label>
                    <div className="flex flex-wrap gap-2">
                        {TONE_KEYS.map((key) => {
                            const selected = form.data.tone_of_voice.includes(key);
                            return (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => toggleTone(key)}
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                                        selected ? 'border-[#FFE156] bg-[#FFE156]/10 font-medium text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                                    )}
                                >
                                    {t(`onboarding.step4.tones.${key}`)}
                                </button>
                            );
                        })}
                    </div>
                    <InputError message={form.errors.tone_of_voice} />
                </div>

                {/* Palette */}
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label>{t('settings.brand.paletteLabel')}</Label>
                        <button
                            type="button"
                            onClick={() => setCustomMode((v) => !v)}
                            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {customMode ? t('settings.brand.palettePresets') : t('onboarding.step5.paletteCustomize')}
                        </button>
                    </div>

                    {customMode ? (
                        <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
                            {(['primary', 'secondary', 'accent'] as const).map((role) => (
                                <div key={role} className="grid gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {t(`onboarding.step5.palette${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            aria-label={role}
                                            value={form.data.palette[role]}
                                            onChange={(e) => setPaletteColor(role, e.target.value)}
                                            className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
                                        />
                                        <Input
                                            value={form.data.palette[role]}
                                            onChange={(e) => setPaletteColor(role, e.target.value)}
                                            maxLength={7}
                                            className="font-mono text-xs uppercase"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {PALETTES.map((p) => {
                                const selected = form.data.palette?.name === p.name;
                                return (
                                    <button
                                        type="button"
                                        key={p.name}
                                        onClick={() => form.setData('palette', p)}
                                        className={cn(
                                            'flex flex-col gap-2 rounded-xl border p-2.5 transition-colors',
                                            selected ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-border hover:border-muted-foreground/40',
                                        )}
                                    >
                                        <div className="flex gap-1">
                                            {[p.primary, p.secondary, p.accent].map((c) => (
                                                <span key={c} className="h-6 flex-1 rounded" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{t(`onboarding.step5.palettes.${p.name}`, p.name)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <InputError message={paletteError as string | undefined} />
                </div>

                {/* Visual style */}
                <div className="grid gap-2">
                    <Label htmlFor="visual_style">{t('settings.brand.visualStyleLabel')}</Label>
                    <Textarea
                        id="visual_style"
                        rows={2}
                        value={form.data.visual_style}
                        onChange={(e) => form.setData('visual_style', e.target.value)}
                        placeholder={t('settings.brand.visualStylePlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">{t('settings.brand.visualStyleHint')}</p>
                    <InputError message={form.errors.visual_style} />
                </div>

                {/* Logo */}
                <div className="grid gap-2">
                    <Label>{t('settings.brand.logoLabel')}</Label>
                    <div className="flex items-center gap-4">
                        {logoPreview ? (
                            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted">
                                <img src={logoPreview} alt="logo" className="h-full w-full object-contain" />
                                {form.data.logo && (
                                    <button
                                        type="button"
                                        onClick={() => { form.setData('logo', null); setLogoPreview(logoUrl); }}
                                        className="absolute top-0.5 right-0.5 rounded bg-black/60 p-0.5 text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                                <Upload className="h-5 w-5" />
                            </div>
                        )}
                        <label className="cursor-pointer">
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onLogoChange} />
                            <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                                <Upload className="h-4 w-4" />
                                {t('settings.brand.logoUpload')}
                            </span>
                        </label>
                    </div>
                    <InputError message={form.errors.logo} />
                </div>

                <div className="flex items-center gap-4">
                    <Button disabled={form.processing}>{t('settings.brand.save')}</Button>
                    {form.recentlySuccessful && (
                        <p className="text-sm text-muted-foreground">{t('settings.brand.saved')}</p>
                    )}
                </div>
            </form>
        </>
    );
}

Brand.layout = {
    breadcrumbs: [
        {
            title: 'Marca',
            href: edit(),
        },
    ],
};
