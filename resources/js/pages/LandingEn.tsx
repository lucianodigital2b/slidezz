import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronDown, Sprout, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { dashboard, login, register } from '@/routes';

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
    {
        title: 'AI-Generated Carousels',
        body: 'You provide the theme and tone; AI assembles the slides with a coherent layout, ready to publish — no starting from scratch in Canva.',
    },
    {
        title: 'Ready-Made Text & Script',
        body: 'Titles, hooks, and slide text are suggested by AI — you just adjust what you want, without relying on ChatGPT in another tab.',
    },
    {
        title: 'Simple Visual Editor',
        body: 'Adjust colors, fonts, and images with drag and drop. No steep learning curve of heavy professional tools.',
    },
    {
        title: 'Full HD Export',
        body: 'Download in PNG at 1080px — ideal format for Instagram feed and carousels — without losing sharpness.',
    },
    {
        title: 'Content in Minutes',
        body: 'The workflow is designed for you to produce multiple carousels in the same session. Less time on design, more time selling.',
    },
    {
        title: 'Community for Creators',
        body: 'Exchange with other creators, references, and posting rhythm — for those who want consistency, not posting blindly.',
    },
];

const comparisonItems = [
    { label: 'Canva Pro (design)', price: '$14.99/mo' },
    { label: 'ChatGPT Plus (texts & ideas)', price: '$20.00/mo' },
    { label: 'Google Gemini (AI image)', price: '$19.99/mo' },
    { label: 'Adobe Photoshop (editor)', price: '$22.99/mo' },
    { label: 'Freelance Designer (layouts)', price: '$300.00/mo' },
    { label: 'Freelance Copywriter (scripts)', price: '$150.00/mo' },
];

const testimonials = [
    {
        name: 'Camila Alves',
        role: 'B2B Marketing',
        quote: 'Funnel carousel hit +48% saves vs. the rest of the feed in the same month — without me spending the weekend on Canva.',
        initials: 'CA',
    },
    {
        name: 'Rafael Santos',
        role: 'Infoproduct Creator',
        quote: 'A lead asked which agency did the layout. It was me on Slidezz at night. The following Tuesday, he closed a consulting package.',
        initials: 'RS',
    },
    {
        name: 'Juliana Menezes',
        role: 'Mentor',
        quote: 'Before, I recorded Reels on the fly. Now the weekly carousel is ready on Sunday — I just adapt the hook for the video.',
        initials: 'JM',
    },
    {
        name: 'Lucas Pereira',
        role: 'Fitness',
        quote: 'I tested the hook AI suggested on the 1st slide: saves went from 4% → 11% in the same niche. It wasn\'t luck.',
        initials: 'LP',
    },
    {
        name: 'Bianca Ferreira',
        role: 'Aesthetics',
        quote: 'Same template, skincare and accountant — I just change the palette. Client said it looked like a brand with rebranding.',
        initials: 'BF',
    },
    {
        name: 'Diego Rocha',
        role: 'Consultant',
        quote: 'DMs with "how much does it cost?" tripled in the month I standardized carousels. It coincided with Slidezz — it wasn\'t random virality.',
        initials: 'DR',
    },
];

