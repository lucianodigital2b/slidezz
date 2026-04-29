import { router } from '@inertiajs/react';
import {
    Briefcase,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Heart,
    Loader2,
    ShoppingBag,
    Sparkles,
    TrendingUp,
    Tv2,
    Upload,
    Utensils,
    Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface FormData {
    workspace_name: string;
    industry: string;
    vibe: string;
    brand_color: string;
    logo: File | null;
    goal: string;
    target_audience: string;
    tone_of_voice: string;
}

// ─── Option data ─────────────────────────────────────────────────────────────

const industries = [
    { key: 'moda_beleza', label: 'Moda & Beleza', icon: Heart },
    { key: 'gastronomia', label: 'Gastronomia', icon: Utensils },
    { key: 'tecnologia', label: 'Tecnologia', icon: Zap },
    { key: 'fitness_saude', label: 'Fitness & Saúde', icon: TrendingUp },
    { key: 'educacao', label: 'Educação', icon: GraduationCap },
    { key: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
    { key: 'entretenimento', label: 'Entretenimento', icon: Tv2 },
    { key: 'negocios', label: 'Negócios', icon: Briefcase },
];

const vibes = [
    { key: 'profissional', label: 'Profissional', description: 'Sério, elegante e confiável' },
    { key: 'descontraido', label: 'Descontraído', description: 'Amigável, leve e próximo' },
    { key: 'inspirador', label: 'Inspirador', description: 'Motivador e cheio de energia' },
    { key: 'divertido', label: 'Divertido', description: 'Irreverente e cheio de humor' },
    { key: 'elegante', label: 'Elegante', description: 'Refinado, sofisticado e premium' },
    { key: 'minimalista', label: 'Minimalista', description: 'Limpo, direto e sem excessos' },
];

const goals = [
    { key: 'crescer_seguidores', label: 'Crescer seguidores' },
    { key: 'vender_produtos', label: 'Vender produtos/serviços' },
    { key: 'fortalecer_marca', label: 'Fortalecer minha marca' },
    { key: 'engajar_audiencia', label: 'Engajar minha audiência' },
    { key: 'gerar_leads', label: 'Gerar leads' },
];

const tones = [
    { key: 'formal', label: 'Formal' },
    { key: 'casual', label: 'Casual' },
    { key: 'empatico', label: 'Empático' },
    { key: 'engracado', label: 'Engraçado' },
    { key: 'motivacional', label: 'Motivacional' },
    { key: 'educativo', label: 'Educativo' },
];

const suggestedColors = [
    '#E8440A', '#3B82F6', '#8B5CF6', '#EC4899',
    '#10B981', '#F59E0B', '#EF4444', '#1D4ED8',
];

const TOTAL_STEPS = 6;

// ─── Shared sub-components ───────────────────────────────────────────────────

function OptionCard({
    selected,
    onClick,
    children,
    className = '',
}: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative rounded-xl border-2 p-4 text-left transition-all focus:outline-none ${
                selected
                    ? 'border-[#E8440A] bg-[#E8440A]/5 ring-1 ring-[#E8440A]/20'
                    : 'border-border bg-card hover:border-[#E8440A]/40'
            } ${className}`}
        >
            {selected && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E8440A]">
                    <Check className="h-3 w-3 text-white" />
                </span>
            )}
            {children}
        </button>
    );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                        i < current ? 'w-6 bg-[#E8440A]' : 'w-3 bg-border'
                    }`}
                />
            ))}
        </div>
    );
}

// ─── Steps 1–5 ───────────────────────────────────────────────────────────────

