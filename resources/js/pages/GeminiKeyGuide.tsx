import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, ExternalLink, KeyRound, ShieldCheck, Wallet } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { register } from '@/routes';

// Público: passo a passo pra criar a chave gratuita do Gemini no Google AI
// Studio. Linkada no onboarding e nas Configurações → Integrações.

const steps = [
    {
        title: 'Acesse o Google AI Studio',
        body: (
            <>
                Abra{' '}
                <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#1A1A1A] underline underline-offset-2"
                >
                    aistudio.google.com/apikey
                </a>{' '}
                e entre com a sua conta Google (a mesma do Gmail). Não precisa de cartão de crédito.
            </>
        ),
    },
    {
        title: 'Clique em "Create API key"',
        body: 'Na página de chaves, clique no botão "Create API key" (ou "Criar chave de API"). Se o Google pedir um projeto, escolha o projeto padrão sugerido — não precisa configurar nada.',
    },
    {
        title: 'Copie a sua chave',
        body: 'A chave aparece na tela e começa com "AIza". Clique no ícone de copiar. Guarde como uma senha: não compartilhe com ninguém.',
    },
    {
        title: 'Cole no Slidezz',
        body: 'Dentro do Slidezz, vá em Configurações → Integrações (ou no passo "Chave IA" do cadastro), cole a chave e salve. Pronto: suas imagens com IA estão liberadas, sem limite do nosso lado.',
    },
];

const faqs = [
    {
        icon: Wallet,
        q: 'Isso custa alguma coisa?',
        a: 'O Google oferece um nível gratuito da API do Gemini, com uma cota generosa de uso por dia — mais que suficiente pra gerar seus carrosséis. Se um dia você passar do limite gratuito, o uso é cobrado direto na sua conta Google, nunca pelo Slidezz.',
    },
    {
        icon: ShieldCheck,
        q: 'É seguro colar minha chave no Slidezz?',
        a: 'Sim. A chave é armazenada criptografada, nunca é exibida de volta e é usada exclusivamente pra gerar as imagens dos seus carrosséis. Você pode revogar a chave a qualquer momento no Google AI Studio.',
    },
    {
        icon: KeyRound,
        q: 'Por que eu preciso da minha própria chave?',
        a: 'Porque assim as imagens rodam na sua conta Google, usando o nível gratuito que é seu por direito. É isso que permite o Slidezz oferecer imagens ilimitadas em vez de te vender pacotinhos de créditos.',
    },
];

export default function GeminiKeyGuide() {
    return (
        <>
            <Head title="Como pegar sua chave Gemini grátis — Slidezz">
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
                {/* Nav */}
                <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
                            <AppLogoIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="mt-1 font-display text-2xl tracking-wide">Slidezz</span>
                    </Link>
                </header>

                {/* Hero */}
                <section className="mx-auto max-w-3xl px-6 pt-14 pb-10 text-center">
                    <div
                        className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
                        style={{ border: '1px solid #E8E7E2', background: '#fff' }}
                    >
                        <KeyRound className="h-3.5 w-3.5 text-[#1A1A1A]" />
                        Leva 2 minutos · 100% grátis
                    </div>
                    <h1 className="mb-4 font-display text-[52px] leading-[0.95] tracking-normal sm:text-[64px]">
                        Como pegar sua chave Gemini grátis
                    </h1>
                    <p className="mx-auto max-w-xl text-xl leading-relaxed font-medium text-[#555550]">
                        O Slidezz gera as imagens dos seus carrosséis com a API do Google Gemini usando a{' '}
                        <strong className="text-[#1A1A1A]">sua própria chave gratuita</strong>. Siga os 4 passos
                        abaixo e libere imagens ilimitadas.
                    </p>
                </section>

                {/* Steps */}
                <section className="mx-auto max-w-3xl space-y-4 px-6 pb-16">
                    {steps.map(({ title, body }, i) => (
                        <div
                            key={title}
                            className="flex gap-5 rounded-2xl bg-white p-7 sm:p-8"
                            style={{ border: '1px solid #E8E7E2', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}
                        >
                            <div
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
                                style={{ background: '#1A1A1A' }}
                            >
                                {i + 1}
                            </div>
                            <div>
                                <h2 className="mb-1.5 text-xl font-extrabold text-[#1A1A1A]">{title}</h2>
                                <p className="text-lg leading-relaxed font-medium text-[#555550]">{body}</p>
                            </div>
                        </div>
                    ))}

                    <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-4 text-lg font-bold text-white transition-colors hover:bg-[#333]"
                    >
                        Abrir o Google AI Studio <ExternalLink className="h-4 w-4" />
                    </a>
                </section>

                {/* FAQ */}
                <section style={{ borderTop: '1px solid #E8E7E2', background: '#FAFAF7' }}>
                    <div className="mx-auto max-w-3xl space-y-4 px-6 py-16">
                        <h2 className="mb-8 text-center font-display text-4xl tracking-normal">
                            Perguntas rápidas
                        </h2>
                        {faqs.map(({ icon: Icon, q, a }) => (
                            <div
                                key={q}
                                className="rounded-2xl bg-white p-7"
                                style={{ border: '1px solid #E8E7E2' }}
                            >
                                <div className="mb-2 flex items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FFE156]/30">
                                        <Icon className="h-4 w-4 text-[#1A1A1A]" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-[#1A1A1A]">{q}</h3>
                                </div>
                                <p className="text-base leading-relaxed font-medium text-[#555550]">{a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="mx-auto max-w-3xl px-6 py-16 text-center">
                    <div
                        className="rounded-2xl p-10 sm:p-12"
                        style={{ border: '1px solid #1A1A1A', background: '#1A1A1A' }}
                    >
                        <h2 className="mb-3 font-display text-4xl tracking-normal text-white sm:text-5xl">
                            Chave em mãos?
                        </h2>
                        <p className="mx-auto mb-8 max-w-md text-lg font-medium text-[#AAAAAA]">
                            Cole no Slidezz e comece a gerar carrosséis com imagens ilimitadas.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                href="/settings/integrations"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFE156] px-8 py-3.5 text-lg font-bold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D]"
                            >
                                Colar minha chave <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={register()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#333330] px-8 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[#222220]"
                            >
                                Ainda não tenho conta
                            </Link>
                        </div>
                        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-1.5">
                            {['Criptografada e nunca exibida de volta', 'Revogável a qualquer momento no Google'].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#666660]">
                                    <Check className="h-3.5 w-3.5 text-[#FFE156]" /> {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
