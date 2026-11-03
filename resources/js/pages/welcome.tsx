import { Head, Link, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Play,
    Sparkles,
    ToggleRight,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

// ─── Data ────────────────────────────────────────────────────────────────────

const slides = [
    {
        src: '/landing/s2.webp',
        hook: '5 hábitos matinais que mudaram minha vida',
    },
    {
        src: '/landing/s3.webp',
        hook: 'treinos que eu faria se começasse de novo',
    },
    {
        src: '/landing/s4.webp',
        hook: 'os únicos 3 produtos de skincare que você precisa',
    },
    {
        src: '/landing/s5.webp',
        hook: 'coisas que ninguém te conta sobre morar em cidade grande',
    },
    { src: '/landing/s6.webp', hook: 'sinais de que ele está a fim de você' },
    {
        src: '/landing/s7.webp',
        hook: 'cafés da manhã proteicos em menos de 5 minutos',
    },
    {
        src: '/landing/s8.webp',
        hook: 'como finalmente deixei meus cachos crescerem',
    },
    {
        src: '/landing/s9.webp',
        hook: 'hacks de viagem que eu queria saber antes',
    },
    {
        src: '/landing/s10.webp',
        hook: 'jantares que faço quando estou cansado demais para cozinhar',
    },
    { src: '/landing/s11.webp', hook: 'poses para fotos que sempre funcionam' },
    { src: '/landing/s12.webp', hook: 'o que eu como em um dia (realista)' },
];

const lifetimeFeatures = [
    'Carrosséis ilimitados, pra sempre',
    '100 imagens com IA inclusas (ou ilimitadas com sua chave Gemini)',
    'Todos os templates + atualizações futuras',
    'Postagem automática no TikTok e Instagram quando lançar',
];

const faqs = [
    {
        q: 'Preciso saber design?',
        a: 'Não. A IA faz tudo. Você só digita o tema e o carrossel sai pronto, texto, layout e design profissional.',
    },
    {
        q: 'Funciona pra qualquer nicho?',
        a: 'Sim. Marketing digital, fitness, gastronomia, educação, moda, coaching, finanças, a IA se adapta ao seu nicho e tom de voz.',
    },
    {
        q: 'Posso cancelar quando quiser?',
        a: 'Sim. Sem multa, sem fidelidade. Cancele direto no painel em 2 cliques.',
    },
    {
        q: 'A IA também gera os textos?',
        a: 'Sim! Títulos, subtítulos, textos persuasivos e CTAs, tudo gerado automaticamente e otimizado pra engajamento.',
    },
    {
        q: 'Quantos carrosséis posso criar?',
        a: 'Carrosséis são ilimitados em todos os planos, sem cota, sem crédito, sem pegadinha. As imagens geradas por IA usam a sua própria chave do Google Gemini, então também não têm limite do nosso lado.',
    },
    {
        q: 'Como funcionam as imagens geradas por IA?',
        a: 'Você conecta a sua própria chave do Google Gemini (leva 2 minutos e o Google oferece um nível gratuito). As imagens são geradas direto na sua conta Google, sem custo extra do Slidezz e sem limite de créditos.',
    },
    {
        q: 'Funciona no celular?',
        a: 'Funciona no navegador em qualquer dispositivo, computador, tablet ou celular. Sem instalar nada.',
    },
];

const comparisonItems = [
    { label: 'Canva Pro (design)', price: 'R$34,90/mês' },
    { label: 'ChatGPT Plus (textos e ideias)', price: 'R$110,00/mês' },
    { label: 'Google Gemini (imagem IA)', price: 'R$97,00/mês' },
    { label: 'Adobe Photoshop (editor)', price: 'R$115,00/mês' },
    { label: 'Designer freelancer (layouts)', price: 'R$1.500,00/mês' },
    { label: 'Copywriter freelancer (roteiros)', price: 'R$800,00/mês' },
];

const totalComparison = 'R$2.656,90/mês';

// ─── Icons ────────────────────────────────────────────────────────────────────

function TikTokMark({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 1 1-2.31-2.84v-3.5a6.37 6.37 0 1 0 5.76 6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.69Z" />
        </svg>
    );
}

function InstagramMark({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    );
}

// ─── Reveal animation ────────────────────────────────────────────────────────

function Reveal({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;

        if (!el) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
        );
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={cn('reveal', visible && 'is-visible', className)}
        >
            {children}
        </div>
    );
}

// ─── Hero pieces ─────────────────────────────────────────────────────────────

function SlideCard({
    src,
    hook,
    loading,
}: {
    src: string;
    hook: string;
    loading?: 'lazy' | 'eager';
}) {
    return (
        <div className="group flex w-40 flex-col overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none md:w-44">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] bg-[#111114]">
                <img
                    src={src}
                    alt=""
                    loading={loading}
                    width={480}
                    height={640}
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 flex gap-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <span
                            key={i}
                            className={cn(
                                'h-1 w-1 rounded-full',
                                i === 0 ? 'bg-[#FAFAFA]' : 'bg-[#FAFAFA]/40',
                            )}
                        />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-2 px-1 pt-3 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7C5CFF]">
                    <AppLogoIcon className="h-3 w-3 text-white" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[13px] leading-tight font-semibold text-[#FAFAFA]">
                        {hook}
                    </p>
                    <p className="truncate text-[11px] text-[#A1A1AA]">
                        Slidezz
                    </p>
                </div>
            </div>
        </div>
    );
}

