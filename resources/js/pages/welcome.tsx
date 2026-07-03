import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronDown, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import CtaButton from '@/components/cta-button';
import FadeIn from '@/components/fade-in';
import FeatureBento, {
    type FeatureBentoCopy,
} from '@/components/feature-bento';
import LandingFooter from '@/components/landing-footer';
import ScrollStack from '@/components/scroll-stack';
import { TextShimmer } from '@/components/text-shimmer';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

// ─── Data ────────────────────────────────────────────────────────────────────

const comparisonItems = [
    { label: 'Canva Pro (design)', price: 'R$34,90/mês' },
    { label: 'ChatGPT Plus (textos e ideias)', price: 'R$110,00/mês' },
    { label: 'Google Gemini (imagem IA)', price: 'R$97,00/mês' },
    { label: 'Adobe Photoshop (editor)', price: 'R$115,00/mês' },
    { label: 'Designer freelancer (layouts)', price: 'R$1.500,00/mês' },
    { label: 'Copywriter freelancer (roteiros)', price: 'R$800,00/mês' },
];

const totalComparison = 'R$2.656,90/mês';

const featureBentoCopy: FeatureBentoCopy = {
    carousels: {
        title: 'Carrosséis gerados por IA',
        body: 'Você dá o tema e o tom; a IA monta os slides com layout coerente, prontos pra publicar. Sem começar do zero no Canva.',
    },
    script: {
        title: 'Texto e roteiro prontos',
        body: 'Títulos, ganchos e o texto dos slides sugeridos pela IA, sem pular pro ChatGPT em outra aba.',
    },
    editor: {
        title: 'Editor visual simples',
        body: 'Ajuste cores, fontes e imagens no arrastar e soltar. Sem curva de aprendizado.',
    },
    export: {
        title: 'Exportação em Full HD',
        body: 'Baixe em PNG a 1080px, o tamanho certo pro Instagram. Sem perder qualidade.',
    },
    minutes: {
        title: 'Conteúdo em minutos',
        body: 'Produza vários carrosséis numa sessão. Menos tempo no design, mais tempo vendendo.',
    },
    community: {
        title: 'Comunidade de criadores',
        body: 'Troque referências e ritmo de postagem com criadores que querem consistência, não postar no escuro.',
    },
};

