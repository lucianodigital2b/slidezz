import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChevronDown,
    Sparkles,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';
import {
    motion,
    useReducedMotion,
    useScroll,
    useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import CtaButton from '@/components/cta-button';
import FadeIn from '@/components/fade-in';
import FeatureBento from '@/components/feature-bento';
import LandingFooter from '@/components/landing-footer';
import ScrollStack from '@/components/scroll-stack';
import TestimonialMarquee from '@/components/testimonial-marquee';
import { TextShimmer } from '@/components/text-shimmer';
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
        quote: "I tested the hook AI suggested on the 1st slide: saves went from 4% → 11% in the same niche. It wasn't luck.",
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
        a: 'Each plan includes a monthly carousel allowance (30 on Starter, 100 on Pro, 300 on Agency). AI images are included — and on Pro and Agency you can connect your own Gemini key (BYOK) for unlimited images.',
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
                    <p className="px-7 pb-7 text-lg leading-relaxed font-medium text-[#555550] sm:px-8">
                        {a}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingEn({
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

    // Final CTA card grows in width as it scrolls into view (up to 90% of viewport).
    const ctaRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();
    const { scrollYProgress: ctaProgress } = useScroll({
        target: ctaRef,
        offset: ['start end', 'center center'],
    });
    const ctaWidth = useTransform(ctaProgress, [0, 1], ['66vw', '90vw']);

    const signupUrl = canRegister ? register().url : login().url;

    // Guest checkout: the user picks a plan here and creates their account on
    // Stripe Checkout itself. Cycle follows the monthly/annual toggle.
    const startCheckout = (plan: 'starter' | 'pro' | 'agency') => {
        router.post('/checkout', { plan, cycle: billingCycle });
    };

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
                    className="py-2.5 text-center font-bold tracking-wide"
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
                                    href="#how-it-works"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    How it works
                                </a>
                                <a
                                    href="#pricing"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    Pricing
                                </a>
                                <a
                                    href="#testimonials"
                                    className="transition-colors hover:text-[#1A1A1A]"
                                >
                                    Results
                                </a>
                            </nav>

                            <div className="flex items-center gap-3">
                                {!auth.user && (
                                    <Link
                                        href={login()}
                                        className="hidden px-2 text-lg font-semibold text-[#444440] transition-colors hover:text-[#1A1A1A] md:inline-flex"
                                    >
                                        Login
                                    </Link>
                                )}
                                <CtaButton
                                    href={ctaHref}
                                    className="py-1 pr-1 pl-5 text-base"
                                >
                                    {auth.user
                                        ? 'Go to app'
                                        : 'Stop wasting time'}
                                </CtaButton>
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
                            maskImage:
                                'radial-gradient(120% 90% at 78% 45%, #000 38%, transparent 78%)',
                        }}
                    />

                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-24 lg:grid-cols-2 lg:gap-10 lg:pt-20">
                        {/* LEFT — copy + capture */}
                        <div>
                            <div
                                className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
                                style={{
                                    border: '1px solid #E8E7E2',
                                    background: '#fff',
                                }}
                            >
                                <Zap className="h-3.5 w-3.5 fill-[#E8440A] text-[#E8440A]" />
                                AI-powered content at scale
                            </div>

                            <h1 className="font-bold font-display text-[58px] leading-[0.92] tracking-normal sm:text-[72px] lg:text-[74px]">
                                Generate viral carousels{' '}
                                <TextShimmer
                                    as="span"
                                    duration={2.5}
                                    spread={3}
                                >
                                    in less than 1 minute.
                                </TextShimmer>
                            </h1>

                            <p className="mt-6 max-w-md text-lg leading-relaxed font-medium text-[#555550]">
                                AI writes the hook, designs every slide, and
                                hands you a post ready to publish. No Canva, no
                                designer, no wasted hours.
                            </p>

                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-4 text-lg font-bold text-white transition-opacity hover:opacity-80"
                                >
                                    Go to the app{' '}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <></>
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
                                            style={{
                                                background: p.bg,
                                                border: '2px solid #F9F6F4',
                                            }}
                                        >
                                            {p.i}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm font-semibold text-[#888880]">
                                    <strong className="text-[#1A1A1A]">
                                        Creators
                                    </strong>{' '}
                                    are already on the beta
                                </p>
                            </div>
                        </div>

                        {/* RIGHT — image card */}
                        <div className="relative mx-auto w-full max-w-md">
                            <div
                                className="overflow-hidden rounded-[2rem] bg-white"
                                style={{
                                    boxShadow:
                                        '0 30px 60px -20px rgba(24,18,48,0.30)',
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
                                        <div className="text-sm font-extrabold text-[#1A1A1A]">
                                            Carousel ready
                                        </div>
                                        <div className="text-xs font-medium text-[#888880]">
                                            Generated in 42s
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-3 px-2 py-2"
                                    style={{ borderTop: '1px solid #EFEAE3' }}
                                >
                                    <span
                                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#1A1A1A]"
                                        style={{ border: '1px solid #E8E7E2' }}
                                    >
                                        <TrendingUp className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <div className="text-sm font-extrabold text-[#1A1A1A]">
                                            +48% saves
                                        </div>
                                        <div className="text-xs font-medium text-[#888880]">
                                            vs. the rest of the feed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* pager dots */}
                            <div
                                aria-hidden
                                className="mt-8 flex justify-center gap-1.5"
                            >
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <span
                                        key={i}
                                        className="h-1.5 rounded-full"
                                        style={{
                                            width: i === 4 ? 20 : 6,
                                            background:
                                                i === 4
                                                    ? '#1A1A1A'
                                                    : 'rgba(26,26,26,0.2)',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── PROBLEM ── */}
                <section
                    style={{
                        borderTop: '1px solid #1A1A1A',
                        borderBottom: '1px solid #1A1A1A',
                        background: '#1A1A1A',
                    }}
                >
                    <FadeIn className="mx-auto max-w-4xl px-6 py-24 text-center">
                        <p className="mb-4 font-bold tracking-widest text-[#E8440A] uppercase">
                            The truth no one tells you
                        </p>
                        <h2 className="mb-8 font-display font-bold text-5xl leading-[0.95] tracking-normal text-white lg:text-7xl">
                            Here's the brutal truth about Instagram in 2026
                        </h2>
                        <div className="mx-auto max-w-2xl space-y-5 text-left">
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                The{' '}
                                <strong className="text-white">
                                    CEO of Instagram
                                </strong>{' '}
                                himself confirmed: the algorithm prioritizes
                                carousels above any other format. Those who
                                don't post carousels{' '}
                                <strong className="text-white">
                                    simply don't appear.
                                </strong>
                            </p>
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                While you spend{' '}
                                <strong className="text-white">
                                    2–3 hours on Canva
                                </strong>{' '}
                                trying to make a pretty post, your competitors
                                are using AI to create 10 viral carousels in the
                                time it takes you to make 1.
                            </p>
                            <p className="text-lg leading-relaxed font-medium text-[#AAAAAA]">
                                The difference between those who sell on
                                Instagram and those who just post pretty
                                pictures?{' '}
                                <strong className="text-white">
                                    Speed + Consistency.
                                </strong>{' '}
                                And that's exactly what Slidezz delivers.
                            </p>
                        </div>
                        <div className="mt-10 flex justify-center">
                            <CtaButton
                                href={ctaHref}
                                className="py-2 pr-2 pl-8"
                            >
                                I Want to Stop Wasting Time
                            </CtaButton>
                        </div>
                    </FadeIn>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section
                    id="how-it-works"
                    className="mx-auto max-w-6xl px-6 pt-24"
                >
                    <FadeIn className="mb-4 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            In 3 steps
                        </p>
                        <h2 className="font-display font-bold text-5xl leading-none tracking-normal lg:text-6xl">
                            So simple it feels like magic
                        </h2>
                    </FadeIn>

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
                                        Step {step}
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
                            I Want to Create My First Carousel
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
                                What's inside
                            </p>
                            <h2 className="font-display font-bold text-5xl leading-none tracking-normal lg:text-6xl">
                                AI trained to grab attention
                            </h2>
                            <p className="mx-auto mt-3 max-w-lg text-lg leading-relaxed font-medium text-[#555550]">
                                You don't need a mega prompt from other AIs: the
                                entire flow is already calibrated to go viral
                                and stand out in the feed.
                            </p>
                        </FadeIn>

                        <FeatureBento />
                    </div>
                </section>

                {/* ── PRICE ANCHOR ── */}
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
                                Do the math
                            </p>
                            <h2 className="font-display font-bold text-5xl leading-[0.95] tracking-normal text-white lg:text-6xl">
                                How much would you pay
                                <br />
                                for all this separately?
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
                                    borderTop: '1px solid #E8440A',
                                }}
                            >
                                <span className="text-lg font-extrabold text-white">
                                    Total (if bought separately)
                                </span>
                                <span className="text-xl font-extrabold text-[#E8440A]">
                                    {totalComparison}
                                </span>
                            </div>
                        </FadeIn>

                        <p className="mt-6 text-center text-lg leading-relaxed font-medium text-[#666660]">
                            That's what you <em>could</em> spend. With Slidezz,
                            everything is in one place — for a fraction of the
                            cost.
                        </p>
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
                    <FadeIn className="mb-12 text-center">
                        <h2 className="mb-3 font-display font-bold text-6xl tracking-normal text-[#1A1A1A]">
                            Simple, the way it should be
                        </h2>
                        <p className="text-lg font-medium text-[#666660]">
                            No gotchas. Cancel whenever you want.
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
                                    Monthly
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
                                    Annual
                                </span>
                                <span
                                    className={`relative z-10 rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase transition-colors duration-200 ${
                                        billingCycle === 'annual'
                                            ? 'bg-[#A3E635] text-[#1A1A1A]'
                                            : 'bg-[#E8F5E9] text-[#28CA41]'
                                    }`}
                                >
                                    up to 35% OFF
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid items-stretch gap-6 md:grid-cols-3">
                        {/* Starter */}
                        <div className="relative flex flex-col rounded-[24px] border border-[#E8E7E2] bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Starter
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        34% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            $29/mo
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $19
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed annually
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $29
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed monthly
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#E8E7E2] pb-6 text-lg font-bold text-[#1A1A1A]">
                                <Check className="h-4 w-4 text-[#E8440A]" />
                                30 carousels / month
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Includes:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    'AI copywriting & hooks',
                                    'All templates',
                                    'AI images included',
                                    'Instagram integration (coming soon)',
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

                            <button
                                type="button"
                                onClick={() => startCheckout('starter')}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-[#333]"
                            >
                                Try it now <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Pro */}
                        <div className="relative flex transform flex-col rounded-[24px] border-2 border-[#E8440A] bg-white p-8 shadow-lg md:-translate-y-4">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold tracking-wide text-white uppercase shadow-sm">
                                Most popular
                            </div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-[#1A1A1A]">
                                    Pro
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold tracking-wide text-[#28CA41] uppercase">
                                        34% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            $59/mo
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $39
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed annually
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-[#1A1A1A]">
                                                $59
                                            </span>
                                            <span className="text-lg font-medium text-[#666660]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed monthly
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#E8E7E2] pb-6 text-lg font-bold text-[#1A1A1A]">
                                <Check className="h-4 w-4 text-[#E8440A]" />
                                100 carousels / month
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#888880]">
                                Everything in Starter, plus:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    'BYOK: unlimited AI images',
                                    'Priority support',
                                    'Early access to features',
                                    'Save your own templates',
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

                            <button
                                type="button"
                                onClick={() => startCheckout('pro')}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8440A] py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-[#D13D09]"
                            >
                                Try it now <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Agency */}
                        <div className="relative flex flex-col rounded-[24px] border border-[#333330] bg-[#1A1A1A] p-8 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-white">
                                    Agency
                                </h3>
                                {billingCycle === 'annual' && (
                                    <span className="rounded-full bg-[#FCD34D]/15 px-2.5 py-1 text-xs font-bold tracking-wide text-[#FCD34D] uppercase">
                                        23% OFF
                                    </span>
                                )}
                            </div>
                            <div className="mb-6">
                                {billingCycle === 'annual' ? (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-[#888880] line-through">
                                            $129/mo
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-white">
                                                $99
                                            </span>
                                            <span className="text-lg font-medium text-[#AAAAAA]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed annually
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-1 text-lg font-semibold text-transparent select-none">
                                            &nbsp;
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] leading-none font-extrabold text-white">
                                                $129
                                            </span>
                                            <span className="text-lg font-medium text-[#AAAAAA]">
                                                /mo
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-[#888880]">
                                            billed monthly
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mb-6 flex items-center gap-3 border-b border-[#333330] pb-6 text-lg font-bold text-[#FCD34D]">
                                <Check className="h-4 w-4 text-[#FCD34D]" />
                                300 carousels / month
                            </div>

                            <div className="mb-4 text-sm font-bold text-[#AAAAAA]">
                                Everything in Pro, plus:
                            </div>
                            <ul className="mb-8 flex flex-1 flex-col gap-3">
                                {[
                                    'BYOK: unlimited AI images',
                                    'Multiple projects',
                                    'Team management',
                                    'API access (coming soon)',
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

                            <button
                                type="button"
                                onClick={() => startCheckout('agency')}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8440A] py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-[#D13D09]"
                            >
                                Try it now <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── TESTIMONIALS ── */}
                <section
                    id="testimonials"
                    className="py-24"
                    style={{
                        borderTop: '1px solid #E8E7E2',
                        background: '#FAFAF7',
                    }}
                >
                    <div className="mx-auto max-w-6xl px-6">
                        <FadeIn className="mb-16 text-center">
                            <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                                Results from those who publish
                            </p>
                            <h2 className="font-display font-bold text-5xl leading-none tracking-normal lg:text-6xl">
                                See what our clients say
                            </h2>
                        </FadeIn>
                    </div>

                    <TestimonialMarquee items={testimonials} />
                </section>

                {/* ── FAQ ── */}
                <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
                    <FadeIn className="mb-14 text-center">
                        <p className="mb-3 font-bold tracking-widest text-[#888880] uppercase">
                            FAQ
                        </p>
                        <h2 className="font-display font-bold text-5xl leading-none tracking-normal lg:text-6xl">
                            Frequently asked questions
                        </h2>
                    </FadeIn>

                    <div className="space-y-4">
                        {faqs.map(({ q, a }) => (
                            <FaqItem key={q} q={q} a={a} />
                        ))}
                    </div>
                </section>

                {/* ── CTA FINAL ── */}
                <section
                    id="cta"
                    className="flex justify-center overflow-x-hidden px-4 pb-24"
                >
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
                            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold"
                            style={{
                                border: '1px solid #333330',
                                background: '#222220',
                                color: '#E8440A',
                            }}
                        >
                            <Zap className="h-3.5 w-3.5 fill-[#E8440A]" />
                            AI-powered carousel generator
                        </div>

                        <h2 className="mb-4 font-display font-bold text-6xl leading-[0.95] tracking-normal text-white lg:text-[80px]">
                            Start going viral today.
                        </h2>
                        <p className="mx-auto mb-10 max-w-sm text-lg leading-relaxed font-medium text-zinc-300">
                            Scale and go viral automatically with AI. No Canva.
                            No designer. No wasted hours.
                        </p>
                        <CtaButton
                            href={ctaHref}
                            className="py-2.5 pr-2.5 pl-9"
                        >
                            I Want to Create Viral Carousels
                        </CtaButton>
                        <p className="mt-5 font-medium text-zinc-300">
                            No credit card required. Cancel anytime.
                        </p>
                    </motion.div>
                </section>

                {/* ── FOOTER ── */}
                <LandingFooter
                    reachOutTitle="Reach out to us"
                    contact={{
                        title: 'Talk to us',
                        subtitle: 'We usually reply within 24h',
                        href: 'https://wa.me/5527997798070?text=Hi%21%20I%20need%20support%20with%20Slidezz.',
                    }}
                    columns={[
                        {
                            title: 'Explore',
                            links: [
                                {
                                    label: 'How it works',
                                    href: '#how-it-works',
                                },
                                { label: 'Pricing', href: '#pricing' },
                                { label: 'Results', href: '#testimonials' },
                            ],
                        },
                        {
                            title: 'Help',
                            links: [
                                { label: 'FAQs', href: '#faq' },
                                {
                                    label: 'Contact',
                                    href: 'mailto:hello@slidezz.app',
                                },
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