function Step1({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Sobre sua marca</h2>
                <p className="mt-1 text-muted-foreground">Como se chama sua página e em qual segmento você atua?</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="workspace_name">Nome da página ou marca</Label>
                <Input
                    id="workspace_name"
                    placeholder="Ex: Studio Joana, Tech Lovers, etc."
                    value={data.workspace_name}
                    onChange={(e) => set('workspace_name', e.target.value)}
                    className="h-11"
                />
            </div>

            <div className="space-y-3">
                <Label>Segmento</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {industries.map(({ key, label, icon: Icon }) => (
                        <OptionCard
                            key={key}
                            selected={data.industry === key}
                            onClick={() => set('industry', key)}
                            className="flex flex-col items-center gap-2 py-5 text-center"
                        >
                            <Icon className="h-6 w-6 text-[#E8440A]" />
                            <span className="text-xs font-medium leading-tight">{label}</span>
                        </OptionCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Step2({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Vibe & estilo</h2>
                <p className="mt-1 text-muted-foreground">Qual é a personalidade do seu conteúdo?</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {vibes.map(({ key, label, description }) => (
                    <OptionCard key={key} selected={data.vibe === key} onClick={() => set('vibe', key)}>
                        <p className="font-semibold">{label}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    </OptionCard>
                ))}
            </div>
        </div>
    );
}

function Step3({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Cores da marca</h2>
                <p className="mt-1 text-muted-foreground">Qual é a cor principal que representa sua marca?</p>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div
                        className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-border shadow-sm"
                        style={{ backgroundColor: data.brand_color }}
                    />
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="brand_color_input">Cor hexadecimal</Label>
                        <Input
                            id="brand_color_input"
                            value={data.brand_color}
                            onChange={(e) => set('brand_color', e.target.value)}
                            className="h-10 font-mono"
                            maxLength={7}
                            placeholder="#E8440A"
                        />
                    </div>
                    <input
                        type="color"
                        value={data.brand_color}
                        onChange={(e) => set('brand_color', e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-lg border border-border p-0.5"
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ou escolha uma sugestão:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedColors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => set('brand_color', color)}
                                className={`h-9 w-9 rounded-lg border-2 transition-transform hover:scale-110 ${
                                    data.brand_color === color ? 'scale-110 border-foreground' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Step4({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = (file: File | null) => {
        if (!file) return;
        set('logo', file);
        setPreview(URL.createObjectURL(file));
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Seu logo</h2>
                <p className="mt-1 text-muted-foreground">
                    Opcional — usamos no cabeçalho dos seus slideshows e artes.
                </p>
            </div>
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
                className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border p-10 transition-colors hover:border-[#E8440A]/50 hover:bg-[#E8440A]/5"
            >
                {preview ? (
                    <img src={preview} alt="Logo preview" className="h-24 w-24 rounded-xl object-contain" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
                <div className="text-center">
                    <p className="text-sm font-medium">{preview ? 'Clique para trocar' : 'Clique ou arraste seu logo'}</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou SVG · máx 2 MB</p>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
            </div>
            {preview && (
                <button
                    type="button"
                    className="text-sm text-muted-foreground underline underline-offset-2"
                    onClick={() => { setPreview(null); set('logo', null); }}
                >
                    Remover logo
                </button>
            )}
        </div>
    );
}

function Step5({ data, set }: { data: FormData; set: (k: keyof FormData, v: any) => void }) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Público & tom</h2>
                <p className="mt-1 text-muted-foreground">
                    Essas informações guiam a IA na criação dos seus roteiros e legendas.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="target_audience">Quem é seu público-alvo?</Label>
                <Textarea
                    id="target_audience"
                    placeholder="Ex: Mulheres de 25 a 40 anos que buscam saúde e bem-estar, moram nas grandes cidades e usam TikTok para se inspirar."
                    value={data.target_audience}
                    onChange={(e) => set('target_audience', e.target.value)}
                    rows={3}
                />
            </div>
            <div className="space-y-3">
                <Label>Tom de voz</Label>
                <div className="flex flex-wrap gap-2">
                    {tones.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => set('tone_of_voice', key)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                                data.tone_of_voice === key
                                    ? 'border-[#E8440A] bg-[#E8440A] text-white'
                                    : 'border-border bg-card hover:border-[#E8440A]/50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <Label>Objetivo principal</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {goals.map(({ key, label }) => (
                        <OptionCard key={key} selected={data.goal === key} onClick={() => set('goal', key)}>
                            <p className="text-sm font-medium">{label}</p>
                        </OptionCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Step6Plans({
    plans,
    onSubscribe,
    subscribingTo,
}: {
    plans: Record<string, Plan>;
    onSubscribe: (key: string) => void;
    subscribingTo: string | null;
}) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Escolha seu plano</h2>
                <p className="mt-1 text-muted-foreground">
                    14 dias grátis. Sem cobrança agora. Cancele a qualquer momento.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(plans).map(([key, plan]) => (
                    <div
                        key={key}
                        className="flex flex-col rounded-2xl border border-border bg-card p-5 space-y-4"
                    >
                        <div>
                            <p className="font-bold text-lg">{plan.name}</p>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                            <p className="mt-2 text-2xl font-bold tracking-tight">{plan.price_label}</p>
                            <p className="text-xs text-muted-foreground">após 14 dias grátis</p>
                        </div>

                        <ul className="flex-1 space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Button
                            className="mt-auto w-full gap-2 bg-[#E8440A] hover:bg-[#D13D09] text-white disabled:opacity-60"
                            disabled={subscribingTo !== null || !plan.price_id}
                            onClick={() => onSubscribe(key)}
                        >
                            {subscribingTo === key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            Começar {plan.name} grátis
                        </Button>
                    </div>
                ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                Ao assinar, você concorda com nossos termos de uso. Você pode cancelar antes do término do período gratuito sem nenhum custo.
            </p>
        </div>
    );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep(step: number, data: FormData): string | null {
    if (step === 1) {
        if (!data.workspace_name.trim()) return 'Informe o nome da sua marca.';
        if (!data.industry) return 'Selecione um segmento.';
    }
    if (step === 2 && !data.vibe) return 'Escolha a vibe do seu conteúdo.';
    if (step === 3 && !data.brand_color.match(/^#[0-9A-Fa-f]{6}$/)) return 'Informe uma cor hexadecimal válida.';
    if (step === 5) {
        if (!data.target_audience.trim()) return 'Descreva seu público-alvo.';
        if (!data.tone_of_voice) return 'Selecione o tom de voz.';
        if (!data.goal) return 'Selecione seu objetivo principal.';
    }
    return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding({ has_profile, plans }: Props) {
    const [step, setStep] = useState(has_profile ? 6 : 1);
    const [saving, setSaving] = useState(false);
    const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FormData>({
        workspace_name: '',
        industry: '',
        vibe: '',
        brand_color: '#E8440A',
        logo: null,
        goal: '',
        target_audience: '',
        tone_of_voice: '',
    });

    const set = (key: keyof FormData, value: any) => {
        setData((prev) => ({ ...prev, [key]: value }));
        setError(null);
    };

    const next = () => {
        const err = validateStep(step, data);
        if (err) { setError(err); return; }
        setError(null);
        if (step === 5) {
            saveProfileAndAdvance();
        } else {
            setStep((s) => Math.min(s + 1, TOTAL_STEPS));
        }
    };

    const back = () => {
        setError(null);
        setStep((s) => Math.max(s - 1, 1));
    };

    const saveProfileAndAdvance = () => {
        const form = new FormData();
        form.append('workspace_name', data.workspace_name);
        form.append('industry', data.industry);
        form.append('vibe', data.vibe);
        form.append('brand_color', data.brand_color);
        if (data.logo) form.append('logo', data.logo);
        form.append('goal', data.goal);
        form.append('target_audience', data.target_audience);
        form.append('tone_of_voice', data.tone_of_voice);

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
        6: <Step6Plans plans={plans} onSubscribe={subscribeToPlan} subscribingTo={subscribingTo} />,
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8440A]">
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold">Slidezz</span>
                </div>
                <StepIndicator current={step} total={TOTAL_STEPS} />
                <span className="tabular-nums text-xs text-muted-foreground">{step}/{TOTAL_STEPS}</span>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-start justify-center px-4 py-12">
                <div className="w-full max-w-xl space-y-8">
                    {stepComponents[step]}

                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                    {!isOnPlansStep && (
                        <div className="flex items-center justify-between pt-2">
                            {step > 1 ? (
                                <Button variant="ghost" onClick={back} disabled={saving} className="gap-1.5">
                                    <ChevronLeft className="h-4 w-4" />
                                    Voltar
                                </Button>
                            ) : (
                                <span />
                            )}

                            <Button
                                onClick={next}
                                disabled={saving}
                                className="gap-1.5 bg-[#E8440A] hover:bg-[#D13D09] text-white"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {step === 5 ? 'Ver planos' : 'Continuar'}
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {isOnPlansStep && !has_profile && (
                        <div className="flex justify-start pt-2">
                            <Button variant="ghost" onClick={back} disabled={subscribingTo !== null} className="gap-1.5">
                                <ChevronLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
