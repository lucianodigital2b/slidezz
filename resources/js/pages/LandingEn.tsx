import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Play,
    Search,
    Sparkles,
    ToggleRight,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

// ─── Data ────────────────────────────────────────────────────────────────────

const slides = [
    {
        src: '/landing/s2.webp',
        hook: '5 morning habits that changed my life',
    },
    {
        src: '/landing/s3.webp',
        hook: "workouts I'd do if I started over",
    },
    {
        src: '/landing/s4.webp',
        hook: 'the only 3 skincare products you need',
    },
    {
        src: '/landing/s5.webp',
        hook: 'things nobody tells you about moving to a big city',
    },
    {
        src: '/landing/s6.webp',
        hook: "signs he's actually into you",
    },
    {
        src: '/landing/s7.webp',
        hook: 'high protein breakfasts under 5 minutes',
    },
    {
        src: '/landing/s8.webp',
        hook: 'how I finally grew my curls out',
    },
    {
        src: '/landing/s9.webp',
        hook: 'travel hacks I wish I knew sooner',
    },
    {
        src: '/landing/s10.webp',
        hook: "dinners I make when I'm too tired to cook",
    },
    {
        src: '/landing/s11.webp',
        hook: 'photo poses that always work',
    },
    {
        src: '/landing/s12.webp',
        hook: 'what I eat in a day (realistic)',
    },
];

const lifetimeFeatures = [
    'Unlimited carousels, forever',
    'Unlimited images with your Gemini key',
    'All templates + future updates',
];

