import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronDown, Sparkles, TrendingUp, X, Zap } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import FeatureBento from '@/components/feature-bento';
import LandingFooter from '@/components/landing-footer';
import ScrollStack from '@/components/scroll-stack';
import TestimonialMarquee from '@/components/testimonial-marquee';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

// ─── Data ────────────────────────────────────────────────────────────────────

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
            className="rounded-2xl bg-white transition-shadow duration-300"
            style={{
                border: '1px solid #1A1A1A',
                boxShadow: open ? '0 14px 36px rgba(0,0,0,0.08)' : 'none',
            }}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-5 px-7 py-6 text-left sm:px-8 sm:py-7"
            >
                <span className="text-xl font-extrabold text-[#1A1A1A]">{q}</span>
                <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                    style={{
                        border: '1px solid #1A1A1A',
                        background: open ? '#E8440A' : '#F3EEE8',
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
                    <p className="px-7 pb-7 text-lg font-medium leading-relaxed text-[#555550] sm:px-8">
                        {a}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingEn({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props as any;
    const ctaHref = auth.user ? dashboard() : canRegister ? register() : login();

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
    const scrolled = useScrolled();

    // Final CTA card grows in width as it scrolls into view (up to 90% of viewport).
    const ctaRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();
    const { scrollYProgress: ctaProgress } = useScroll({
        target: ctaRef,
        offset: ['start end', 'center center'],
    });
    const ctaWidth = useTransform(ctaProgress, [0, 1], ['66vw', '90vw']);

    const signupUrl = canRegister ? register().url : login().url;

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
                style={{ background: '#F9F6F4', color: '#1A1A1A' }}
            >
                {/* ── TOP BAR ── */}
                <div
                    className="text-center py-2.5 font-bold tracking-wide"
                    style={{ background: '#1A1A1A', color: '#E8440A' }}
                >
                    ⚡ Limited spots — access may close at any moment
                </div>

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
                            'h-16 flex items-center justify-between transition-all duration-300',
                            scrolled
                                ? 'rounded-[64px] border border-black/10 bg-white/70 px-6 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl'
                                : 'px-0',
                        )}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                                <AppLogoIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-2xl font-[Bebas_Neue] tracking-wide mt-1">Slidezz</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-8 text-lg font-semibold text-[#444440]">
                            <a href="#how-it-works" className="hover:text-[#1A1A1A] transition-colors">How it works</a>
                            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
                            <a href="#testimonials" className="hover:text-[#1A1A1A] transition-colors">Results</a>
                        </nav>

                        <div className="flex items-center gap-3">
                            {!auth.user && (
                                <Link href={login()} className="hidden md:inline-flex text-lg font-semibold text-[#444440] hover:text-[#1A1A1A] transition-colors px-2">
                                    Login
                                </Link>
                            )}
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center gap-2 bg-[#E8440A] text-white text-lg font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-80"
                            >
                                {auth.user ? 'Go to app' : 'Stop wasting time'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="relative overflow-hidden">
                    {/* right-side grid accent */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 right-0 hidden w-3/5 lg:block"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                            WebkitMaskImage:
                                'radial-gradient(120% 90% at 78% 45%, #000 38%, transparent 78%)',
                            maskImage: 'radial-gradient(120% 90% at 78% 45%, #000 38%, transparent 78%)',
                        }}
                    />

                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-24 lg:grid-cols-2 lg:gap-10 lg:pt-20">
                        {/* LEFT — copy + capture */}
                        <div>
                            <div
                                className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
                                style={{ border: '1px solid #1A1A1A', background: '#fff' }}
                            >
                                <Zap className="h-3.5 w-3.5 fill-[#E8440A] text-[#E8440A]" />
                                AI-powered content at scale
                            </div>

                            <h1 className="font-[Bebas_Neue] text-[58px] leading-[0.92] tracking-normal sm:text-[72px] lg:text-[82px]">
                                Generate viral carousels{' '}
                                <span className="text-[#E8440A]">in less than 1 minute.</span>
                            </h1>

                            <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-[#555550]">
                                AI writes the hook, designs every slide, and hands you a post ready to
                                publish. No Canva, no designer, no wasted hours.
                            </p>

                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-4 text-lg font-bold text-white transition-opacity hover:opacity-80"
                                >
                                    Go to the app <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <form
                                    action={signupUrl}
                                    method="get"
                                    className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                                >
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="Enter your email"
                                        className="h-14 flex-1 rounded-full bg-white px-5 text-base text-[#1A1A1A] outline-none transition-shadow placeholder:text-[#888880] focus:ring-2 focus:ring-[#1A1A1A]/15"
                                        style={{ border: '1px solid #DDD7CC' }}
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-7 text-base font-bold text-white transition-opacity hover:opacity-80"
                                    >
                                        Reserve my spot <ArrowRight className="h-4 w-4" />
                                    </button>
                                </form>
                            )}

                            <div className="mt-7 flex items-center gap-3">
                                <div className="flex">
                                    {[
                                        { i: 'MD', bg: '#1A1A1A' },
                                        { i: 'RS', bg: '#E8440A' },
                                        { i: 'JM', bg: '#2563EB' },
                                    ].map((p) => (
                                        <span
                                            key={p.i}
                                            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold text-white first:ml-0"
                                            style={{ background: p.bg, border: '2px solid #F9F6F4' }}
                                        >
                                            {p.i}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm font-semibold text-[#888880]">
                                    <strong className="text-[#1A1A1A]">Creators</strong> are already on the beta
                                </p>
                            </div>
                        </div>

                        {/* RIGHT — image card */}
                        <div className="relative mx-auto w-full max-w-md">
                            <div
                                className="overflow-hidden rounded-[2rem] bg-white"
                                style={{
                                    border: '1px solid #1A1A1A',
                                    boxShadow: '0 30px 60px -20px rgba(24,18,48,0.30)',
                                }}
                            >
                                {/* Placeholder image — swap for final art */}
                                <img
                                    src="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=900&h=1100&q=80"
                                    alt="Creator placeholder"
                                    className="aspect-[4/5] w-full object-cover grayscale"
                                />
                            </div>

                            {/* floating stat card */}
                            <div
                                className="absolute -bottom-5 -left-3 w-60 rounded-2xl bg-white/95 p-2 backdrop-blur sm:left-6"
                                style={{
                                    border: '1px solid #1A1A1A',
                                    boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                                }}
                            >
                                <div className="flex items-center gap-3 px-2 py-2">
                                    <span
                                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white"
                                        style={{ background: '#E8440A' }}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <div className="text-sm font-extrabold text-[#1A1A1A]">Carousel ready</div>
                                        <div className="text-xs font-medium text-[#888880]">Generated in 42s</div>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-3 px-2 py-2"
                                    style={{ borderTop: '1px solid #EFEAE3' }}
                                >
                                    <span
                                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#1A1A1A]"
                                        style={{ border: '1px solid #1A1A1A' }}
                                    >
                                        <TrendingUp className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <div className="text-sm font-extrabold text-[#1A1A1A]">+48% saves</div>
                                        <div className="text-xs font-medium text-[#888880]">vs. the rest of the feed</div>
                                    </div>
                                </div>
                            </div>

                            {/* pager dots */}
                            <div aria-hidden className="mt-8 flex justify-center gap-1.5">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <span
                                        key={i}
                                        className="h-1.5 rounded-full"
                                        style={{
                                            width: i === 4 ? 20 : 6,
                                            background: i === 4 ? '#1A1A1A' : 'rgba(26,26,26,0.2)',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
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
                <section id="how-it-works" className="mx-auto max-w-6xl px-6 pt-24">
                    <div className="text-center mb-4">
                        <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">In 3 steps</p>
                        <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">So simple it feels like magic</h2>
                    </div>

                    <ScrollStack
                        items={[
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
                                body: 'Export in Full HD or schedule directly. Done. Your carousel is live, gaining followers.',
                            },
                        ].map(({ step, title, body }) => (
                            <div
                                key={step}
                                className="flex min-h-[300px] flex-col justify-center rounded-[24px] bg-white p-10 sm:p-12"
                                style={{ border: '1px solid #1A1A1A', boxShadow: '0 24px 48px rgba(0,0,0,0.10)' }}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div
                                        className="flex w-12 h-12 items-center justify-center rounded-full text-lg font-extrabold"
                                        style={{ background: '#1A1A1A', color: '#fff' }}
                                    >
                                        {step}
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-[#888880]">
                                        Step {step}
                                    </span>
                                </div>
                                <h3 className="text-3xl sm:text-4xl font-[Bebas_Neue] tracking-normal mb-3 leading-none">
                                    {title}
                                </h3>
                                <p className="text-lg text-[#555550] font-medium leading-relaxed max-w-xl">{body}</p>
                            </div>
                        ))}
                    />

                    <div className="text-center pb-24">
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

                        <FeatureBento />
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
                    className="py-24"
                    style={{ borderTop: '1px solid #E8E7E2', background: '#FAFAF7' }}
                >
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">Results from those who publish</p>
                            <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">See what our clients say</h2>
                        </div>
                    </div>

                    <TestimonialMarquee items={testimonials} />
                </section>

                {/* ── FAQ ── */}
                <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
                    <div className="text-center mb-14">
                        <p className="font-bold uppercase tracking-widest text-[#888880] mb-3">FAQ</p>
                        <h2 className="text-5xl lg:text-6xl font-[Bebas_Neue] tracking-normal leading-none">Frequently asked questions</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map(({ q, a }) => (
                            <FaqItem key={q} q={q} a={a} />
                        ))}
                    </div>
                </section>

                {/* ── CTA FINAL ── */}
                <section id="cta" className="flex justify-center overflow-x-hidden px-4 pb-24">
                    <motion.div
                        ref={ctaRef}
                        style={{
                            width: reduceMotion ? '90vw' : ctaWidth,
                            border: '1px solid #1A1A1A',
                            background: '#1A1A1A',
                        }}
                        className="rounded-[3rem] p-10 text-center sm:p-16"
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
                    </motion.div>
                </section>

                {/* ── FOOTER ── */}
                <LandingFooter
                    reachOutTitle="Reach out to us"
                    contact={{
                        title: 'Talk to us',
                        subtitle: 'We usually reply within 24h',
                        href: 'mailto:hello@slidezz.app',
                    }}
                    columns={[
                        {
                            title: 'Explore',
                            links: [
                                { label: 'How it works', href: '#how-it-works' },
                                { label: 'Pricing', href: '#pricing' },
                                { label: 'Results', href: '#testimonials' },
                            ],
                        },
                        {
                            title: 'Help',
                            links: [
                                { label: 'FAQs', href: '#faq' },
                                { label: 'Contact', href: 'mailto:hello@slidezz.app' },
                            ],
                        },
                    ]}
                    socialLabel="Social Media"
                    rights="© 2026 Slidezz. All rights reserved."
                    legal={[
                        { label: 'Terms of Service', href: '#' },
                        { label: 'Privacy Policy', href: '#' },
                        { label: 'Cookies Policy', href: '#' },
                    ]}
                />
            </div>
        </>
    );
}
