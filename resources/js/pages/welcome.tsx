import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Sprout, Check, X } from 'lucide-react';
import { dashboard, login, register } from '@/routes';

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props;
    const ctaHref = auth.user ? dashboard() : canRegister ? register() : login();

    return (
        <>
            <Head title="Slidezz — Transforme o TikTok em uma Máquina de Vendas">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div
                className="min-h-screen font-[Instrument_Sans,sans-serif]"
                style={{
                    background: '#F3EEE8',
                    backgroundImage:
                        'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    color: '#1A1A1A',
                }}
            >
                {/* ── NAV ── */}
                <header
                    className="sticky top-0 z-50"
                    style={{
                        background: 'rgba(243,238,232,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid #1A1A1A',
                    }}
                >
                    <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                                <Sprout className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-extrabold tracking-tight">Slidezz</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#444440]">
                            <a href="#diferencial" className="hover:text-[#1A1A1A] transition-colors">Como funciona</a>
                            <a href="#prova" className="hover:text-[#1A1A1A] transition-colors">Resultados</a>
                            <a href="#cta" className="hover:text-[#1A1A1A] transition-colors">Começar</a>
                            <Link href="/en" className="hover:text-[#1A1A1A] transition-colors">🇺🇸 EN</Link>
                        </nav>

                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-80"
                            style={{ border: '1px solid #1A1A1A' }}
                        >
                            {auth.user ? 'Ir para o app' : 'Criar conta grátis'}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mx-auto max-w-6xl px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left */}
                    <div>
                        <div
                            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-8"
                            style={{ border: '1px solid #1A1A1A', background: '#fff' }}
                        >
                            <svg className="w-3.5 h-3.5 fill-[#1A1A1A]" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" /></svg>
                            Automação para TikTok
                        </div>

                        <h1 className="text-[52px] lg:text-[60px] leading-[1.03] font-extrabold tracking-tight mb-6">
                            Transforme o TikTok em uma máquina de tráfego e vendas —
                            <span className="text-[#E8440A]"> sem criar conteúdo e sem contratar UGC.</span>
                        </h1>

                        <p className="text-[#555550] text-lg font-medium leading-relaxed mb-6 max-w-lg">
                            Geramos e publicamos carrosséis virais automaticamente todos os dias para você atrair leads, seguidores e clientes — enquanto você foca no seu negócio.
                        </p>

                        <div className="flex flex-col gap-2 mb-10">
                            {[
                                'Economia de milhares em UGC',
                                'Conteúdo publicado todos os dias, no piloto automático',
                                'Sem briefing, sem aprovação, sem atraso',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2.5 text-sm font-semibold">
                                    <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ border: '1px solid #1A1A1A', background: '#1A1A1A' }}
                                    >
                                        <Check className="w-2.5 h-2.5 text-white" />
                                    </span>
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-5">
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white text-sm font-bold px-6 py-3.5 rounded-full transition-opacity hover:opacity-80"
                                style={{ border: '1px solid #1A1A1A' }}
                            >
                                Criar minha máquina de conteúdo
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Right: App mockup */}
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-2xl blur-2xl opacity-25 -z-0"
                            style={{
                                background: 'linear-gradient(135deg, #FF6B6B, #FF9F45, #FFD93D, #6BCF7F, #4D9FFF, #B06BFF)',
                                transform: 'scale(0.95) translateY(10px)',
                            }}
                        />
                        <div
                            className="relative rounded-2xl overflow-hidden bg-white z-10"
                            style={{ border: '1px solid #1A1A1A', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}
                        >
                            {/* Window chrome */}
                            <div
                                className="flex items-center gap-2 px-4 py-3 border-b"
                                style={{ borderColor: '#E0E0DA', background: '#FAFAF7' }}
                            >
                                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" style={{ border: '1px solid rgba(0,0,0,0.12)' }} />
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" style={{ border: '1px solid rgba(0,0,0,0.12)' }} />
                                <span className="w-3 h-3 rounded-full bg-[#28CA41]" style={{ border: '1px solid rgba(0,0,0,0.12)' }} />
                                <div
                                    className="flex-1 mx-4 h-6 rounded-md bg-[#EDECE8] flex items-center px-3"
                                    style={{ border: '1px solid #DDDDD8' }}
                                >
                                    <span className="text-[10px] text-[#999993] font-medium">slidezz.app/analytics</span>
                                </div>
                            </div>

                            <div className="flex" style={{ height: 360 }}>
                                {/* Sidebar */}
                                <div
                                    className="w-40 flex-shrink-0 p-3 flex flex-col gap-1 border-r"
                                    style={{ borderColor: '#E8E7E2', background: '#F5F4EE' }}
                                >
                                    <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                                        <div className="w-5 h-5 bg-[#1A1A1A] rounded flex items-center justify-center">
                                            <Sprout className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs font-extrabold">Slidezz</span>
                                    </div>
                                    {['Início', 'Biblioteca', 'Analytics', 'Agenda'].map((label, i) => (
                                        <div
                                            key={label}
                                            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold"
                                            style={
                                                i === 2
                                                    ? { background: '#fff', border: '1px solid #1A1A1A', color: '#1A1A1A' }
                                                    : { color: '#888880' }
                                            }
                                        >
                                            {label}
                                        </div>
                                    ))}
                                    <div className="mt-2 px-2.5 py-1 text-[9px] font-bold text-[#BBBBAA] uppercase tracking-widest">Slideshows</div>
                                    {['Automações', 'Editor', 'Banco de Dados'].map((label) => (
                                        <div key={label} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-[#888880]">
                                            {label}
                                        </div>
                                    ))}
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4 overflow-hidden">
                                    <div className="text-xs font-extrabold mb-3">Analytics do TikTok</div>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {[
                                            { label: 'Views', value: '84.2k', bg: '#FFD60A22' },
                                            { label: 'Curtidas', value: '12.8k', bg: '#FF6B6B22' },
                                            { label: 'Engaj.', value: '5.4%', bg: '#6BCF7F22' },
                                        ].map((s) => (
                                            <div
                                                key={s.label}
                                                className="rounded-lg p-2.5"
                                                style={{ border: '1px solid #1A1A1A', background: s.bg }}
                                            >
                                                <div className="text-sm font-extrabold">{s.value}</div>
                                                <div className="text-[9px] font-bold text-[#888880] mt-0.5">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        className="rounded-lg p-3 mb-3"
                                        style={{ border: '1px solid #E8E7E2', background: '#FAFAF7' }}
                                    >
                                        <div className="text-[9px] font-bold text-[#888880] mb-2">Carrosséis publicados — últimos 14 dias</div>
                                        <div className="flex items-end gap-1 h-12">
                                            {[35, 60, 42, 78, 50, 88, 65, 82, 55, 92, 70, 85, 48, 95].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 rounded-sm"
                                                    style={{ height: `${h}%`, background: i === 13 ? '#1A1A1A' : '#1A1A1A22' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div
                                        className="rounded-lg p-2.5"
                                        style={{ border: '1px solid #E8E7E2', background: '#FAFAF7' }}
                                    >
                                        <div className="text-[9px] font-bold text-[#888880] mb-1.5">Próximas publicações automáticas</div>
                                        {['Hoje 14:00 · TikTok', 'Hoje 20:00 · TikTok', 'Amanhã 09:30 · TikTok'].map((t) => (
                                            <div key={t} className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                                                <span className="text-[9px] font-semibold text-[#555550]">{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── DIFERENCIAL ── */}
                <section
                    id="diferencial"
                    style={{ borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', background: '#1A1A1A' }}
                >
                    <div className="mx-auto max-w-6xl px-6 py-24">
                        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                            {/* Outros */}
                            <div
                                className="rounded-2xl p-8"
                                style={{ border: '1px solid #333330', background: '#222220' }}
                            >
                                <p className="text-xs font-bold uppercase tracking-widest text-[#666660] mb-6">
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
                                        <li key={item} className="flex items-start gap-3 text-sm font-semibold text-[#888880]">
                                            <span
                                                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                                style={{ border: '1px solid #444440', background: '#333330' }}
                                            >
                                                <X className="w-2.5 h-2.5 text-[#666660]" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Slidezz */}
                            <div
                                className="rounded-2xl p-8 flex flex-col justify-between"
                                style={{ border: '1px solid #E8440A', background: '#1E0A00' }}
                            >
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#E8440A] mb-6">
                                        Você tem um sistema que trabalha 24/7.
                                    </p>
                                    <div className="flex flex-col gap-5 mb-8">
                                        {[
                                            { label: 'Sem atrasos.', desc: 'Conteúdo gerado e publicado automaticamente, todos os dias.' },
                                            { label: 'Sem gestão.', desc: 'Você não precisa briefar, revisar nem aprovar nada.' },
                                            { label: 'Sem desculpas.', desc: 'O sistema nunca falta, nunca atrasa, nunca para de produzir.' },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-start gap-3">
                                                <span
                                                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ border: '1px solid #E8440A', background: '#E8440A' }}
                                                >
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                </span>
                                                <div>
                                                    <span className="text-sm font-extrabold text-white">{item.label}</span>
                                                    <span className="text-sm font-medium text-[#888880]"> {item.desc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Link
                                    href={ctaHref}
                                    className="inline-flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-full transition-opacity hover:opacity-80"
                                    style={{ border: '1px solid #E8440A', background: '#E8440A', color: '#fff' }}
                                >
                                    Criar minha máquina de conteúdo
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── PROVA ── */}
                <section id="prova" className="mx-auto max-w-6xl px-6 py-24">
                    <div className="text-center mb-14">
                        <p className="text-sm font-bold uppercase tracking-widest text-[#888880] mb-3">Resultados</p>
                        <h2 className="text-4xl font-extrabold tracking-tight">
                            Números que falam<br />por si sós
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            { value: '+X', label: 'vídeos gerados', suffix: '', placeholder: true },
                            { value: '+X', label: 'contas crescendo diariamente', suffix: '', placeholder: true },
                            { value: '+X', label: 'views geradas', suffix: '', placeholder: true },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="rounded-2xl p-10 text-center bg-white relative overflow-hidden"
                                style={{ border: '1px solid #1A1A1A' }}
                            >
                                {s.placeholder && (
                                    <span
                                        className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                        style={{ border: '1px solid #DDDDCC', background: '#F5F4EE', color: '#AAAAAA' }}
                                    >
                                        em breve
                                    </span>
                                )}
                                <div className="text-5xl font-extrabold mb-3 text-[#CCCCCC]">{s.value}</div>
                                <div className="text-sm font-semibold text-[#888880]">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-xs text-[#AAAAAA] font-medium mt-6">
                        Você precisa disso. Dados reais em breve.
                    </p>
                </section>

                {/* ── CTA FINAL ── */}
                <section id="cta" className="mx-auto max-w-6xl px-6 pb-24">
                    <div
                        className="rounded-2xl p-16 text-center"
                        style={{ border: '1px solid #1A1A1A', background: '#1A1A1A' }}
                    >
                        <div
                            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-8"
                            style={{ border: '1px solid #333330', background: '#222220', color: '#888880' }}
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" /></svg>
                            TikTok · Automação com IA
                        </div>

                        <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
                            Comece a automatizar<br />seu TikTok hoje.
                        </h2>
                        <p className="text-[#666660] font-medium mb-10 max-w-sm mx-auto text-sm leading-relaxed">
                            Pare de depender de criadores. Tenha um sistema que gera e publica conteúdo viral todos os dias — no piloto automático.
                        </p>
                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 text-sm font-bold px-8 py-4 rounded-full transition-opacity hover:opacity-80"
                            style={{ border: '1px solid #E8440A', background: '#E8440A', color: '#fff' }}
                        >
                            Criar minha máquina de conteúdo
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-xs text-[#444440] font-medium mt-5">Sem cartão de crédito. Cancele quando quiser.</p>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer style={{ borderTop: '1px solid #1A1A1A', background: '#1A1A1A' }}>
                    <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                                <Sprout className="w-3.5 h-3.5 text-[#1A1A1A]" />
                            </div>
                            <span className="text-base font-extrabold text-white">Slidezz</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-semibold text-[#555550]">
                            <a href="#diferencial" className="hover:text-white transition-colors">Como funciona</a>
                            <a href="#prova" className="hover:text-white transition-colors">Resultados</a>
                            <a href="#cta" className="hover:text-white transition-colors">Começar</a>
                        </div>
                        <p className="text-xs text-[#444440] font-medium">© 2025 Slidezz. Todos os direitos reservados.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