const faqs = [
    {
        q: 'Do I need to know design?',
        a: 'No. Type a topic or a list of hooks and Slidezz writes the text, picks the images and lays out every slide.',
    },
    {
        q: 'Does it post for me?',
        a: 'Yes. Connect your accounts and schedule posts on the calendar or with an automation. Instagram posts go live on their own. TikTok posts arrive in your TikTok inbox as drafts, so you add a sound and post in one tap.',
    },
    {
        q: 'Does it work for any niche?',
        a: 'Yes. Apps, e-commerce, fitness, beauty, food, coaching, finance. The AI adapts to your niche and tone of voice.',
    },
    {
        q: 'How many slideshows can I make?',
        a: 'Unlimited on every plan. AI images run on your own Google Gemini key, so there are no credits to run out of on our side.',
    },
    {
        q: 'How do the AI images work?',
        a: 'You connect your own Google Gemini API key. It takes 2 minutes and Google has a free tier. Images are generated on your Google account, with no extra cost from Slidezz.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. No contracts. Cancel from your settings in two clicks.',
    },
    {
        q: 'Does it work on mobile?',
        a: 'It runs in the browser on any device. No install needed.',
    },
];

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
        <div className="relative aspect-[3/4] w-36 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:w-40">
            <img
                src={src}
                alt=""
                loading={loading}
                width={480}
                height={640}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute top-[20%] left-1/2 w-full -translate-x-1/2 px-4 text-center">
                <p
                    className="text-[13px] leading-tight font-extrabold text-white sm:text-[15px]"
                    style={{
                        WebkitTextStroke: '3px #000',
                        paintOrder: 'stroke fill',
                        textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}
                >
                    {hook}
                </p>
            </div>
            <div className="absolute bottom-3 left-3 flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                    <span
                        key={i}
                        className={cn(
                            'h-1 w-1 rounded-full',
                            i === 0 ? 'bg-white' : 'bg-white/40',
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

function SlideArc() {
    const centerIndex = 5;

    return (
        <div className="mt-10">
            {/* Mobile horizontal scroller */}
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
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

            {/* Desktop rainbow arc */}
            <div className="relative left-1/2 hidden h-[380px] w-screen -translate-x-1/2 overflow-hidden md:block">
                {slides.map((slide, i) => {
                    const distance = i - centerIndex;
                    const x = distance * 150;
                    const y = distance * distance * 8;
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[#F3F4EF] to-transparent" />
            </div>
        </div>
    );
}

// ─── How it works mocks ──────────────────────────────────────────────────────

function StepOneVisual() {
    return (
        <div className="space-y-2 rounded-xl border border-[#E6E6E0] bg-white p-3 text-left shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#1A1A1A]">
                    Format
                </span>
                <span className="rounded-md bg-[#F6F6F2] px-2 py-1 text-xs font-medium text-[#6B6B66]">
                    Listicle slideshow
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#1A1A1A]">
                    Niche
                </span>
                <span className="rounded-md bg-[#F6F6F2] px-2 py-1 text-xs font-medium text-[#6B6B66]">
                    Fitness
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#1A1A1A]">
                    Posts per day
                </span>
                <span className="rounded-md bg-[#F6F6F2] px-2 py-1 text-xs font-medium text-[#6B6B66]">
                    2
                </span>
            </div>
            <div className="flex gap-2">
                <span className="rounded-full bg-[#F6F6F2] px-3 py-1 text-xs font-medium text-[#6B6B66]">
                    3:00 PM
                </span>
                <span className="rounded-full bg-[#F6F6F2] px-3 py-1 text-xs font-medium text-[#6B6B66]">
                    6:00 PM
                </span>
            </div>
            <button
                type="button"
                className="w-full rounded-lg bg-[#FF4F1F] py-2 text-xs font-bold text-white"
            >
                Save automation
            </button>
        </div>
    );
}

function StepTwoVisual() {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <TikTokMark className="h-4 w-4 text-[#6B6B66]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                        @yourbrand
                    </span>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">
                    Connected
                </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <InstagramMark className="h-4 w-4 text-[#6B6B66]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                        @yourbrand
                    </span>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">
                    Connected
                </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-[#D9D9D2] px-3 py-2 text-[11px] font-medium text-[#6B6B66]">
                <span>Next post</span>
                <span className="font-semibold text-[#1A1A1A]">
                    Today, 3:00 PM
                </span>
            </div>
        </div>
    );
}

function StepThreeVisual() {
    const thumbs = [
        { src: '/landing/s2.webp', badge: 'Posted' },
        { src: '/landing/s3.webp', badge: 'Posted' },
        { src: '/landing/s7.webp', badge: 'Posted' },
        { src: '/landing/s10.webp', badge: 'Scheduled' },
        { src: '/landing/s11.webp', badge: 'Scheduled' },
        { src: '/landing/s12.webp', badge: 'Scheduled' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2">
            {thumbs.map((thumb) => (
                <div
                    key={thumb.src}
                    className="relative overflow-hidden rounded-lg"
                >
                    <img
                        src={thumb.src}
                        alt=""
                        width={160}
                        height={213}
                        className="aspect-square w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {thumb.badge}
                    </span>
                </div>
            ))}
        </div>
    );
}

const steps = [
    {
        title: 'Create an automation',
        text: 'Pick a format, your niche and your posting times. Slidezz handles the rest.',
        Visual: StepOneVisual,
    },
    {
        title: 'Connect TikTok and Instagram',
        text: 'Link your accounts once. Instagram posts go live on schedule; TikTok posts land in your TikTok inbox, ready to post.',
        Visual: StepTwoVisual,
    },
    {
        title: 'Set it and forget it',
        text: 'New slideshows are written, designed and queued every day, automatically.',
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
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E6E6E0] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="h-60 overflow-hidden border-b border-[#E6E6E0] bg-[#F6F6F2] p-4">
                {children}
            </div>
            <div className="p-6">
                <h3 className="text-lg font-bold text-[#1A1A1A]">
                    {number}. {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B66]">
                    {body}
                </p>
            </div>
        </div>
    );
}

// ─── Feature mocks ───────────────────────────────────────────────────────────

function AutomationsMock() {
    return (
        <div className="space-y-3">
            {['Fitness tips carousel', 'Product highlight slides'].map(
                (label) => (
                    <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm"
                    >
                        <span className="text-xs font-semibold text-[#1A1A1A]">
                            {label}
                        </span>
                        <ToggleRight className="h-5 w-5 text-green-600" />
                    </div>
                ),
            )}
        </div>
    );
}

function SchedulingMock() {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const chips = [[0, 2], [1], [0, 1, 3], [2], [0], [1, 2], [0, 3]];

    return (
        <div className="rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => (
                    <div key={i} className="text-center">
                        <div className="text-xs font-bold text-[#8A8A85]">
                            {day}
                        </div>
                        <div className="mt-1 space-y-1">
                            {chips[i].map((chip, j) => (
                                <div
                                    key={j}
                                    className={cn(
                                        'h-2 rounded-sm',
                                        chip % 2 === 0
                                            ? 'bg-[#FF4F1F]/70'
                                            : 'bg-[#111]/70',
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AnalyticsMock() {
    return (
        <div className="rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
                <span>Views</span>
                <span>12.4k</span>
            </div>
            <svg
                viewBox="0 0 80 32"
                className="mt-2 h-8 w-full overflow-visible"
            >
                <polyline
                    points="0,24 12,20 24,22 36,14 48,16 60,8 72,10 80,4"
                    fill="none"
                    stroke="#FF4F1F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#6B6B66]">
                <span>Likes</span>
                <span>834</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-medium text-[#6B6B66]">
                <span>Comments</span>
                <span>92</span>
            </div>
        </div>
    );
}

function SlideshowEditorMock() {
    return (
        <div className="relative mx-auto aspect-[3/4] w-24 overflow-hidden rounded-lg border border-[#E6E6E0] shadow-sm">
            <img
                src="/landing/s8.webp"
                alt=""
                width={160}
                height={213}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute top-[22%] right-2 left-2">
                <div className="rounded border-2 border-dashed border-[#FF4F1F] p-2">
                    <span className="block h-2 w-16 rounded bg-white/80" />
                    <span className="mt-1 block h-2 w-20 rounded bg-white/80" />
                </div>
                <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-[#FF4F1F]" />
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#FF4F1F]" />
                <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-[#FF4F1F]" />
                <div className="absolute -right-1 -bottom-1 h-2 w-2 rounded-full bg-[#FF4F1F]" />
            </div>
        </div>
    );
}

function PinterestMock() {
    return (
        <div className="rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 rounded-lg bg-[#F6F6F2] px-3 py-2">
                <Search className="h-4 w-4 text-[#8A8A85]" />
                <span className="text-xs text-[#8A8A85]">aesthetic gym</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                    '/landing/s3.webp',
                    '/landing/s9.webp',
                    '/landing/s5.webp',
                    '/landing/s6.webp',
                ].map((src) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        width={80}
                        height={80}
                        className="aspect-square w-full rounded-lg object-cover"
                    />
                ))}
            </div>
        </div>
    );
}

function AIHooksMock() {
    return (
        <div className="space-y-2">
            {[
                '5 morning habits that changed my life',
                "workouts I'd do if I started over",
                'the only 3 skincare products you need',
            ].map((hook) => (
                <div
                    key={hook}
                    className="flex items-center gap-2 rounded-lg border border-[#E6E6E0] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A1A] shadow-sm"
                >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[#FF4F1F]" />
                    <span className="truncate">{hook}</span>
                </div>
            ))}
        </div>
    );
}

function BulkMock() {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-[#E6E6E0] bg-white p-3 shadow-sm">
            <div className="flex-1 rounded-lg bg-[#F6F6F2] p-3">
                {['hook 1', 'hook 2', 'hook 3'].map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#E6E6E0]" />
                        <span className="text-xs text-[#6B6B66]">{line}</span>
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-center text-[#8A8A85]">
                <span className="text-xs font-bold">→</span>
            </div>
            <div className="rounded-lg bg-[#111] px-3 py-2 text-xs font-bold text-white">
                3 carousels
            </div>
        </div>
    );
}

function MultipleAccountsMock() {
    const accounts = [
        { initials: 'YB', handle: '@yourbrand' },
        { initials: 'YA', handle: '@yourapp' },
        { initials: 'YS', handle: '@yourshop' },
    ];

    return (
        <div className="space-y-2">
            {accounts.map((account) => (
                <div
                    key={account.handle}
                    className="flex items-center gap-2 rounded-xl border border-[#E6E6E0] bg-white px-3 py-1.5 shadow-sm"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#111] text-[10px] font-bold text-white">
                        {account.initials}
                    </span>
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                        {account.handle}
                    </span>
                    <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
                </div>
            ))}
        </div>
    );
}

function AppStoreScreenshotsMock() {
    return (
        <div className="flex items-center justify-center gap-4">
            <div className="h-24 w-16 rounded-lg border border-[#E6E6E0] bg-gradient-to-b from-[#FF4F1F] to-[#F6B352] shadow-sm" />
            <div className="h-24 w-16 rounded-lg border border-[#E6E6E0] bg-gradient-to-b from-[#111] to-[#4D4DFF] shadow-sm" />
        </div>
    );
}

const features = [
    {
        title: 'Automations',
        text: 'Set it up once. Slidezz creates and queues new slideshows every day.',
        Visual: AutomationsMock,
    },
    {
        title: 'Scheduling & publishing',
        text: 'Plan the week on a calendar with an hour grid, or publish right away.',
        Visual: SchedulingMock,
    },
    {
        title: 'Analytics',
        text: 'Views, likes, comments and shares for every post, so you know what works.',
        Visual: AnalyticsMock,
    },
    {
        title: 'Slideshow editor',
        text: 'Edit text, images and layouts in real time.',
        Visual: SlideshowEditorMock,
    },
    {
        title: 'Pinterest images',
        text: 'Search Pinterest from inside Slidezz and pull images straight into your library.',
        Visual: PinterestMock,
    },
    {
        title: 'AI hooks and captions',
        text: 'Hooks, slide text and captions written in your tone of voice.',
        Visual: AIHooksMock,
    },
    {
        title: 'Bulk from a list',
        text: 'Paste a list of hooks or upload a CSV and get one carousel per line.',
        Visual: BulkMock,
    },
    {
        title: 'Multiple accounts',
        text: 'Run several TikTok and Instagram accounts from one place.',
        Visual: MultipleAccountsMock,
    },
    {
        title: 'App Store screenshots',
        text: 'Make App Store screenshots with the same editor.',
        Visual: AppStoreScreenshotsMock,
    },
];

function FeatureCard({
    title,
    text,
    children,
}: {
    title: string;
    text: string;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E6E6E0] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="h-44 overflow-hidden border-b border-[#E6E6E0] bg-[#F6F6F2] p-4">
                {children}
            </div>
            <div className="p-5">
                <h3 className="font-semibold text-[#1A1A1A]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B66]">
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
        monthly: 29,
        annual: 19,
        features: [
            'Unlimited carousels',
            'Unlimited images with your Gemini key',
            'AI copywriting & hooks',
            'All templates',
            'Schedule posts',
        ],
        buttonClass: 'bg-[#111] text-white hover:bg-[#333]',
        badge: null,
    },
    {
        name: 'Pro',
        monthly: 59,
        annual: 39,
        features: [
            'Everything in Starter',
            'Priority support',
            'Save your own templates',
            'Early access to new features',
        ],
        buttonClass: 'bg-[#FF4F1F] text-white hover:bg-[#E64517]',
        badge: 'Recommended',
    },
    {
        name: 'Agency',
        monthly: 129,
        annual: 99,
        features: [
            'Everything in Pro',
            'Multiple projects',
            'Team management',
            'Dedicated support',
        ],
        buttonClass: 'bg-[#111] text-white hover:bg-[#333]',
        badge: null,
    },
];

function PricingCard({
    name,
    price,
    struckPrice,
    billingCycle,
    features,
    onClick,
    buttonClass,
    badge,
}: {
    name: string;
    price: number;
    struckPrice?: number | null;
    billingCycle: 'monthly' | 'annual';
    features: string[];
    onClick: () => void;
    buttonClass: string;
    badge?: string | null;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-2xl border border-[#E6E6E0] bg-white p-6 shadow-sm',
                badge && 'border-[#FF4F1F]/30',
            )}
        >
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFF1E9] px-3 py-1 text-xs font-bold text-[#FF4F1F]">
                    {badge}
                </div>
            )}
            <h3 className="text-xl font-bold text-[#1A1A1A]">{name}</h3>
            <div className="mt-4">
                {struckPrice && (
                    <div className="text-sm text-[#8A8A85] line-through">
                        ${struckPrice}/mo
                    </div>
                )}
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
                        ${price}
                    </span>
                    <span className="text-sm font-medium text-[#6B6B66]">
                        per month
                    </span>
                </div>
                {billingCycle === 'annual' ? (
                    <p className="mt-1 text-xs font-medium text-[#8A8A85]">
                        billed annually
                    </p>
                ) : (
                    <p className="mt-1 text-xs font-medium text-[#8A8A85]">
                        billed monthly
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'mt-6 w-full rounded-xl py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50',
                    buttonClass,
                )}
            >
                Get started
            </button>
            <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-[#6B6B66]"
                    >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF4F1F]" />
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
        <div className="border-b border-[#E6E6E0]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50 focus-visible:ring-inset"
            >
                <span className="text-lg font-bold text-[#1A1A1A]">{q}</span>
                <ChevronDown
                    className={cn(
                        'h-5 w-5 transition-transform duration-300',
                        open && 'rotate-180',
                    )}
                />
            </button>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
                    <p className="pb-6 text-sm leading-relaxed text-[#6B6B66]">
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
        <footer className="mx-auto max-w-6xl px-4 pt-16 pb-10">
            <div className="grid gap-10 md:grid-cols-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111]">
                            <AppLogoIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xl font-bold text-[#1A1A1A]">
                            Slidezz
                        </span>
                    </div>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#6B6B66]">
                        Automate TikTok and Instagram slideshows that bring
                        traffic to your business.
                    </p>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-[#1A1A1A]">
                        Product
                    </h4>
                    <ul className="mt-4 space-y-3 text-sm">
                        <li>
                            <a
                                href="#features"
                                className="text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Features
                            </a>
                        </li>
                        <li>
                            <a
                                href="#pricing"
                                className="text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Pricing
                            </a>
                        </li>
                        <li>
                            <a
                                href="#faq"
                                className="text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                FAQ
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-[#1A1A1A]">Legal</h4>
                    <ul className="mt-4 space-y-3 text-sm">
                        <li>
                            <Link
                                href="/privacy-policy"
                                className="text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/terms"
                                className="text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Terms of Service
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mt-10 border-t border-[#E6E6E0] pt-6 text-center text-sm text-[#8A8A85]">
                © {year} Slidezz. All rights reserved.
            </div>
        </footer>
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

    const startCheckout = (plan: 'starter' | 'pro' | 'agency') => {
        router.post('/checkout', { plan, cycle: billingCycle });
    };

    return (
        <>
            <Head title="Slidezz: Automate TikTok & Instagram slideshows">
                <meta
                    name="description"
                    content="Slidezz writes, designs and schedules faceless TikTok and Instagram slideshows for your brand, every day."
                />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div
                className="min-h-screen overflow-x-clip font-[Inter,sans-serif]"
                style={{ background: '#F3F4EF', color: '#1A1A1A' }}
            >
                {/* ── NAV ── */}
                <header
                    className={cn(
                        'sticky top-0 z-50 bg-[#F3F4EF]/80 backdrop-blur-md transition-shadow',
                        scrolled
                            ? 'shadow-[0_1px_0_rgba(0,0,0,0.05)]'
                            : 'shadow-none',
                    )}
                >
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111]">
                                <AppLogoIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
                                Slidezz
                            </span>
                        </Link>

                        <nav className="hidden items-center gap-8 md:flex">
                            <a
                                href="#features"
                                className="text-sm font-semibold text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Features
                            </a>
                            <a
                                href="#pricing"
                                className="text-sm font-semibold text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                Pricing
                            </a>
                            <a
                                href="#faq"
                                className="text-sm font-semibold text-[#6B6B66] hover:text-[#1A1A1A]"
                            >
                                FAQ
                            </a>
                        </nav>

                        <div className="flex items-center gap-4">
                            {!auth.user && (
                                <Link
                                    href={login()}
                                    className="hidden text-sm font-semibold text-[#1A1A1A] hover:text-[#FF4F1F] md:inline-flex"
                                >
                                    Log in
                                </Link>
                            )}
                            <Link
                                href={auth.user ? dashboard() : ctaHref}
                                className="inline-flex items-center justify-center rounded-lg bg-[#111] px-4 py-2 text-sm font-bold text-white hover:bg-[#333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                            >
                                {auth.user ? 'Go to app' : 'Get started'}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mx-auto max-w-5xl px-4 pt-16 pb-8 text-center sm:pt-20">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E6E0] bg-white px-4 py-1.5 text-sm font-semibold text-[#6B6B66]">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        TikTok + Instagram · Posts every day
                    </div>

                    <h1 className="mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-[#1A1A1A] sm:text-6xl">
                        <span className="block">
                            Automate TikTok slideshows
                        </span>
                        <span className="block text-[#8A8A85]">
                            100% on autopilot
                        </span>
                    </h1>

                    <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#6B6B66]">
                        Slidezz writes, designs and schedules faceless
                        slideshows and carousels for your brand. They don't look
                        like AI.
                    </p>

                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={ctaHref}
                            className="inline-flex items-center justify-center rounded-xl bg-[#FF4F1F] px-6 py-3 text-sm font-bold text-white hover:bg-[#E64517] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                        >
                            Make your first slideshow, free
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E6E6E0] bg-white px-6 py-3 text-sm font-bold text-[#1A1A1A] hover:bg-[#F6F6F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            See how it works
                        </a>
                    </div>

                    <SlideArc />

                    <div className="mt-6 border-y border-[#E6E6E0] py-6">
                        <div className="flex flex-col items-center gap-3 text-sm text-[#6B6B66] md:flex-row md:justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                    Publishes to
                                </span>
                                <TikTokMark className="h-5 w-5" />
                                <InstagramMark className="h-5 w-5" />
                            </div>
                            <p className="text-center">
                                Works for apps, e-commerce, coaches, agencies
                                and creators.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section
                    id="how-it-works"
                    className="mx-auto max-w-5xl px-4 py-20 sm:py-24"
                >
                    <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
                        Automate faceless pages.{' '}
                        <span className="text-[#8A8A85]">On autopilot.</span>
                    </h2>
                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {steps.map((step, i) => (
                            <StepCard
                                key={step.title}
                                number={String(i + 1)}
                                title={step.title}
                                body={step.text}
                            >
                                <step.Visual />
                            </StepCard>
                        ))}
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section
                    id="features"
                    className="mx-auto max-w-5xl px-4 py-20 sm:py-24"
                >
                    <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
                        Product features.{' '}
                        <span className="text-[#8A8A85]">
                            Everything you need, all in one.
                        </span>
                    </h2>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <FeatureCard
                                key={feature.title}
                                title={feature.title}
                                text={feature.text}
                            >
                                <feature.Visual />
                            </FeatureCard>
                        ))}
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section
                    id="pricing"
                    className="mx-auto max-w-5xl px-4 py-20 sm:py-24"
                >
                    <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
                        Pricing & plans
                    </h2>
                    <p className="mt-2 text-center text-lg text-[#6B6B66]">
                        Start small, upgrade when your posts start working.
                    </p>

                    <div className="mt-8 flex justify-center">
                        <div className="inline-flex items-center gap-1 rounded-full border border-[#E6E6E0] bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    'rounded-full px-5 py-2 text-sm font-bold transition-colors',
                                    billingCycle === 'monthly'
                                        ? 'bg-[#111] text-white'
                                        : 'text-[#6B6B66] hover:text-[#1A1A1A]',
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                className={cn(
                                    'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors',
                                    billingCycle === 'annual'
                                        ? 'bg-[#111] text-white'
                                        : 'text-[#6B6B66] hover:text-[#1A1A1A]',
                                )}
                            >
                                Annual
                                <span className="rounded-full bg-[#FF4F1F] px-2 py-0.5 text-[10px] font-extrabold text-white">
                                    Save up to 35%
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {plans.map((plan) => {
                            const price =
                                billingCycle === 'annual'
                                    ? plan.annual
                                    : plan.monthly;
                            const struckPrice =
                                billingCycle === 'annual' ? plan.monthly : null;

                            return (
                                <PricingCard
                                    key={plan.name}
                                    name={plan.name}
                                    price={price}
                                    struckPrice={struckPrice}
                                    billingCycle={billingCycle}
                                    features={plan.features}
                                    onClick={() =>
                                        startCheckout(
                                            plan.name.toLowerCase() as
                                                | 'starter'
                                                | 'pro'
                                                | 'agency',
                                        )
                                    }
                                    buttonClass={plan.buttonClass}
                                    badge={plan.badge}
                                />
                            );
                        })}
                    </div>

                    {/* Lifetime offer */}
                    <div className="mt-8 overflow-hidden rounded-2xl border border-[#E6E6E0] bg-white shadow-sm">
                        <div className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="inline-flex rounded-full bg-[#FFF1E9] px-3 py-1 text-xs font-bold text-[#FF4F1F]">
                                    Launch offer
                                </span>
                                <h3 className="mt-3 text-2xl font-bold text-[#1A1A1A]">
                                    Lifetime access
                                </h3>
                                <p className="mt-2 max-w-md text-sm text-[#6B6B66]">
                                    Pay once, use forever. No subscription.
                                </p>
                                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                                    {lifetimeFeatures.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]"
                                        >
                                            <Check className="h-4 w-4 text-[#FF4F1F]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="text-center md:text-right">
                                <div className="text-4xl font-extrabold text-[#1A1A1A]">
                                    $149
                                </div>
                                <div className="text-sm font-medium text-[#6B6B66]">
                                    one-time payment
                                </div>
                                <Link
                                    href={ctaHref}
                                    className="mt-4 inline-flex rounded-xl bg-[#FF4F1F] px-6 py-3 text-sm font-bold whitespace-nowrap text-white hover:bg-[#E64517] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                                >
                                    Claim lifetime access
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className="mt-4 text-center text-sm text-[#8A8A85]">
                        Cancel anytime. No contracts.
                    </p>
                </section>

                {/* ── FAQ ── */}
                <section
                    id="faq"
                    className="mx-auto max-w-3xl px-4 py-20 sm:py-24"
                >
                    <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
                        Frequently asked questions
                    </h2>
                    <div className="mt-12">
                        {faqs.map(({ q, a }) => (
                            <FaqItem key={q} q={q} a={a} />
                        ))}
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
                    <div className="rounded-3xl bg-[#111] px-6 py-16 text-center text-white sm:px-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Your next 30 days of posts, done this afternoon.
                        </h2>
                        <Link
                            href={ctaHref}
                            className="mt-8 inline-flex rounded-xl bg-[#FF4F1F] px-6 py-3 text-sm font-bold text-white hover:bg-[#E64517] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F1F]/50"
                        >
                            Make your first slideshow, free
                        </Link>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <Footer />
            </div>
        </>
    );
}
