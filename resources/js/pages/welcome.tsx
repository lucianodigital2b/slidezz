import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import CtaButton from '@/components/cta-button';
import FadeIn from '@/components/fade-in';
import LandingFooter from '@/components/landing-footer';
import ScrollStack from '@/components/scroll-stack';
import TestimonialMarquee, {
    type Testimonial,
} from '@/components/testimonial-marquee';
import { TextShimmer } from '@/components/text-shimmer';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

const testimonials: Testimonial[] = [
    {
        name: 'Camila Alves',
        role: 'Marketing B2B',
        quote: 'Meu carrossel de funil bateu +48% de salvamentos vs. o resto do feed no mesmo mês — sem passar o fim de semana no Canva.',
        initials: 'CA',
    },
    {
        name: 'Rafael Santos',
        role: 'Criador de infoproduto',
        quote: 'Um lead perguntou qual agência fez o layout. Era eu, no Slidezz, de madrugada. Na terça seguinte ele fechou uma consultoria.',
        initials: 'RS',
    },
    {
        name: 'Juliana Menezes',
        role: 'Mentora',
        quote: 'Antes eu gravava Reels na correria. Agora o carrossel da semana fica pronto no domingo — só adapto o gancho pro vídeo.',
        initials: 'JM',
    },
    {
        name: 'Lucas Pereira',
        role: 'Fitness',
        quote: 'Testei o gancho que a IA sugeriu no 1º slide: salvamentos foram de 4% para 11% no mesmo nicho. Não foi sorte.',
        initials: 'LP',
    },
    {
        name: 'Bianca Ferreira',
        role: 'Estética',
        quote: 'Mesmo template, skincare e contador — só troco a paleta. Cliente disse que parecia marca com rebranding.',
        initials: 'BF',
    },
    {
        name: 'Diego Rocha',
        role: 'Consultor',
        quote: 'As DMs de "quanto custa?" triplicaram no mês em que padronizei os carrosséis. Coincidiu com o Slidezz — não foi viralização aleatória.',
        initials: 'DR',
    },
];

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
                                <a
                                    href="#prova"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    Resultados
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
                                className="h-3.5 w-3.5 fill-[#E8440A]"
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

                {/* ── DIFERENCIAL ── */}
                <section
                    id="diferencial"
                    style={{
                        borderTop: '1px solid #1A1A1A',
                        borderBottom: '1px solid #1A1A1A',
                        background: '#1A1A1A',
                    }}
                >
                    <div className="mx-auto max-w-6xl px-6 py-24">
                        <FadeIn className="grid items-stretch gap-8 lg:grid-cols-2">
                            {/* Outros */}
                            <div
                                className="rounded-2xl p-8"
                                style={{
                                    border: '1px solid #333330',
                                    background: '#222220',
                                }}
                            >
                                <p className="mb-6 font-bold tracking-widest text-[#666660] uppercase">
                                    Enquanto outros dependem de criadores…
                                </p>
                                <ul className="flex flex-col gap-4">
                                    {[
                                        'Aguardam o criador ficar disponível',
                                        'Briefam cada vídeo manualmente',
                                        'Pagam por post, sem garantia de resultado',
                                        'Ficam reféns de atrasos e desculpas',
                                        'Dependem de humanos para escalar',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-3 text-lg font-semibold text-[#888880]"
                                        >
                                            <span
                                                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                                                style={{
                                                    border: '1px solid #444440',
                                                    background: '#333330',
                                                }}
                                            >
                                                <X className="h-3 w-3 text-[#666660]" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Slidezz */}
                            <div
                                className="flex flex-col justify-between rounded-2xl p-8"
                                style={{
                                    border: '1px solid #E8440A',
                                    background: '#1E0A00',
                                }}
                            >
                                <div>
                                    <p className="mb-6 font-bold tracking-widest text-[#E8440A] uppercase">
                                        Você tem um sistema que trabalha 24/7.
                                    </p>
                                    <div className="mb-8 flex flex-col gap-5">
                                        {[
                                            {
                                                label: 'Sem atrasos.',
                                                desc: 'Conteúdo gerado e publicado automaticamente, todos os dias.',
                                            },
                                            {
                                                label: 'Sem gestão.',
                                                desc: 'Você não precisa briefar, revisar nem aprovar nada.',
                                            },
                                            {
                                                label: 'Sem desculpas.',
                                                desc: 'O sistema nunca falta, nunca atrasa, nunca para de produzir.',
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-start gap-3"
                                            >
                                                <span
                                                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                                                    style={{
                                                        border: '1px solid #E8440A',
                                                        background: '#E8440A',
                                                    }}
                                                >
                                                    <Check className="h-3 w-3 text-white" />
                                                </span>
                                                <div>
                                                    <span className="text-lg font-extrabold text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-lg font-medium text-[#888880]">
                                                        {' '}
                                                        {item.desc}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <CtaButton
                                    href={ctaHref}
                                    className="w-full justify-between py-2 pl-6"
                                >
                                    Criar minha máquina de conteúdo
                                </CtaButton>
                            </div>
                        </FadeIn>
                    </div>
                </section>

                {/* ── PROVA ── */}
                <section id="prova" className="mx-auto max-w-6xl px-6 py-24">
                    <FadeIn className="mb-14 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            Resultados
                        </p>
                        <h2 className="font-display text-5xl leading-none tracking-normal lg:text-6xl">
                            Números que falam
                            <br />
                            por si sós
                        </h2>
                    </FadeIn>

                    <FadeIn className="grid gap-5 md:grid-cols-3">
                        {[
                            {
                                value: '+X',
                                label: 'vídeos gerados',
                                suffix: '',
                                placeholder: true,
                            },
                            {
                                value: '+X',
                                label: 'contas crescendo diariamente',
                                suffix: '',
                                placeholder: true,
                            },
                            {
                                value: '+X',
                                label: 'views geradas',
                                suffix: '',
                                placeholder: true,
                            },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="relative overflow-hidden rounded-2xl bg-white p-10 text-center"
                                style={{ border: '1px solid #E8E7E2' }}
                            >
                                {s.placeholder && (
                                    <span
                                        className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase"
                                        style={{
                                            border: '1px solid #DDDDCC',
                                            background: '#F5F4EE',
                                            color: '#AAAAAA',
                                        }}
                                    >
                                        em breve
                                    </span>
                                )}
                                <div className="mb-3 font-display text-6xl text-[#CCCCCC]">
                                    {s.value}
                                </div>
                                <div className="text-lg font-semibold text-[#888880]">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </FadeIn>

                    <p className="mt-6 text-center text-lg font-medium text-[#AAAAAA]">
                        Você precisa disso. Dados reais em breve.
                    </p>
                </section>

                {/* ── DEPOIMENTOS ── */}
                <section
                    id="depoimentos"
                    className="py-24"
                    style={{
                        borderTop: '1px solid #E8E7E2',
                        background: '#FAFAF7',
                    }}
                >
                    <FadeIn className="mx-auto mb-16 max-w-6xl px-6 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            Quem usa, recomenda
                        </p>
                        <h2 className="font-display text-5xl leading-none tracking-normal lg:text-6xl">
                            O que dizem os criadores
                        </h2>
                    </FadeIn>

                    <TestimonialMarquee items={testimonials} />
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

                {/* ── PRICING ── */}
                <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
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
                                        className="absolute inset-0 rounded-full bg-[#E8440A]"
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
                                        className="absolute inset-0 rounded-full bg-[#E8440A]"
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
                                    até 50% OFF
                                </span>
                            </button>
                        </div>
                    </div>

                    <FadeIn className="mx-auto grid w-full max-w-3xl items-stretch gap-6 md:grid-cols-2">
                        {/* Starter */}
                        <div className="relative flex flex-col rounded-[24px] border border-[#E8E7E2] bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Starter
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        20% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            $36/mês
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $29
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
                                                $36
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
                                <Check className="h-4 w-4 text-[#E8440A]" />
                                Carrosséis ilimitados
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Recursos básicos:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    'Sugestões ilimitadas de posts',
                                    'Geração de carrossel',
                                    'Exportar carrosséis',
                                ].map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-lg font-medium text-[#555550]"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E8440A]" />
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
                        <div className="relative flex flex-col rounded-[24px] border-2 border-[#E8440A] bg-white p-8 shadow-lg">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold tracking-wide text-white uppercase shadow-sm">
                                Mais popular
                            </div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Pro
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        35% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            $120/mês
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $79
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
                                                $120
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
                                <Check className="h-4 w-4 text-[#E8440A]" />
                                Carrosséis ilimitados
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Tudo no Starter, mais:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    'Transformar notícias em posts',
                                    'Suas fotos no conteúdo',
                                    'Gestão de equipe',
                                    'Assistente WhatsApp (em breve)',
                                ].map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3 text-lg font-medium text-[#555550]"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E8440A]" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8440A] py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-[#D13D09]"
                            >
                                Testar agora <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
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
                                { label: 'Resultados', href: '#prova' },
                            ],
                        },
                        {
                            title: 'Ajuda',
                            links: [
                                { label: 'Começar', href: '#cta' },
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