function SlideArc() {
    const centerIndex = 5;

    return (
        <div className="mt-12">
            {/* Mobile horizontal scroller */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
                {slides.map((slide, i) => (
                    <div key={slide.src} className="shrink-0 snap-center">
                        <SlideCard
                            src={slide.src}
                            hook={slide.hook}
                            loading={
                                Math.abs(i - centerIndex) <= 2
                                    ? 'eager'
                                    : 'lazy'
                            }
                        />
                    </div>
                ))}
            </div>

            {/* Desktop arc */}
            <div className="relative left-1/2 hidden h-[460px] w-screen -translate-x-1/2 overflow-hidden md:block">
                {slides.map((slide, i) => {
                    const distance = i - centerIndex;
                    const x = distance * 160;
                    const y = distance * distance * 9;
                    const rotation = distance * 5;

                    return (
                        <div
                            key={slide.src}
                            className="absolute top-4 left-1/2"
                            style={{
                                transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotation}deg)`,
                                zIndex: 20 - Math.abs(distance),
                            }}
                        >
                            <SlideCard
                                src={slide.src}
                                hook={slide.hook}
                                loading={
                                    Math.abs(distance) <= 2 ? 'eager' : 'lazy'
                                }
                            />
                        </div>
                    );
                })}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[#08080A] to-transparent" />
            </div>
        </div>
    );
}

// ─── How it works mocks ──────────────────────────────────────────────────────

function StepOneVisual() {
    return (
        <div className="space-y-2 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-4 text-left">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#FAFAFA]">
                    Formato
                </span>
                <span className="rounded-full bg-[#111114] px-2 py-1 text-xs font-medium text-[#A1A1AA]">
                    Carrossel de listas
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#FAFAFA]">
                    Nicho
                </span>
                <span className="rounded-full bg-[#111114] px-2 py-1 text-xs font-medium text-[#A1A1AA]">
                    Fitness
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#FAFAFA]">
                    Posts por dia
                </span>
                <span className="rounded-full bg-[#111114] px-2 py-1 text-xs font-medium text-[#A1A1AA]">
                    2
                </span>
            </div>
            <div className="flex gap-2">
                <span className="rounded-full bg-[#111114] px-3 py-1 text-xs font-medium text-[#A1A1AA]">
                    15:00
                </span>
                <span className="rounded-full bg-[#111114] px-3 py-1 text-xs font-medium text-[#A1A1AA]">
                    18:00
                </span>
            </div>
            <button
                type="button"
                className="w-full rounded-full bg-[#7C5CFF] py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#6D4AE6]"
            >
                Salvar automação
            </button>
        </div>
    );
}

function StepTwoVisual() {
    return (
        <div className="space-y-3 text-left">
            <div className="flex items-center justify-between rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-3">
                <div className="flex items-center gap-2">
                    <TikTokMark className="h-4 w-4 text-[#A1A1AA]" />
                    <span className="text-xs font-semibold text-[#FAFAFA]">
                        @suamarca
                    </span>
                </div>
                <span className="rounded-full bg-[#7C5CFF] px-2 py-1 text-[10px] font-semibold text-white">
                    Conectado
                </span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-3">
                <div className="flex items-center gap-2">
                    <InstagramMark className="h-4 w-4 text-[#A1A1AA]" />
                    <span className="text-xs font-semibold text-[#FAFAFA]">
                        @suamarca
                    </span>
                </div>
                <span className="rounded-full bg-[#7C5CFF] px-2 py-1 text-[10px] font-semibold text-white">
                    Conectado
                </span>
            </div>
            <div className="flex items-center justify-between rounded-[16px] border border-dashed border-[rgba(255,255,255,0.2)] px-3 py-2 text-[11px] font-medium text-[#FAFAFA]">
                <span>Postagem automática</span>
                <span className="font-semibold">Em breve</span>
            </div>
        </div>
    );
}

function StepThreeVisual() {
    const thumbs = [
        { src: '/landing/s2.webp', badge: 'Pronto' },
        { src: '/landing/s3.webp', badge: 'Pronto' },
        { src: '/landing/s7.webp', badge: 'Pronto' },
        { src: '/landing/s10.webp', badge: 'Baixado' },
        { src: '/landing/s11.webp', badge: 'Baixado' },
        { src: '/landing/s12.webp', badge: 'Baixado' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2">
            {thumbs.map((thumb) => (
                <div
                    key={thumb.src}
                    className="relative overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.08)]"
                >
                    <img
                        src={thumb.src}
                        alt=""
                        width={160}
                        height={213}
                        className="aspect-square w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {thumb.badge}
                    </span>
                </div>
            ))}
        </div>
    );
}

const steps = [
    {
        title: 'Descreva seu conteúdo',
        text: 'Digite o tema, o nicho e o tom de voz. Pode ser uma frase simples como "5 dicas de marketing digital."',
        Visual: StepOneVisual,
    },
    {
        title: 'A IA cria tudo',
        text: 'Em segundos, a IA gera o texto persuasivo, escolhe o layout perfeito e monta o carrossel completo.',
        Visual: StepTwoVisual,
    },
    {
        title: 'Publique e viralize',
        text: 'Baixe em PNG Full HD ou vídeo MP4 e poste pelo app. A postagem automática no TikTok e no Instagram chega em breve.',
        Visual: StepThreeVisual,
    },
];

function StepCard({
    number,
    title,
    body,
    children,
}: {
    number: string;
    title: string;
    body: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111114] p-6 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none">
            <span className="inline-flex items-center rounded-full bg-[#7C5CFF] px-3 py-1 text-xs font-semibold text-white">
                {number}
            </span>
            <h3 className="text-lg font-semibold text-[#FAFAFA]">{title}</h3>
            <p className="text-sm leading-6 text-[#A1A1AA]">{body}</p>
            <div className="mt-auto w-full">{children}</div>
        </div>
    );
}

// ─── Feature mocks ───────────────────────────────────────────────────────────

function AutomationsMock() {
    return (
        <div className="space-y-3">
            {['Dicas de fitness', 'Destaque de produto'].map((label) => (
                <div
                    key={label}
                    className="flex items-center justify-between rounded-full bg-[#111114] px-4 py-2.5"
                >
                    <span className="text-xs font-semibold text-[#FAFAFA]">
                        {label}
                    </span>
                    <ToggleRight className="h-5 w-5 text-[#7C5CFF]" />
                </div>
            ))}
        </div>
    );
}

function SchedulingMock() {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const chips = [[0, 2], [1], [0, 1, 3], [2], [0], [1, 2], [0, 3]];

    return (
        <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => (
                <div key={i} className="text-center">
                    <div className="text-xs font-bold text-[#A1A1AA]">
                        {day}
                    </div>
                    <div className="mt-1 space-y-1">
                        {chips[i].map((chip, j) => (
                            <div
                                key={j}
                                className={cn(
                                    'h-2 rounded-full',
                                    chip % 2 === 0
                                        ? 'bg-[#7C5CFF]'
                                        : 'bg-[#A1A1AA]/60',
                                )}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SlideshowEditorMock() {
    return (
        <div className="relative mx-auto aspect-[3/4] w-24 overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111114]">
            <img
                src="/landing/s8.webp"
                alt=""
                width={160}
                height={213}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute top-[22%] right-2 left-2">
                <div className="rounded border-2 border-dashed border-[#A78BFA] p-2">
                    <span className="block h-2 w-16 rounded bg-white/80" />
                    <span className="mt-1 block h-2 w-20 rounded bg-white/80" />
                </div>
                <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-[#A78BFA]" />
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#A78BFA]" />
                <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-[#A78BFA]" />
                <div className="absolute -right-1 -bottom-1 h-2 w-2 rounded-full bg-[#A78BFA]" />
            </div>
        </div>
    );
}

function AIHooksMock() {
    return (
        <div className="space-y-2">
            {[
                '5 hábitos matinais que mudaram minha vida',
                'treinos que eu faria se começasse de novo',
                'os únicos 3 produtos de skincare que você precisa',
            ].map((hook) => (
                <div
                    key={hook}
                    className="flex items-center gap-2 rounded-full bg-[#111114] px-3 py-2 text-xs font-semibold text-[#FAFAFA]"
                >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[#A78BFA]" />
                    <span className="truncate">{hook}</span>
                </div>
            ))}
        </div>
    );
}

function BulkMock() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 rounded-[16px] bg-[#111114] p-3">
                {['gancho 1', 'gancho 2', 'gancho 3'].map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#A1A1AA]/50" />
                        <span className="text-xs text-[#A1A1AA]">{line}</span>
                    </div>
                ))}
            </div>
            <span className="text-xs font-bold text-[#A1A1AA]">→</span>
            <div className="rounded-full bg-[#7C5CFF] px-3 py-2 text-xs font-semibold text-white">
                3 carrosséis
            </div>
        </div>
    );
}

function MultipleAccountsMock() {
    const accounts = [
        { initials: 'SM', handle: '@suamarca' },
        { initials: 'SA', handle: '@seuapp' },
        { initials: 'SL', handle: '@sualoja' },
    ];

    return (
        <div className="space-y-2">
            {accounts.map((account) => (
                <div
                    key={account.handle}
                    className="flex items-center gap-2 rounded-full bg-[#111114] px-3 py-1.5"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C5CFF] text-[10px] font-bold text-white">
                        {account.initials}
                    </span>
                    <span className="text-xs font-semibold text-[#FAFAFA]">
                        {account.handle}
                    </span>
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#A78BFA] ring-1 ring-[#A78BFA]/20" />
                </div>
            ))}
        </div>
    );
}

const features: {
    title: string;
    text: string;
    Visual: () => ReactNode;
    badge?: string;
}[] = [
    {
        title: 'Carrosséis gerados por IA',
        text: 'Você dá o tema e o tom; a IA monta os slides com layout coerente, prontos pra publicar. Sem começar do zero no Canva.',
        Visual: AutomationsMock,
        badge: 'novo',
    },
    {
        title: 'Texto e roteiro prontos',
        text: 'Títulos, ganchos e o texto dos slides sugeridos pela IA, sem pular pro ChatGPT em outra aba.',
        Visual: AIHooksMock,
    },
    {
        title: 'Editor visual simples',
        text: 'Ajuste cores, fontes e imagens no arrastar e soltar. Sem curva de aprendizado.',
        Visual: SlideshowEditorMock,
    },
    {
        title: 'Exportação em Full HD',
        text: 'Baixe em PNG a 1080px, o tamanho certo pro Instagram. Sem perder qualidade.',
        Visual: BulkMock,
    },
    {
        title: 'Conteúdo em minutos',
        text: 'Produza vários carrosséis numa sessão. Menos tempo no design, mais tempo vendendo.',
        Visual: SchedulingMock,
    },
    {
        title: 'Comunidade de criadores',
        text: 'Troque referências e ritmo de postagem com criadores que querem consistência, não postar no escuro.',
        Visual: MultipleAccountsMock,
    },
];

function FeatureCard({
    title,
    text,
    children,
    badge,
}: {
    title: string;
    text: string;
    children: ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex flex-col overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none sm:p-8">
            <div className="flex min-h-[200px] items-center justify-center rounded-[12px] bg-[#111114] p-6">
                <div className="w-full max-w-[280px]">{children}</div>
            </div>
            <div className="mt-6 px-1">
                {badge && (
                    <span className="mb-2 inline-flex rounded-full bg-[#7C5CFF] px-2 py-0.5 text-[12px] font-semibold text-white">
                        {badge}
                    </span>
                )}
                <h3 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                    {title}
                </h3>
                <p className="mt-2 text-[16px] leading-6 tracking-[-0.02em] text-[#A1A1AA]">
                    {text}
                </p>
            </div>
        </div>
    );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

const plans = [
    {
        name: 'Starter',
        monthly: 67,
        annual: 47,
        features: [
            'Carrosséis ilimitados',
            'Imagens ilimitadas com sua chave Gemini',
            'Copy e hooks com IA',
            'Todos os templates',
        ],
        buttonClass:
            'bg-[#111114] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)] hover:bg-[#16161B]',
        badge: null,
        highlighted: false,
    },
    {
        name: 'Pro',
        monthly: 127,
        annual: 87,
        features: [
            'Tudo no Starter',
            'Suporte prioritário',
            'Salvar seus templates',
            'Acesso antecipado a novidades',
        ],
        buttonClass: 'bg-[#7C5CFF] text-white hover:bg-[#6D4AE6]',
        badge: 'Recomendado',
        highlighted: true,
    },
    {
        name: 'Agency',
        monthly: 247,
        annual: 177,
        features: [
            'Tudo no Pro',
            'Múltiplos projetos',
            'Gestão de equipe',
            'Suporte dedicado',
        ],
        buttonClass:
            'bg-[#111114] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)] hover:bg-[#16161B]',
        badge: null,
        highlighted: false,
    },
];

function PricingCard({
    name,
    price,
    struckPrice,
    billingCycle,
    features,
    href,
    buttonClass,
    badge,
    highlighted,
}: {
    name: string;
    price: number;
    struckPrice?: number | null;
    billingCycle: 'monthly' | 'annual';
    features: string[];
    href: ComponentProps<typeof Link>['href'];
    buttonClass: string;
    badge?: string | null;
    highlighted?: boolean;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-[16px] p-8',
                highlighted
                    ? 'border-2 border-[#7C5CFF] bg-[#16161B] shadow-[0_0_30px_rgba(124,92,255,0.2)]'
                    : 'border border-[rgba(255,255,255,0.08)] bg-[#111114]',
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                    {name}
                </h3>
                {badge && (
                    <span className="rounded-full bg-[#7C5CFF] px-3 py-1 text-xs font-semibold text-white">
                        {badge}
                    </span>
                )}
            </div>
            <div className="mt-6">
                {struckPrice && (
                    <div className="text-sm text-[#A1A1AA] line-through">
                        R${struckPrice}/mês
                    </div>
                )}
                <div className="flex items-baseline gap-1">
                    <span className="font-landing-display text-5xl font-extrabold tracking-[-0.04em] text-[#FAFAFA]">
                        R${price}
                    </span>
                    <span className="text-sm font-medium text-[#A1A1AA]">
                        por mês
                    </span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#A1A1AA]">
                    {billingCycle === 'annual'
                        ? 'cobrado anualmente'
                        : 'cobrado mensalmente'}
                </p>
            </div>
            <Link
                href={href}
                className={cn(
                    'mt-6 flex h-12 w-full items-center justify-center rounded-[12px] text-[16px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50',
                    buttonClass,
                )}
            >
                Testar agora
            </Link>
            <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-[#A1A1AA]"
                    >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#A1A1AA]" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── FAQ item ────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-[rgba(255,255,255,0.08)]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50 focus-visible:ring-inset"
            >
                <span className="text-[18px] font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-[20px]">
                    {q}
                </span>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#111114]">
                    <ChevronDown
                        className={cn(
                            'h-5 w-5 text-[#A78BFA] transition-transform duration-300',
                            open && 'rotate-180',
                        )}
                    />
                </span>
            </button>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
                    <p className="pb-6 text-[16px] leading-6 tracking-[-0.02em] text-[#A1A1AA]">
                        {a}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[#08080A] pb-16">
            <div className="mx-auto max-w-[1320px] px-4 pt-16 pb-12 sm:px-6">
                <div className="grid gap-10 md:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C5CFF]">
                                <AppLogoIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-landing-display text-xl font-bold tracking-[-0.03em] text-[#FAFAFA]">
                                Slidezz
                            </span>
                        </div>
                        <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[#A1A1AA]">
                            Crie slideshows do TikTok e carrosséis do
                            Instagram que trazem tráfego para o seu negócio.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[14px] font-semibold text-[#A1A1AA]">
                            Produto
                        </h4>
                        <ul className="mt-4 space-y-3 text-[14px]">
                            <li>
                                <a
                                    href="#como-funciona"
                                    className="text-[#FAFAFA] hover:text-[#A78BFA]"
                                >
                                    Como funciona
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#pricing"
                                    className="text-[#FAFAFA] hover:text-[#A78BFA]"
                                >
                                    Preços
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#faq"
                                    className="text-[#FAFAFA] hover:text-[#A78BFA]"
                                >
                                    FAQ
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-[14px] font-semibold text-[#A1A1AA]">
                            Legal
                        </h4>
                        <ul className="mt-4 space-y-3 text-[14px]">
                            <li>
                                <Link
                                    href="/privacy-policy"
                                    className="text-[#FAFAFA] hover:text-[#A78BFA]"
                                >
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-[#FAFAFA] hover:text-[#A78BFA]"
                                >
                                    Termos de Uso
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-[14px] text-[#A1A1AA]">
                        © {year} Slidezz. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-4 text-[#FAFAFA]">
                        <TikTokMark className="h-5 w-5" />
                        <InstagramMark className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const sectionTag =
    'inline-flex rounded-full bg-[#111114] px-3 py-1 text-[14px] font-medium text-[#A1A1AA]';
const sectionTitle =
    'mt-5 max-w-4xl font-landing-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-[#FAFAFA]';
const primaryButton =
    'inline-flex h-12 items-center justify-center rounded-[12px] bg-[#7C5CFF] px-8 text-[18px] font-semibold text-white transition duration-200 hover:bg-[#6D4AE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props as any;
    const ctaHref = auth.user
        ? dashboard()
        : canRegister
          ? register()
          : login();

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
        'annual',
    );
    const scrolled = useScrolled();

    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollGallery = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = 320;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <>
            <Head title="Slidezz: um mês de carrosséis pro TikTok e Instagram em 30 minutos">
                <meta
                    name="description"
                    content="A IA escreve, desenha e gera as imagens dos seus carrosséis e slideshows. Você baixa pronto pra postar no TikTok e no Instagram, em PNG ou MP4."
                />
            </Head>

            <style>{`
                .reveal {
                    opacity: 0;
                    transform: translateY(16px);
                    transition: opacity 0.6s ease, transform 0.6s ease;
                }
                .reveal.is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .dotted-grid {
                    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
                .pulse-glow {
                    animation: pulse-glow 4s ease-in-out infinite;
                }
                @keyframes flow-dash {
                    to { stroke-dashoffset: -100; }
                }
                .animated-path {
                    stroke-dasharray: 8 4;
                    animation: flow-dash 2s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .reveal {
                        opacity: 1;
                        transform: none;
                        transition: none;
                    }
                    .pulse-glow {
                        animation: none;
                    }
                    .animated-path {
                        animation: none;
                    }
                }
            `}</style>

            <div className="min-h-screen overflow-x-clip bg-[#08080A] font-landing text-[#FAFAFA]">
                {/* ── NAV ── */}
                <header
                    className={cn(
                        'sticky top-0 z-50 transition-colors duration-200',
                        scrolled
                            ? 'border-b border-[rgba(255,255,255,0.08)] bg-[#08080A]/85 backdrop-blur-md'
                            : 'bg-transparent',
                    )}
                >
                    <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-4 sm:h-[88px] sm:px-6">
                        <div className="flex items-center gap-10">
                            <Link
                                href="/"
                                className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C5CFF]">
                                    <AppLogoIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-landing-display text-[22px] font-bold tracking-[-0.03em] text-[#FAFAFA]">
                                    Slidezz
                                </span>
                            </Link>

                            <nav className="hidden items-center gap-8 md:flex">
                                {[
                                    ['#como-funciona', 'Como funciona'],
                                    ['#exemplos', 'Exemplos'],
                                    ['#pricing', 'Preços'],
                                    ['#faq', 'FAQ'],
                                ].map(([href, label]) => (
                                    <a
                                        key={href}
                                        href={href}
                                        className="text-[15px] font-semibold text-[#FAFAFA] transition-colors hover:text-[#A1A1AA]"
                                    >
                                        {label}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-5">
                            {!auth.user && (
                                <Link
                                    href={login()}
                                    className="hidden text-[15px] font-semibold text-[#FAFAFA] transition-colors hover:text-[#A1A1AA] sm:inline-flex"
                                >
                                    Entrar
                                </Link>
                            )}
                            <Link
                                href={auth.user ? dashboard() : ctaHref}
                                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#7C5CFF] px-5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#6D4AE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50 sm:h-[52px] sm:px-6 sm:text-[17px]"
                            >
                                {auth.user
                                    ? 'Ir para o app'
                                    : 'Parar de perder tempo'}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,255,0.25),transparent)]" />
                    <div className="dotted-grid absolute inset-0 opacity-20" />
                    <div className="relative mx-auto max-w-[1320px] px-4 pt-16 pb-8 text-center sm:px-6 sm:pt-28">
                        <Reveal>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111114] px-4 py-1.5 text-[13px] text-[#FAFAFA] sm:text-[14px]">
                                <span className="text-[#A78BFA]">●</span>
                                <span className="font-semibold">
                                    Novo · gere carrosséis em 1 minuto
                                </span>
                            </div>
                        </Reveal>

                        <Reveal>
                            <h1 className="mx-auto mt-8 font-landing-display text-[clamp(2.75rem,9vw,8.75rem)] leading-[0.9] font-extrabold tracking-[-0.045em] text-balance text-[#FAFAFA] sm:max-w-[14ch]">
                                Um mês de carrosséis pro TikTok e Instagram{' '}
                                <span className="bg-gradient-to-r from-[#A78BFA] to-[#71717A] bg-clip-text text-transparent">
                                    em 30 minutos
                                </span>
                            </h1>
                        </Reveal>

                        <Reveal>
                            <p className="mx-auto mt-8 max-w-xl text-[18px] leading-relaxed tracking-[-0.02em] text-[#A1A1AA] sm:text-[20px]">
                                A IA escreve, desenha e gera as imagens. Você
                                baixa pronto pra postar no TikTok e no
                                Instagram, em PNG ou vídeo MP4.
                            </p>
                        </Reveal>

                        <Reveal>
                            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link href={ctaHref} className={primaryButton}>
                                    Criar minha máquina de conteúdo
                                </Link>
                                <a
                                    href="#exemplos"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.08)] px-8 text-[18px] font-semibold text-[#FAFAFA] transition-colors duration-200 hover:bg-[#111114] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50"
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Ver exemplos
                                </a>
                            </div>
                        </Reveal>

                        <div className="relative mt-12 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#111114] p-4">
                            <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-[#111114]" />
                            <div className="dotted-grid absolute inset-0 opacity-20" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C5CFF] to-transparent" />
                            <div className="relative">
                                <SlideArc />
                            </div>
                        </div>

                        <div className="relative mt-10">
                            <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(255,255,255,0.08)]" />
                            <div className="relative mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#08080A] px-4 text-[13px] text-[#A1A1AA]">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#FAFAFA]">
                                    Pronto pro
                                    <TikTokMark className="h-4 w-4" />
                                    <InstagramMark className="h-4 w-4" />
                                </span>
                                <span>· Economia de milhares em UGC</span>
                                <span>
                                    · Cole o link de um viral e a IA recria pro
                                    seu nicho
                                </span>
                                <span>
                                    · Sem briefing, sem aprovação, sem atraso
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── TRANSFORMATION STRIP ── */}
                <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 sm:py-16">
                    <div className="mb-10 text-center">
                        <Reveal>
                            <span className={sectionTag}>Como funciona</span>
                            <h2 className={sectionTitle}>
                                De uma ideia simples a um carrossel completo
                            </h2>
                        </Reveal>
                    </div>
                    <Reveal>
                        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
                            {/* Input mock */}
                            <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#111114] p-6 md:flex-1">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-[#71717A]" />
                                    <div className="h-3 w-3 rounded-full bg-[#71717A]" />
                                    <div className="h-3 w-3 rounded-full bg-[#71717A]" />
                                </div>
                                <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#16161B] p-4">
                                    <p className="text-sm text-[#A1A1AA]">
                                        Digite seu tema...
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-[#FAFAFA]">
                                        5 erros de quem tem cabelo oleoso
                                    </p>
                                </div>
                            </div>
                            {/* Arrow */}
                            <div className="flex items-center justify-center text-4xl text-[#A78BFA] md:self-center">
                                →
                            </div>
                            {/* Carousel preview */}
                            <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#111114] p-6 md:flex-1">
                                <div className="flex space-x-4 overflow-hidden">
                                    {slides.slice(0, 4).map((slide, i) => (
                                        <div key={i} className="w-32 shrink-0">
                                            <SlideCard
                                                src={slide.src}
                                                hook={slide.hook}
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </section>

                {/* ── PROBLEMA ── */}
                <section className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32">
                    <Reveal className="mx-auto max-w-4xl text-center">
                        <p className="mb-4 font-bold tracking-widest text-[#A1A1AA] uppercase">
                            A verdade que ninguém te conta
                        </p>
                        <h2 className="mb-8 font-landing-display text-5xl leading-[0.95] tracking-normal text-white lg:text-7xl">
                            A verdade brutal sobre o Instagram em 2026
                        </h2>
                        <div className="mx-auto max-w-2xl space-y-5 text-left">
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                O próprio{' '}
                                <strong className="text-white">
                                    CEO do Instagram
                                </strong>{' '}
                                confirmou: o algoritmo prioriza carrosséis acima
                                de qualquer outro formato. Quem não posta
                                carrossel{' '}
                                <strong className="text-white">
                                    simplesmente não aparece.
                                </strong>
                            </p>
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                Enquanto você gasta{' '}
                                <strong className="text-white">
                                    2–3 horas no Canva
                                </strong>{' '}
                                tentando montar um post bonito, seus
                                concorrentes usam IA pra criar 10 carrosséis
                                virais no tempo em que você faz 1.
                            </p>
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                A diferença entre quem vende no Instagram e quem
                                só posta imagem bonita?{' '}
                                <strong className="text-white">
                                    Velocidade + Consistência.
                                </strong>{' '}
                                E é exatamente isso que o Slidezz entrega.
                            </p>
                        </div>
                        <div className="mt-10 flex justify-center">
                            <Link
                                href={ctaHref}
                                className="inline-flex h-12 items-center justify-center rounded-[12px] bg-[#7C5CFF] px-8 text-[18px] font-semibold text-white transition duration-200 hover:bg-[#6D4AE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/50"
                            >
                                Quero parar de perder tempo
                            </Link>
                        </div>
                    </Reveal>
                </section>

                {/* ── COMO FUNCIONA ── */}
                <section
                    id="como-funciona"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <Reveal>
                        <span className={sectionTag}>Em 3 passos</span>
                        <h2 className={sectionTitle}>
                            Tão simples que parece mágica
                        </h2>
                    </Reveal>
                    <div className="mt-12 grid gap-4 md:grid-cols-3 md:divide-x md:divide-[rgba(255,255,255,0.08)]">
                        {steps.map((step, i) => (
                            <Reveal
                                key={step.title}
                                className="md:px-6 first:md:pl-0 last:md:pr-0"
                            >
                                <StepCard
                                    number={`0${i + 1}`}
                                    title={step.title}
                                    body={step.text}
                                >
                                    <step.Visual />
                                </StepCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ── TOOLS HUB ── */}
                <section className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32">
                    <Reveal>
                        <span className={sectionTag}>Tools hub</span>
                        <h2 className={sectionTitle}>
                            Suas ferramentas entram, um carrossel pronto sai
                        </h2>
                    </Reveal>
                    <div className="relative mt-12 overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#111114] p-8">
                        <div className="dotted-grid absolute inset-0 opacity-10" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C5CFF] to-transparent" />
                        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
                            {/* Left chips */}
                            <div className="space-y-4">
                                {[
                                    'Tema',
                                    'Marca e cores',
                                    'Referências',
                                    'Tom de voz',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center justify-end"
                                    >
                                        <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#16161B] px-4 py-2 text-sm font-medium text-[#FAFAFA]">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Center node */}
                            <div className="flex justify-center">
                                <div className="pulse-glow relative flex h-24 w-24 items-center justify-center rounded-full bg-[#7C5CFF] shadow-[0_0_40px_rgba(124,92,255,0.5)]">
                                    <AppLogoIcon className="h-10 w-10 text-white" />
                                </div>
                            </div>

                            {/* Right chips */}
                            <div className="space-y-4">
                                {[
                                    'Carrossel pronto',
                                    'Legendas',
                                    'Vídeo MP4',
                                    'Instagram + TikTok',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center"
                                    >
                                        <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#16161B] px-4 py-2 text-sm font-medium text-[#FAFAFA]">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SVG connecting lines */}
                        <svg
                            className="pointer-events-none absolute inset-0 h-full w-full"
                            viewBox="0 0 1000 400"
                            preserveAspectRatio="none"
                        >
                            {/* Left to center */}
                            <path
                                d="M250,100 C350,100 400,200 500,200"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                            <path
                                d="M250,200 C350,200 400,200 500,200"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                            <path
                                d="M250,300 C350,300 400,200 500,200"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                            {/* Center to right */}
                            <path
                                d="M500,200 C600,200 650,100 750,100"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                            <path
                                d="M500,200 C600,200 650,200 750,200"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                            <path
                                d="M500,200 C600,200 650,300 750,300"
                                fill="none"
                                stroke="#7C5CFF"
                                strokeWidth="2"
                                className="animated-path"
                            />
                        </svg>
                    </div>
                </section>

                {/* ── GALLERY ── */}
                <section
                    id="exemplos"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <Reveal>
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <span className={sectionTag}>Exemplos</span>
                                <h2 className={sectionTitle}>
                                    Carrosséis feitos com Slidezz
                                </h2>
                            </div>
                            <div className="hidden gap-2 sm:flex">
                                <button
                                    onClick={() => scrollGallery('left')}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[#FAFAFA] hover:bg-[#111114]"
                                    aria-label="Rolar para a esquerda"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => scrollGallery('right')}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[#FAFAFA] hover:bg-[#111114]"
                                    aria-label="Rolar para a direita"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </Reveal>
                    <div
                        ref={scrollRef}
                        className="mt-12 flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {[
                            {
                                niche: 'Beleza',
                                idea: '5 erros de quem tem cabelo oleoso',
                            },
                            {
                                niche: 'Finanças',
                                idea: 'Como economizar seus primeiros R$10 mil',
                            },
                            {
                                niche: 'Fitness',
                                idea: '5 treinos matinais que realmente funcionam',
                            },
                            {
                                niche: 'Viagem',
                                idea: 'Lugares escondidos na Europa por menos de R$200',
                            },
                            {
                                niche: 'Comida',
                                idea: 'Jantares ricos em proteína em 15 min',
                            },
                            {
                                niche: 'Lifestyle',
                                idea: 'Coisas que ninguém te conta sobre morar fora',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="w-64 shrink-0 overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111114]"
                            >
                                <div className="relative aspect-[4/5] bg-gradient-to-br from-[#A78BFA]/30 via-[#7C5CFF]/20 to-[#111114]">
                                    <div className="absolute top-3 left-3 rounded-full bg-[#7C5CFF] px-3 py-1 text-xs font-semibold text-white">
                                        {item.niche}
                                    </div>
                                    <div className="absolute bottom-3 left-3 text-sm font-medium text-[#FAFAFA]">
                                        <span className="text-[#A1A1AA]">
                                            IDEIA
                                        </span>{' '}
                                        {item.idea}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section
                    id="features"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <Reveal>
                        <span className={sectionTag}>Recursos</span>
                        <h2 className={sectionTitle}>
                            Recursos do produto.{' '}
                            <span className="text-[#FAFAFA]/25">
                                Tudo o que você precisa, em um só lugar.
                            </span>
                        </h2>
                    </Reveal>
                    <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {features.map((feature) => (
                            <Reveal key={feature.title}>
                                <FeatureCard
                                    title={feature.title}
                                    text={feature.text}
                                    badge={feature.badge}
                                >
                                    <feature.Visual />
                                </FeatureCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ── COST COMPARISON ── */}
                <section className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32">
                    <Reveal className="mb-12 text-center">
                        <span className={sectionTag}>Faça as contas</span>
                        <h2 className={sectionTitle}>
                            Quanto você pagaria
                            <br />
                            por tudo isso separado?
                        </h2>
                    </Reveal>
                    <Reveal>
                        <div className="overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111114]">
                            {comparisonItems.map(({ label, price }, i) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between px-6 py-4"
                                    style={{
                                        background:
                                            i % 2 === 0 ? '#16161B' : '#111114',
                                        borderBottom:
                                            i < comparisonItems.length - 1
                                                ? '1px solid rgba(255,255,255,0.08)'
                                                : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <X className="h-3.5 w-3.5 flex-shrink-0 text-[#71717A]" />
                                        <span className="text-lg font-semibold text-[#A1A1AA]">
                                            {label}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-[#71717A]">
                                        {price}
                                    </span>
                                </div>
                            ))}
                            <div
                                className="flex items-center justify-between px-6 py-5"
                                style={{
                                    background: '#7C5CFF',
                                    borderTop: '1px solid #7C5CFF',
                                }}
                            >
                                <span className="text-lg font-extrabold text-white">
                                    Total (se comprado separado)
                                </span>
                                <span className="text-xl font-extrabold text-white">
                                    {totalComparison}
                                </span>
                            </div>
                        </div>
                    </Reveal>
                    <p className="mt-6 text-center text-lg leading-relaxed font-medium text-[#A1A1AA]">
                        É isso que você <em>poderia</em> gastar. Com o Slidezz,
                        tudo num lugar só, por uma fração do custo.
                    </p>
                </section>

                {/* ── PRICING ── */}
                <section
                    id="pricing"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <Reveal>
                        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                            <div>
                                <span className={sectionTag}>Preços</span>
                                <h2 className={sectionTitle}>
                                    Simples, como deve ser
                                </h2>
                                <p className="mt-4 text-[18px] tracking-[-0.02em] text-[#A1A1AA] sm:text-[20px]">
                                    Sem surpresas. Cancele quando quiser.
                                </p>
                            </div>

                            <div className="inline-flex w-fit items-center gap-1 rounded-full bg-[#111114] p-1">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('monthly')}
                                    className={cn(
                                        'h-11 rounded-full px-5 text-sm font-semibold transition-colors duration-200',
                                        billingCycle === 'monthly'
                                            ? 'bg-[#7C5CFF] text-white'
                                            : 'text-[#A1A1AA] hover:text-[#FAFAFA]',
                                    )}
                                >
                                    Mensal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('annual')}
                                    className={cn(
                                        'flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200',
                                        billingCycle === 'annual'
                                            ? 'bg-[#7C5CFF] text-white'
                                            : 'text-[#A1A1AA] hover:text-[#FAFAFA]',
                                    )}
                                >
                                    Anual
                                    <span className="rounded-full bg-[#A78BFA] px-2 py-0.5 text-[10px] font-semibold text-white">
                                        Economize até 31%
                                    </span>
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-3">
                        {plans.map((plan) => {
                            const price =
                                billingCycle === 'annual'
                                    ? plan.annual
                                    : plan.monthly;
                            const struckPrice =
                                billingCycle === 'annual' ? plan.monthly : null;

                            return (
                                <Reveal key={plan.name}>
                                    <PricingCard
                                        name={plan.name}
                                        price={price}
                                        struckPrice={struckPrice}
                                        billingCycle={billingCycle}
                                        features={plan.features}
                                        href={ctaHref}
                                        buttonClass={plan.buttonClass}
                                        badge={plan.badge}
                                        highlighted={plan.highlighted}
                                    />
                                </Reveal>
                            );
                        })}
                    </div>

                    {/* Lifetime offer */}
                    <Reveal>
                        <div className="mt-4 overflow-hidden rounded-[24px] border border-[#7C5CFF]/30 bg-[#111114] p-8 sm:mt-6 sm:p-10">
                            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <span className="inline-flex rounded-full bg-[#7C5CFF] px-3 py-1 text-xs font-semibold text-white">
                                        Oferta de lançamento
                                    </span>
                                    <h3 className="mt-3 font-landing-display text-3xl font-extrabold tracking-[-0.04em] text-[#FAFAFA]">
                                        Acesso vitalício
                                    </h3>
                                    <p className="mt-2 max-w-md text-[16px] text-[#A1A1AA]">
                                        Pague uma vez, use pra sempre. Sem
                                        mensalidade.
                                    </p>
                                    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                                        {lifetimeFeatures.map((feature) => (
                                            <li
                                                key={feature}
                                                className="flex items-center gap-2 text-sm font-medium text-[#FAFAFA]"
                                            >
                                                <Check className="h-4 w-4 text-[#A78BFA]" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="text-left md:text-right">
                                    <div className="font-landing-display text-5xl font-extrabold tracking-[-0.04em] text-[#FAFAFA]">
                                        R$297
                                    </div>
                                    <div className="text-sm font-medium text-[#A1A1AA]">
                                        pagamento único
                                    </div>
                                    <Link
                                        href={ctaHref}
                                        className={cn(
                                            primaryButton,
                                            'mt-4 text-[16px] whitespace-nowrap',
                                        )}
                                    >
                                        Garantir oferta vitalícia
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    <p className="mt-6 text-center text-[14px] text-[#A1A1AA]">
                        Sem cartão de crédito. Cancele quando quiser.
                    </p>
                </section>

                {/* ── FAQ ── */}
                <section
                    id="faq"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
                        <Reveal>
                            <span className={sectionTag}>FAQ</span>
                            <h2 className={sectionTitle}>
                                Perguntas frequentes
                            </h2>
                        </Reveal>
                        <Reveal>
                            <div className="border-t border-[rgba(255,255,255,0.08)]">
                                {faqs.map(({ q, a }) => (
                                    <FaqItem key={q} q={q} a={a} />
                                ))}
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,255,0.25),transparent)]" />
                    <div className="dotted-grid absolute inset-0 opacity-20" />
                    <div className="relative mx-auto max-w-[1320px] px-4 pt-8 pb-24 text-center sm:px-6 sm:pb-32">
                        <Reveal>
                            <h2 className="mx-auto max-w-[16ch] font-landing-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance text-[#FAFAFA]">
                                Seu próximo mês de conteúdo começa hoje.
                            </h2>
                            <p className="mx-auto mt-6 max-w-sm text-lg leading-relaxed font-medium text-[#A1A1AA]">
                                Pare de depender de criadores. A IA gera os
                                carrosséis, você baixa e posta em minutos.
                            </p>
                            <Link
                                href={ctaHref}
                                className={cn(primaryButton, 'mt-10')}
                            >
                                Criar minha máquina de conteúdo
                            </Link>
                            <p className="mt-5 font-medium text-[#A1A1AA]">
                                Sem cartão de crédito. Cancele quando quiser.
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <Footer />
            </div>
        </>
    );
}