const faqs = [
    {
        q: 'Preciso saber design?',
        a: 'Não. A IA faz tudo. Você só digita o tema e o carrossel sai pronto — texto, layout e design profissional.',
    },
    {
        q: 'Funciona pra qualquer nicho?',
        a: 'Sim. Marketing digital, fitness, gastronomia, educação, moda, coaching, finanças — a IA se adapta ao seu nicho e tom de voz.',
    },
    {
        q: 'Posso cancelar quando quiser?',
        a: 'Sim. Sem multa, sem fidelidade. Cancele direto no painel em 2 cliques.',
    },
    {
        q: 'A IA também gera os textos?',
        a: 'Sim! Títulos, subtítulos, textos persuasivos e CTAs — tudo gerado automaticamente e otimizado pra engajamento.',
    },
    {
        q: 'Quantos carrosséis posso criar?',
        a: 'Carrosséis são ilimitados em todos os planos. O que cada plano inclui é uma cota de imagens virais por mês (60 no Starter, 150 no Pro, 400 no Agency). No Pro e no Agency você pode conectar sua própria chave Gemini (BYOK) e ter imagens ilimitadas.',
    },
    {
        q: 'Funciona no celular?',
        a: 'Funciona no navegador em qualquer dispositivo — computador, tablet ou celular. Sem instalar nada.',
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="rounded-2xl bg-white transition-shadow duration-300"
            style={{
                border: '1px solid #E8E7E2',
                boxShadow: open ? '0 14px 36px rgba(0,0,0,0.08)' : 'none',
            }}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-5 px-7 py-6 text-left sm:px-8 sm:py-7"
            >
                <span className="text-xl font-extrabold text-[#1A1A1A]">
                    {q}
                </span>
                <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                    style={{
                        border: '1px solid #E8E7E2',
                        background: open ? '#FFE156' : '#F3EEE8',
                    }}
                >
                    <ChevronDown
                        className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: open ? '#fff' : '#1A1A1A',
                        }}
                    />
                </span>
            </button>
            <div
                className="grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <p className="px-7 pb-7 text-lg leading-relaxed font-medium text-[#555550] sm:px-8">
                        {a}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
    const reduceMotion = useReducedMotion();

    return (
        <>
            <Head title="Slidezz — Transforme o TikTok em uma Máquina de Vendas">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=bebas-neue:400|outfit:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div
                className="min-h-screen font-[Outfit,sans-serif]"
                style={{
                    background: '#F3EEE8',
                    backgroundImage:
                        'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    color: '#1A1A1A',
                }}
            >
                {/* ── NAV ── */}
                <header className="sticky top-0 z-50">
                    <div
                        className={cn(
                            'mx-auto max-w-6xl transition-all duration-300',
                            scrolled ? 'px-4 pt-3' : 'px-6 pt-0',
                        )}
                    >
                        <div
                            className={cn(
                                'flex h-16 items-center justify-between transition-all duration-300',
                                scrolled
                                    ? 'rounded-[64px] border border-black/10 bg-white/70 px-6 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl'
                                    : 'px-0',
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
                                    <AppLogoIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="mt-1 font-display text-2xl tracking-wide">
                                    Slidezz
                                </span>
                            </div>

                            <nav className="hidden items-center gap-8 text-lg font-semibold text-[#444440] md:flex">
                                <a
                                    href="#como-funciona"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    Como funciona
                                </a>
                                <a
                                    href="#pricing"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    Preços
                                </a>
                            </nav>

                            <CtaButton
                                href={ctaHref}
                                className="py-1 pr-1 pl-5 text-base"
                            >
                                {auth.user
                                    ? 'Ir para o app'
                                    : 'Parar de perder tempo'}
                            </CtaButton>
                        </div>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-24 pb-16 lg:grid-cols-2">
                    {/* Left */}
                    <FadeIn>
                        <div
                            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold"
                            style={{
                                border: '1px solid #E8E7E2',
                                background: '#fff',
                            }}
                        >
                            <svg
                                className="h-3.5 w-3.5 fill-[#FFE156]"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
                            </svg>
                            Automação para TikTok
                        </div>

                        <h1 className="mb-6 font-display text-[64px] leading-[0.95] tracking-normal lg:text-[76px]">
                            Transforme o TikTok em uma máquina de tráfego e
                            vendas —{' '}
                            <TextShimmer as="span" duration={2.5} spread={3}>
                                sem criar conteúdo.
                            </TextShimmer>
                        </h1>

                        <p className="mb-6 max-w-lg text-xl leading-relaxed font-medium text-[#555550]">
                            Geramos e publicamos carrosséis virais
                            automaticamente todos os dias para você atrair
                            leads, seguidores e clientes — enquanto você foca no
                            seu negócio.
                        </p>

                        <div className="mb-10 flex flex-col gap-2">
                            {[
                                'Economia de milhares em UGC',
                                'Conteúdo publicado todos os dias, no piloto automático',
                                'Sem briefing, sem aprovação, sem atraso',
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-2.5 text-sm font-semibold"
                                >
                                    <span
                                        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            border: '1px solid #1A1A1A',
                                            background: '#1A1A1A',
                                        }}
                                    >
                                        <Check className="h-2.5 w-2.5 text-white" />
                                    </span>
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-5">
                            <CtaButton
                                href={ctaHref}
                                className="py-2 pr-2 pl-8"
                            >
                                Criar minha máquina de conteúdo
                            </CtaButton>
                        </div>
                    </FadeIn>

                    {/* Right: App mockup */}
                    <FadeIn className="relative" delay={0.12}>
                        <div
                            className="absolute inset-0 -z-0 rounded-2xl opacity-25 blur-2xl"
                            style={{
                                background:
                                    'linear-gradient(135deg, #FF6B6B, #FF9F45, #FFD93D, #6BCF7F, #4D9FFF, #B06BFF)',
                                transform: 'scale(0.95) translateY(10px)',
                            }}
                        />
                        <div
                            className="relative z-10 overflow-hidden rounded-2xl bg-white"
                            style={{
                                boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
                            }}
                        >
                            {/* Window chrome */}
                            <div
                                className="flex items-center gap-2 border-b px-4 py-3"
                                style={{
                                    borderColor: '#E0E0DA',
                                    background: '#FAFAF7',
                                }}
                            >
                                <span
                                    className="h-3 w-3 rounded-full bg-[#FF5F57]"
                                    style={{
                                        border: '1px solid rgba(0,0,0,0.12)',
                                    }}
                                />
                                <span
                                    className="h-3 w-3 rounded-full bg-[#FFBD2E]"
                                    style={{
                                        border: '1px solid rgba(0,0,0,0.12)',
                                    }}
                                />
                                <span
                                    className="h-3 w-3 rounded-full bg-[#28CA41]"
                                    style={{
                                        border: '1px solid rgba(0,0,0,0.12)',
                                    }}
                                />
                                <div
                                    className="mx-4 flex h-6 flex-1 items-center rounded-md bg-[#EDECE8] px-3"
                                    style={{ border: '1px solid #DDDDD8' }}
                                >
                                    <span className="text-[10px] font-medium text-[#999993]">
                                        slidezz.app/analytics
                                    </span>
                                </div>
                            </div>

                            <div className="flex" style={{ height: 360 }}>
                                {/* Sidebar */}
                                <div
                                    className="flex w-40 flex-shrink-0 flex-col gap-1 border-r p-3"
                                    style={{
                                        borderColor: '#E8E7E2',
                                        background: '#F5F4EE',
                                    }}
                                >
                                    <div className="mb-2 flex items-center gap-2 px-2 py-1.5">
                                        <div className="flex h-5 w-5 items-center justify-center rounded bg-[#1A1A1A]">
                                            <AppLogoIcon className="h-3 w-3 text-white" />
                                        </div>
                                        <span className="text-xs font-extrabold">
                                            Slidezz
                                        </span>
                                    </div>
                                    {[
                                        'Início',
                                        'Biblioteca',
                                        'Analytics',
                                        'Agenda',
                                    ].map((label, i) => (
                                        <div
                                            key={label}
                                            className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold"
                                            style={
                                                i === 2
                                                    ? {
                                                          background: '#fff',
                                                          border: '1px solid #E8E7E2',
                                                          color: '#1A1A1A',
                                                      }
                                                    : { color: '#888880' }
                                            }
                                        >
                                            {label}
                                        </div>
                                    ))}
                                    <div className="mt-2 px-2.5 py-1 text-[9px] font-bold tracking-widest text-[#BBBBAA] uppercase">
                                        Slideshows
                                    </div>
                                    {[
                                        'Automações',
                                        'Editor',
                                        'Banco de Dados',
                                    ].map((label) => (
                                        <div
                                            key={label}
                                            className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-[#888880]"
                                        >
                                            {label}
                                        </div>
                                    ))}
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-hidden p-4">
                                    <div className="mb-3 text-xs font-extrabold">
                                        Analytics do TikTok
                                    </div>
                                    <div className="mb-4 grid grid-cols-3 gap-2">
                                        {[
                                            {
                                                label: 'Views',
                                                value: '84.2k',
                                                bg: '#FFD60A22',
                                            },
                                            {
                                                label: 'Curtidas',
                                                value: '12.8k',
                                                bg: '#FF6B6B22',
                                            },
                                            {
                                                label: 'Engaj.',
                                                value: '5.4%',
                                                bg: '#6BCF7F22',
                                            },
                                        ].map((s) => (
                                            <div
                                                key={s.label}
                                                className="rounded-lg p-2.5"
                                                style={{
                                                    border: '1px solid #E8E7E2',
                                                    background: s.bg,
                                                }}
                                            >
                                                <div className="text-sm font-extrabold">
                                                    {s.value}
                                                </div>
                                                <div className="mt-0.5 text-[9px] font-bold text-[#888880]">
                                                    {s.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        className="mb-3 rounded-lg p-3"
                                        style={{
                                            border: '1px solid #E8E7E2',
                                            background: '#FAFAF7',
                                        }}
                                    >
                                        <div className="mb-2 text-[9px] font-bold text-[#888880]">
                                            Carrosséis publicados — últimos 14
                                            dias
                                        </div>
                                        <div className="flex h-12 items-end gap-1">
                                            {[
                                                35, 60, 42, 78, 50, 88, 65, 82,
                                                55, 92, 70, 85, 48, 95,
                                            ].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 rounded-sm"
                                                    style={{
                                                        height: `${h}%`,
                                                        background:
                                                            i === 13
                                                                ? '#1A1A1A'
                                                                : '#1A1A1A22',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div
                                        className="rounded-lg p-2.5"
                                        style={{
                                            border: '1px solid #E8E7E2',
                                            background: '#FAFAF7',
                                        }}
                                    >
                                        <div className="mb-1.5 text-[9px] font-bold text-[#888880]">
                                            Próximas publicações automáticas
                                        </div>
                                        {[
                                            'Hoje 14:00 · TikTok',
                                            'Hoje 20:00 · TikTok',
                                            'Amanhã 09:30 · TikTok',
                                        ].map((t) => (
                                            <div
                                                key={t}
                                                className="mb-1 flex items-center gap-1.5"
                                            >
                                                <div className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]" />
                                                <span className="text-[9px] font-semibold text-[#555550]">
                                                    {t}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </section>

                {/* ── PROBLEMA ── */}
                <section
                    style={{
                        borderTop: '1px solid #1A1A1A',
                        borderBottom: '1px solid #1A1A1A',
                        background: '#1A1A1A',
                    }}
                >
                    <FadeIn className="mx-auto max-w-4xl px-6 py-24 text-center">
                        <p className="mb-4 font-bold tracking-widest text-[#1A1A1A] uppercase">
                            A verdade que ninguém te conta
                        </p>
                        <h2 className="mb-8 font-display text-5xl leading-[0.95] tracking-normal text-white lg:text-7xl">
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
                                tentando montar um post bonito, seus concorrentes
                                usam IA pra criar 10 carrosséis virais no tempo em
                                que você faz 1.
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
                            <CtaButton href={ctaHref} className="py-2 pr-2 pl-8">
                                Quero parar de perder tempo
                            </CtaButton>
                        </div>
                    </FadeIn>
                </section>

                {/* ── COMO FUNCIONA ── */}
                <section
                    id="como-funciona"
                    className="mx-auto max-w-6xl px-6 pt-24"
                >
                    <FadeIn className="mb-4 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            Em 3 passos
                        </p>
                        <h2 className="font-display text-5xl leading-none tracking-normal lg:text-6xl">
                            Tão simples que parece mágica
                        </h2>
                    </FadeIn>

                    <ScrollStack
                        items={[
                            {
                                step: '01',
                                title: 'Descreva seu conteúdo',
                                body: 'Digite o tema, o nicho e o tom de voz. Pode ser uma frase simples como "5 dicas de marketing digital."',
                            },
                            {
                                step: '02',
                                title: 'A IA cria tudo',
                                body: 'Em segundos, a IA gera o texto persuasivo, escolhe o layout perfeito e monta o carrossel completo.',
                            },
                            {
                                step: '03',
                                title: 'Publique e viralize',
                                body: 'Exporte em Full HD ou agende direto. Pronto. Seu carrossel está no ar, ganhando seguidores.',
                            },
                        ].map(({ step, title, body }) => (
                            <div
                                key={step}
                                className="flex min-h-[300px] flex-col justify-center rounded-[24px] bg-white p-10 sm:p-12"
                                style={{
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.10)',
                                }}
                            >
                                <div className="mb-6 flex items-center gap-4">
                                    <div
                                        className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold"
                                        style={{
                                            background: '#1A1A1A',
                                            color: '#fff',
                                        }}
                                    >
                                        {step}
                                    </div>
                                    <span className="text-sm font-bold tracking-widest text-[#888880] uppercase">
                                        Passo {step}
                                    </span>
                                </div>
                                <h3 className="mb-3 font-display text-3xl leading-none tracking-normal sm:text-4xl">
                                    {title}
                                </h3>
                                <p className="max-w-xl text-lg leading-relaxed font-medium text-[#555550]">
                                    {body}
                                </p>
                            </div>
                        ))}
                    />

                    <div className="flex justify-center pb-24">
                        <CtaButton href={ctaHref} className="py-2 pr-2 pl-8">
                            Criar minha máquina de conteúdo
                        </CtaButton>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section
                    style={{
                        borderTop: '1px solid #E8E7E2',
                        background: '#FAFAF7',
                    }}
                >
                    <div className="mx-auto max-w-6xl px-6 py-24">
                        <FadeIn className="mb-16 text-center">
                            <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                                O que tem dentro
                            </p>
                            <h2 className="font-display text-5xl leading-none tracking-normal lg:text-6xl">
                                IA treinada pra prender atenção
                            </h2>
                            <p className="mx-auto mt-3 max-w-lg text-lg leading-relaxed font-medium text-[#555550]">
                                Você não precisa de um mega prompt de outras IAs:
                                o fluxo inteiro já é calibrado pra viralizar e se
                                destacar no feed.
                            </p>
                        </FadeIn>

                        <FeatureBento copy={featureBentoCopy} />
                    </div>
                </section>

                {/* ── ÂNCORA DE PREÇO ── */}
                <section
                    style={{
                        borderTop: '1px solid #1A1A1A',
                        borderBottom: '1px solid #1A1A1A',
                        background: '#1A1A1A',
                    }}
                >
                    <div className="mx-auto max-w-3xl px-6 py-24">
                        <FadeIn className="mb-12 text-center">
                            <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                                Faça as contas
                            </p>
                            <h2 className="font-display text-5xl leading-[0.95] tracking-normal text-white lg:text-6xl">
                                Quanto você pagaria
                                <br />
                                por tudo isso separado?
                            </h2>
                        </FadeIn>

                        <FadeIn
                            className="overflow-hidden rounded-2xl"
                            style={{ border: '1px solid #333330' }}
                        >
                            {comparisonItems.map(({ label, price }, i) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between px-6 py-4"
                                    style={{
                                        background:
                                            i % 2 === 0 ? '#222220' : '#1E1E1C',
                                        borderBottom:
                                            i < comparisonItems.length - 1
                                                ? '1px solid #2A2A28'
                                                : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <X className="h-3.5 w-3.5 flex-shrink-0 text-[#555550]" />
                                        <span className="text-lg font-semibold text-[#AAAAAA]">
                                            {label}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-[#666660]">
                                        {price}
                                    </span>
                                </div>
                            ))}
                            <div
                                className="flex items-center justify-between px-6 py-5"
                                style={{
                                    background: '#2A0E00',
                                    borderTop: '1px solid #FFE156',
                                }}
                            >
                                <span className="text-lg font-extrabold text-white">
                                    Total (se comprado separado)
                                </span>
                                <span className="text-xl font-extrabold text-[#1A1A1A]">
                                    {totalComparison}
                                </span>
                            </div>
                        </FadeIn>

                        <p className="mt-6 text-center text-lg leading-relaxed font-medium text-[#666660]">
                            É isso que você <em>poderia</em> gastar. Com o
                            Slidezz, tudo num lugar só — por uma fração do custo.
                        </p>
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
                    <FadeIn className="mb-12 text-center">
                        <h2 className="mb-3 font-display text-6xl tracking-normal text-[#1A1A1A]">
                            Simples, como deve ser
                        </h2>
                        <p className="text-lg font-medium text-[#666660]">
                            Sem surpresas. Cancele quando quiser.
                        </p>
                    </FadeIn>

                    {/* Toggle */}
                    <div className="mb-12 flex justify-center">
                        <div className="flex items-center gap-1 rounded-full border border-[#E8E7E2] bg-white p-1 shadow-sm">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className="relative rounded-full px-6 py-2 text-lg font-bold"
                            >
                                {billingCycle === 'monthly' && (
                                    <motion.span
                                        layoutId="billing-pill"
                                        className="absolute inset-0 rounded-full bg-[#FFE156]"
                                        transition={
                                            reduceMotion
                                                ? { duration: 0 }
                                                : {
                                                      type: 'spring',
                                                      stiffness: 420,
                                                      damping: 20,
                                                      mass: 0.9,
                                                  }
                                        }
                                    />
                                )}
                                <span
                                    className={`relative z-10 transition-colors duration-200 ${
                                        billingCycle === 'monthly'
                                            ? 'text-white'
                                            : 'text-[#666660] hover:text-[#1A1A1A]'
                                    }`}
                                >
                                    Mensal
                                </span>
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className="relative flex items-center gap-2 rounded-full px-6 py-2 text-lg font-bold"
                            >
                                {billingCycle === 'annual' && (
                                    <motion.span
                                        layoutId="billing-pill"
                                        className="absolute inset-0 rounded-full bg-[#FFE156]"
                                        transition={
                                            reduceMotion
                                                ? { duration: 0 }
                                                : {
                                                      type: 'spring',
                                                      stiffness: 420,
                                                      damping: 20,
                                                      mass: 0.9,
                                                  }
                                        }
                                    />
                                )}
                                <span
                                    className={`relative z-10 transition-colors duration-200 ${
                                        billingCycle === 'annual'
                                            ? 'text-white'
                                            : 'text-[#666660] hover:text-[#1A1A1A]'
                                    }`}
                                >
                                    Anual
                                </span>
                                <span
                                    className={`relative z-10 rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase transition-colors duration-200 ${
                                        billingCycle === 'annual'
                                            ? 'bg-[#A3E635] text-[#1A1A1A]'
                                            : 'bg-[#E8F5E9] text-[#28CA41]'
                                    }`}
                                >
                                    até 30% OFF
                                </span>
                            </button>
                        </div>
                    </div>

                    <FadeIn className="mx-auto grid w-full max-w-6xl items-stretch gap-6 md:grid-cols-3">
                        {/* Starter */}
                        <div className="relative flex flex-col rounded-[24px] border border-[#E8E7E2] bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Starter
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        30% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            R$67/mês
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                R$47
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado anualmente
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                R$67
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado mensalmente
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#E8E7E2] pb-6 text-lg font-bold text-[#1A1A1A]">
                                <Check className="h-4 w-4 text-[#1A1A1A]" />
                                Carrosséis ilimitados
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Inclui:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    '60 imagens virais por mês',
                                    'Copy e hooks com IA',
                                    'Todos os templates',
                                ].map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-lg font-medium text-[#555550]"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1A1A1A]" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-[#333]"
                            >
                                Testar agora <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="relative flex flex-col rounded-[24px] border-2 border-[#FFE156] bg-white p-8 shadow-lg">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold tracking-wide text-white uppercase shadow-sm">
                                Mais popular
                            </div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Pro
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        31% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            R$127/mês
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                R$87
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado anualmente
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                R$127
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado mensalmente
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#E8E7E2] pb-6 text-lg font-bold text-[#1A1A1A]">
                                <Check className="h-4 w-4 text-[#1A1A1A]" />
                                Carrosséis ilimitados
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Tudo no Starter, mais:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    '150 imagens virais por mês',
                                    'Imagens ilimitadas com sua chave Gemini (BYOK)',
                                    'Suporte prioritário',
                                    'Salvar seus templates',
                                ].map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-lg font-medium text-[#555550]"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1A1A1A]" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE156] py-3.5 text-center text-lg font-bold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D]"
                            >
                                Testar agora <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        {/* Agency */}
                        <div className="relative flex flex-col rounded-[24px] border border-[#333330] bg-[#1A1A1A] p-8 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-white">
                                    Agency
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#FCD34D]/15 px-2.5 py-1 text-xs font-bold tracking-wide text-[#FCD34D] uppercase">
                                        28% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            R$247/mês
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-white">
                                                R$177
                                            </span>
                                            <span className="text-lg font-medium text-[#AAAAAA]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado anualmente
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-white">
                                                R$247
                                            </span>
                                            <span className="text-lg font-medium text-[#AAAAAA]">
                                                /mês
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            cobrado mensalmente
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#333330] pb-6 text-lg font-bold text-[#FCD34D]">
                                <Check className="h-4 w-4 text-[#FCD34D]" />
                                Carrosséis ilimitados
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#AAAAAA]">
                                Tudo no Pro, mais:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    '400 imagens virais por mês',
                                    'Imagens ilimitadas com sua chave Gemini (BYOK)',
                                    'Múltiplos projetos',
                                    'Gestão de equipe',
                                ].map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-lg font-medium text-[#DDDDCC]"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FCD34D]" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE156] py-3.5 text-center text-lg font-bold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D]"
                            >
                                Testar agora <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </FadeIn>
                </section>

                {/* ── FAQ ── */}
                <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
                    <FadeIn className="mb-14 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            FAQ
                        </p>
                        <h2 className="font-display text-5xl leading-none tracking-normal lg:text-6xl">
                            Perguntas frequentes
                        </h2>
                    </FadeIn>

                    <div className="space-y-4">
                        {faqs.map(({ q, a }) => (
                            <FaqItem key={q} q={q} a={a} />
                        ))}
                    </div>
                </section>

                {/* ── CTA FINAL ── */}
                <section id="cta" className="mx-auto max-w-6xl px-6 pb-24">
                    <FadeIn
                        className="rounded-2xl p-16 text-center"
                        style={{
                            border: '1px solid #1A1A1A',
                            background: '#1A1A1A',
                        }}
                    >
                        <div
                            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold"
                            style={{
                                border: '1px solid #333330',
                                background: '#222220',
                                color: '#888880',
                            }}
                        >
                            <svg
                                className="h-3.5 w-3.5 fill-current"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
                            </svg>
                            TikTok · Automação com IA
                        </div>

                        <h2 className="mb-4 font-display text-6xl leading-[0.95] tracking-normal text-white lg:text-[80px]">
                            Comece a automatizar
                            <br />
                            seu TikTok hoje.
                        </h2>
                        <p className="mx-auto mb-10 max-w-sm text-lg leading-relaxed font-medium text-[#666660]">
                            Pare de depender de criadores. Tenha um sistema que
                            gera e publica conteúdo viral todos os dias — no
                            piloto automático.
                        </p>
                        <CtaButton
                            href={ctaHref}
                            className="py-2.5 pr-2.5 pl-9"
                        >
                            Criar minha máquina de conteúdo
                        </CtaButton>
                        <p className="mt-5 font-medium text-[#444440]">
                            Sem cartão de crédito. Cancele quando quiser.
                        </p>
                    </FadeIn>
                </section>

                {/* ── FOOTER ── */}
                <LandingFooter
                    reachOutTitle="Precisa de ajuda?"
                    contact={{
                        title: 'Fale com a gente',
                        subtitle: 'Respondemos em até 24h',
                        href: 'https://wa.me/5527997798070?text=Ol%C3%A1%21%20Preciso%20de%20suporte%20com%20o%20Slidezz.',
                    }}
                    columns={[
                        {
                            title: 'Explorar',
                            links: [
                                {
                                    label: 'Como funciona',
                                    href: '#como-funciona',
                                },
                                { label: 'Preços', href: '#pricing' },
                            ],
                        },
                        {
                            title: 'Ajuda',
                            links: [
                                { label: 'Perguntas frequentes', href: '#faq' },
                                {
                                    label: 'Contato',
                                    href: 'mailto:contato@slidezz.app',
                                },
                            ],
                        },
                    ]}
                    socialLabel="Redes sociais"
                    rights="© 2026 Slidezz. Todos os direitos reservados."
                    legal={[
                        { label: 'Termos de Uso', href: '#' },
                        { label: 'Privacidade', href: '#' },
                        { label: 'Cookies', href: '#' },
                    ]}
                />
            </div>
        </>
    );
}