const faqs = [
    {
        q: 'Do I need to know design?',
        a: 'No. AI does everything. You just type the theme and the carousel is ready — text, layout, and professional design.',
    },
    {
        q: 'Does it work for any niche?',
        a: 'Yes. Digital marketing, fitness, gastronomy, education, fashion, coaching, finance — AI adapts to your niche and tone of voice.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. No penalty, no loyalty period. Cancel directly in the panel in 2 clicks.',
    },
    {
        q: 'Does AI also generate the texts?',
        a: 'Yes! Titles, subtitles, persuasive texts, and CTAs — all automatically generated and optimized for engagement.',
    },
    {
        q: 'How many carousels can I create?',
        a: 'Unlimited. There\'s no lock. Create as many as you want, whenever you want.',
    },
    {
        q: 'Does it work on mobile?',
        a: 'It works in the browser on any device — computer, tablet, or mobile. No installation needed.',
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border-b last:border-b-0 cursor-pointer"
            style={{ borderColor: '#E8E7E2' }}
            onClick={() => setOpen((v) => !v)}
        >
            <div className="flex items-center justify-between gap-4 py-5">
                <span className="text-lg font-bold">{q}</span>
                <ChevronDown
                    className="w-4 h-4 flex-shrink-0 text-[#888880] transition-transform duration-200"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </div>
            {open && (
                <p className="text-lg text-[#555550] font-medium pb-5 leading-relaxed">{a}</p>
            )}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingEn({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props as any;
    const ctaHref = auth.user ? dashboard() : canRegister ? register() : login();

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

    const totalComparison = '$527.97/month';

    return (
        <>
            <Head title="Slidezz — Generate Viral Carousels in Under 1 Minute">
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
                {/* ── TOP BAR ── */}
                <div
                    className="text-center py-2.5 font-bold tracking-wide"
                    style={{ background: '#1A1A1A', color: '#E8440A' }}
                >
                    ⚡ Limited spots — access may close at any moment
                </div>

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
                            <span className="text-2xl font-[Bebas_Neue] tracking-wide mt-1">Slidezz</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-8 text-lg font-semibold text-[#444440]">
                            <a href="#how-it-works" className="hover:text-[#1A1A1A] transition-colors">How it works</a>
                            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
                            <a href="#testimonials" className="hover:text-[#1A1A1A] transition-colors">Results</a>
                        </nav>

                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 bg-[#E8440A] text-white text-lg font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-80"
                        >
                            {auth.user ? 'Go to app' : 'Stop wasting time'}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
                    <div
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold mb-8"
                        style={{ border: '1px solid #1A1A1A', background: '#fff' }}
                    >
                        <Zap className="w-3.5 h-3.5 fill-[#E8440A] text-[#E8440A]" />
                        AI-powered content at scale
                    </div>

                    <h1 className="text-[64px] lg:text-[88px] leading-[0.95] font-[Bebas_Neue] tracking-normal mb-6 max-w-4xl mx-auto">
                        Generate viral carousels{' '}
                        <span className="text-[#E8440A]">in less than 1 minute.</span>
                    </h1>

                    <p className="text-[#555550] text-xl font-medium leading-relaxed mb-4 max-w-2xl mx-auto">
                        AI does everything for you: persuasive text, professional design, and posts ready to publish.
                    </p>
                    <p className="text-[#888880] text-lg font-semibold mb-10">
                        <span className="line-through">No Canva.</span>{' '}
                        <span className="line-through">No designer.</span>{' '}
                        <span className="line-through">No wasted hours.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 bg-[#E8440A] text-white text-lg font-bold px-8 py-4 rounded-full transition-opacity hover:opacity-80"
                        >
                            I Want to Create Viral Carousels
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <p className="text-lg text-[#888880] font-semibold">
                        Used by <strong className="text-[#1A1A1A]">creators and professionals</strong> who publish consistently.
                    </p>
                </section>

                {/* ── PROBLEM ── */}
                <section
                    style={{ borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', background: '#1A1A1A' }}
                >
                    <div className="mx-auto max-w-4xl px-6 py-24 text-center">
                        <p className="font-bold uppercase tracking-widest text-[#E8440A] mb-4">The truth no one tells you</p>
                        <h2 className="text-5xl lg:text-7xl font-[Bebas_Neue] leading-[0.95] tracking-normal text-white mb-8">
                            Here's the brutal truth about Instagram in 2026
                        </h2>
                        <div className="text-left space-y-5 max-w-2xl mx-auto">
                            <p className="text-[#AAAAAA] text-lg font-medium leading-relaxed">
                                The <strong className="text-white">CEO of Instagram</strong> himself confirmed: the algorithm prioritizes carousels above any other format. Those who don't post carousels <strong className="text-white">simply don't appear.</strong>
                            </p>
                            <p className="text-[#AAAAAA] text-lg font-medium leading-relaxed">
                                While you spend <strong className="text-white">2–3 hours on Canva</strong> trying to make a pretty post, your competitors are using AI to create 10 viral carousels in the time it takes you to make 1.
                            </p>
                            <p className="text-[#AAAAAA] text-lg font-medium leading-relaxed">
                                The difference between those who sell on Instagram and those who just post pretty pictures?{' '}
                                <strong className="text-white">Speed + Consistency.</strong> And that's exactly what Slidezz delivers.
                            </p>
                        </div>
                        <div className="mt-10">
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center gap-2 text-lg font-bold px-7 py-3.5 rounded-full transition-opacity hover:opacity-80"
                                style={{ border: '1px solid #E8440A', background: '#E8440A', color: '#fff' }}
                            >
                                I Want to Stop Wasting Time
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
                    <div className="text-center mb-16">
                        <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">In 3 steps</p>
                        <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">So simple it feels like magic</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                step: '01',
                                title: 'Describe your content',
                                body: 'Type the theme, niche, and tone of voice. It can be a simple phrase like "5 digital marketing tips."',
                            },
                            {
                                step: '02',
                                title: 'AI creates everything',
                                body: 'In seconds, AI generates persuasive text, chooses the perfect layout, and assembles the complete carousel.',
                            },
                            {
                                step: '03',
                                title: 'Publish and go viral',
                                body: 'Export in Full HD or schedule directly. Done — your carousel is live, gaining followers.',
                            },
                        ].map(({ step, title, body }) => (
                            <div
                                key={step}
                                className="rounded-2xl p-8 bg-white"
                                style={{ border: '1px solid #1A1A1A' }}
                            >
                                <div
                                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-extrabold mb-6"
                                    style={{ border: '1px solid #1A1A1A', background: '#1A1A1A', color: '#fff' }}
                                >
                                    {step}
                                </div>
                                <h3 className="text-xl font-extrabold mb-3">{title}</h3>
                                <p className="text-lg text-[#555550] font-medium leading-relaxed">{body}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 text-lg font-bold px-7 py-3.5 rounded-full transition-opacity hover:opacity-80"
                            style={{ border: '1px solid #1A1A1A', background: '#1A1A1A', color: '#fff' }}
                        >
                            I Want to Create My First Carousel
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section
                    style={{ borderTop: '1px solid #E8E7E2', background: '#FAFAF7' }}
                >
                    <div className="mx-auto max-w-6xl px-6 py-24">
                        <div className="text-center mb-16">
                            <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">What's inside</p>
                            <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">
                                AI trained to grab attention
                            </h2>
                            <p className="text-[#555550] font-medium mt-3 max-w-lg mx-auto text-lg leading-relaxed">
                                You don't need a mega prompt from other AIs: the entire flow is already calibrated to go viral and stand out in the feed.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {features.map(({ title, body }) => (
                                <div
                                    key={title}
                                    className="rounded-2xl p-6 bg-white"
                                    style={{ border: '1px solid #E8E7E2' }}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                                        style={{ background: '#E8440A' }}
                                    >
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-lg font-extrabold mb-2">{title}</h3>
                                    <p className="text-lg text-[#555550] font-medium leading-relaxed">{body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── PRICE ANCHOR ── */}
                <section style={{ borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', background: '#1A1A1A' }}>
                    <div className="mx-auto max-w-3xl px-6 py-24">
                        <div className="text-center mb-12">
                            <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">Do the math</p>
                            <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-[0.95] text-white">
                                How much would you pay<br />for all this separately?
                            </h2>
                        </div>

                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #333330' }}>
                            {comparisonItems.map(({ label, price }, i) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between px-6 py-4"
                                    style={{
                                        background: i % 2 === 0 ? '#222220' : '#1E1E1C',
                                        borderBottom: i < comparisonItems.length - 1 ? '1px solid #2A2A28' : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <X className="w-3.5 h-3.5 text-[#555550] flex-shrink-0" />
                                        <span className="text-lg font-semibold text-[#AAAAAA]">{label}</span>
                                    </div>
                                    <span className="text-lg font-bold text-[#666660]">{price}</span>
                                </div>
                            ))}
                            <div
                                className="flex items-center justify-between px-6 py-5"
                                style={{ background: '#2A0E00', borderTop: '1px solid #E8440A' }}
                            >
                                <span className="text-lg font-extrabold text-white">Total (if bought separately)</span>
                                <span className="text-xl font-extrabold text-[#E8440A]">{totalComparison}</span>
                            </div>
                        </div>

                        <p className="text-center text-lg text-[#666660] font-medium mt-6 leading-relaxed">
                            That's what you <em>could</em> spend. With Slidezz, everything is in one place — for a fraction of the cost.
                        </p>
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
                    <div className="text-center mb-12">
                        <h2 className="text-6xl font-[Bebas_Neue] tracking-normal text-[#1A1A1A] mb-3">
                            Simple, the way it should be
                        </h2>
                        <p className="text-lg text-[#666660] font-medium">
                            No gotchas. Cancel whenever you want.
                        </p>
                    </div>

                    {/* Toggle */}
                    <div className="flex justify-center mb-12">
                        <div className="flex items-center gap-3 bg-white rounded-full p-1 border border-[#E8E7E2] shadow-sm">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 text-lg font-bold rounded-full transition-colors ${
                                    billingCycle === 'monthly' ? 'bg-[#E8440A] text-white' : 'text-[#666660] hover:text-[#1A1A1A]'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-6 py-2 text-lg font-bold rounded-full flex items-center gap-2 transition-colors ${
                                    billingCycle === 'annual' ? 'bg-[#E8440A] text-white' : 'text-[#666660] hover:text-[#1A1A1A]'
                                }`}
                            >
                                Annual
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                    billingCycle === 'annual' ? 'bg-[#A3E635] text-[#1A1A1A]' : 'bg-[#E8F5E9] text-[#28CA41]'
                                }`}>
                                    up to 50% OFF
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 items-stretch">
                        {/* Starter */}
                        <div className="bg-white rounded-[24px] p-8 border border-[#E8E7E2] flex flex-col shadow-sm relative">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">Starter</h3>
                                {billingCycle === 'annual' && (
                                    <span className="bg-[#E8F5E9] text-[#28CA41] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                        20% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="text-lg text-[#888880] font-semibold line-through mb-1">$36/mo</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] font-extrabold text-[#1A1A1A] leading-none">$29</span>
                                            <span className="text-[#666660] font-medium text-lg">/mo</span>
                                        </div>
                                        <div className="text-sm text-[#888880] mt-2 font-medium">billed annually</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-lg text-transparent font-semibold mb-1 select-none">&nbsp;</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] font-extrabold text-[#1A1A1A] leading-none">$36</span>
                                            <span className="text-[#666660] font-medium text-lg">/mo</span>
                                        </div>
                                        <div className="text-sm text-[#888880] mt-2 font-medium">billed monthly</div>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-lg font-bold text-[#1A1A1A] mb-6 pb-6 border-b border-[#E8E7E2]">
                                <Check className="w-4 h-4 text-[#E8440A]" />
                                10 carousels per month
                            </div>

                            <div className="text-sm font-bold text-[#888880] mb-4">Basic features:</div>
                            <ul className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    'Unlimited post suggestions',
                                    'Carousel generation',
                                    'Instagram integration',
                                    'AutoFeed (100% automatic)'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-lg font-medium text-[#555550]">
                                        <Check className="w-4 h-4 text-[#E8440A] flex-shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="w-full text-center bg-[#1A1A1A] hover:bg-[#333] text-white text-lg font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Try it now <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="bg-white rounded-[24px] p-8 border-2 border-[#E8440A] flex flex-col shadow-lg relative transform md:-translate-y-4">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0F766E] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">
                                Most popular
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">Pro</h3>
                                {billingCycle === 'annual' && (
                                    <span className="bg-[#E8F5E9] text-[#28CA41] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                        35% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="text-lg text-[#888880] font-semibold line-through mb-1">$120/mo</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] font-extrabold text-[#1A1A1A] leading-none">$79</span>
                                            <span className="text-[#666660] font-medium text-lg">/mo</span>
                                        </div>
                                        <div className="text-sm text-[#888880] mt-2 font-medium">billed annually</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-lg text-transparent font-semibold mb-1 select-none">&nbsp;</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] font-extrabold text-[#1A1A1A] leading-none">$120</span>
                                            <span className="text-[#666660] font-medium text-lg">/mo</span>
                                        </div>
                                        <div className="text-sm text-[#888880] mt-2 font-medium">billed monthly</div>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-lg font-bold text-[#1A1A1A] mb-6 pb-6 border-b border-[#E8E7E2]">
                                <Check className="w-4 h-4 text-[#E8440A]" />
                                30 carousels per month
                            </div>

                            <div className="text-sm font-bold text-[#888880] mb-4">Everything in Starter, plus:</div>
                            <ul className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    'Turn news into posts',
                                    'Your photos in content',
                                    'Team management',
                                    'WhatsApp assistant (coming soon)'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-lg font-medium text-[#555550]">
                                        <Check className="w-4 h-4 text-[#E8440A] flex-shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="w-full text-center bg-[#E8440A] hover:bg-[#D13D09] text-white text-lg font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Try it now <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Enterprise */}
                        <div className="bg-[#1A1A1A] rounded-[24px] p-8 border border-[#333330] flex flex-col shadow-lg relative">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-extrabold text-white">Enterprise</h3>
                            </div>
                            <div className="mb-6">
                                <div className="text-lg text-[#AAAAAA] font-semibold mb-1">Custom pricing</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[40px] font-extrabold text-white leading-none">Custom</span>
                                </div>
                                <div className="text-sm text-[#888880] mt-2 font-medium">billed annually</div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-lg font-bold text-[#FCD34D] mb-6 pb-6 border-b border-[#333330]">
                                <Check className="w-4 h-4 text-[#FCD34D]" />
                                On-demand content
                            </div>

                            <div className="text-sm font-bold text-[#AAAAAA] mb-4">Everything in Pro, plus:</div>
                            <ul className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    'Multiple projects',
                                    'API access',
                                    'Client area & approval',
                                    'Team training'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-lg font-medium text-[#DDDDCC]">
                                        <Check className="w-4 h-4 text-[#FCD34D] flex-shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={ctaHref}
                                className="w-full text-center bg-[#E8440A] hover:bg-[#D13D09] text-white text-lg font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Contact us <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── TESTIMONIALS ── */}
                <section
                    id="testimonials"
                    style={{ borderTop: '1px solid #E8E7E2', background: '#FAFAF7' }}
                >
                    <div className="mx-auto max-w-6xl px-6 py-24">
                        <div className="text-center mb-16">
                            <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">Results from those who publish</p>
                            <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">See what our clients say</h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {testimonials.map(({ name, role, quote, initials }) => (
                                <div
                                    key={name}
                                    className="rounded-2xl p-6 bg-white flex flex-col gap-4"
                                    style={{ border: '1px solid #E8E7E2' }}
                                >
                                    <p className="text-lg font-medium text-[#333330] leading-relaxed flex-1">
                                        "{quote}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0"
                                            style={{ background: '#1A1A1A' }}
                                        >
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="text-lg font-extrabold">{name}</p>
                                            <p className="text-sm text-[#888880] font-semibold">{role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section className="mx-auto max-w-3xl px-6 py-24">
                    <div className="text-center mb-14">
                        <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">FAQ</p>
                        <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">Frequently asked questions</h2>
                    </div>

                    <div
                        className="rounded-2xl bg-white px-8"
                        style={{ border: '1px solid #E8E7E2' }}
                    >
                        {faqs.map(({ q, a }) => (
                            <FaqItem key={q} q={q} a={a} />
                        ))}
                    </div>
                </section>

                {/* ── CTA FINAL ── */}
                <section id="cta" className="mx-auto max-w-6xl px-6 pb-24">
                    <div
                        className="rounded-2xl p-16 text-center"
                        style={{ border: '1px solid #1A1A1A', background: '#1A1A1A' }}
                    >
                        <div
                            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold mb-8"
                            style={{ border: '1px solid #333330', background: '#222220', color: '#E8440A' }}
                        >
                            <Zap className="w-3.5 h-3.5 fill-[#E8440A]" />
                            AI-powered carousel generator
                        </div>

                        <h2 className="text-6xl lg:text-[80px] font-[Bebas_Neue] leading-[0.95] tracking-normal text-white mb-4">
                            Start going viral today.
                        </h2>
                        <p className="text-[#666660] font-medium mb-10 max-w-sm mx-auto text-lg leading-relaxed">
                            Scale and go viral automatically with AI. No Canva. No designer. No wasted hours.
                        </p>
                        <Link
                            href={ctaHref}
                            className="inline-flex items-center gap-2 text-lg font-bold px-8 py-4 rounded-full transition-opacity hover:opacity-80"
                            style={{ border: '1px solid #E8440A', background: '#E8440A', color: '#fff' }}
                        >
                            I Want to Create Viral Carousels
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-[#444440] font-medium mt-5">No credit card required. Cancel anytime.</p>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer style={{ borderTop: '1px solid #1A1A1A', background: '#1A1A1A' }}>
                    <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                                <Sprout className="w-3.5 h-3.5 text-[#1A1A1A]" />
                            </div>
                            <span className="text-2xl font-[Bebas_Neue] tracking-wide text-white mt-1">Slidezz</span>
                        </div>
                        <div className="flex items-center gap-8 text-lg font-semibold text-[#555550]">
                            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                            <a href="#testimonials" className="hover:text-white transition-colors">Results</a>
                        </div>
                        <p className="text-[#444440] font-medium">© 2026 Slidezz. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
