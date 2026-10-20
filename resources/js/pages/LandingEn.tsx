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
    { src: '/landing/s2.webp', hook: '5 morning habits that changed my life' },
    { src: '/landing/s3.webp', hook: "workouts I'd do if I started over" },
    { src: '/landing/s4.webp', hook: 'the only 3 skincare products you need' },
    {
        src: '/landing/s5.webp',
        hook: 'things nobody tells you about moving to a big city',
    },
    { src: '/landing/s6.webp', hook: "signs he's actually into you" },
    {
        src: '/landing/s7.webp',
        hook: 'high protein breakfasts under 5 minutes',
    },
    { src: '/landing/s8.webp', hook: 'how I finally grew my curls out' },
    { src: '/landing/s9.webp', hook: 'travel hacks I wish I knew sooner' },
    {
        src: '/landing/s10.webp',
        hook: "dinners I make when I'm too tired to cook",
    },
    { src: '/landing/s11.webp', hook: 'photo poses that always work' },
    { src: '/landing/s12.webp', hook: 'what I eat in a day (realistic)' },
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
        <div className="group flex w-40 flex-col overflow-hidden rounded-[28px] bg-jt-surface p-3 shadow-jt-soft transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none md:w-44">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-white">
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
                                i === 0 ? 'bg-white' : 'bg-white/40',
                            )}
                        />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-2 px-1 pt-3 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jt-ink">
                    <AppLogoIcon className="h-3 w-3 text-white" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[13px] leading-tight font-semibold text-jt-ink">
                        {hook}
                    </p>
                    <p className="truncate text-[11px] text-jt-muted">
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-white to-transparent" />
            </div>
        </div>
    );
}

// ─── How it works mocks ──────────────────────────────────────────────────────

function StepOneVisual() {
    return (
        <div className="space-y-2 rounded-[20px] bg-white p-4 text-left shadow-jt-float">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-jt-ink">
                    Format
                </span>
                <span className="rounded-full bg-jt-surface px-2 py-1 text-xs font-medium text-jt-muted">
                    Listicle slideshow
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-jt-ink">Niche</span>
                <span className="rounded-full bg-jt-surface px-2 py-1 text-xs font-medium text-jt-muted">
                    Fitness
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-jt-ink">
                    Posts per day
                </span>
                <span className="rounded-full bg-jt-surface px-2 py-1 text-xs font-medium text-jt-muted">
                    2
                </span>
            </div>
            <div className="flex gap-2">
                <span className="rounded-full bg-jt-surface px-3 py-1 text-xs font-medium text-jt-muted">
                    3:00 PM
                </span>
                <span className="rounded-full bg-jt-surface px-3 py-1 text-xs font-medium text-jt-muted">
                    6:00 PM
                </span>
            </div>
            <button
                type="button"
                className="w-full rounded-full bg-jt-ink py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-jt-ink-soft"
            >
                Save automation
            </button>
        </div>
    );
}

function StepTwoVisual() {
    return (
        <div className="space-y-3 text-left">
            <div className="flex items-center justify-between rounded-[20px] bg-white p-3 shadow-jt-float">
                <div className="flex items-center gap-2">
                    <TikTokMark className="h-4 w-4 text-jt-muted" />
                    <span className="text-xs font-semibold text-jt-ink">
                        @yourbrand
                    </span>
                </div>
                <span className="rounded-full bg-jt-surface px-2 py-1 text-[10px] font-semibold text-jt-ink">
                    Connected
                </span>
            </div>
            <div className="flex items-center justify-between rounded-[20px] bg-white p-3 shadow-jt-float">
                <div className="flex items-center gap-2">
                    <InstagramMark className="h-4 w-4 text-jt-muted" />
                    <span className="text-xs font-semibold text-jt-ink">
                        @yourbrand
                    </span>
                </div>
                <span className="rounded-full bg-jt-surface px-2 py-1 text-[10px] font-semibold text-jt-ink">
                    Connected
                </span>
            </div>
            <div className="flex items-center justify-between rounded-[20px] border border-dashed border-white/60 px-3 py-2 text-[11px] font-medium text-white">
                <span>Next post</span>
                <span className="font-semibold">Today, 3:00 PM</span>
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
                    className="relative overflow-hidden rounded-[16px] shadow-jt-soft"
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

const stepStyles = [
    { block: 'bg-jt-surface', body: 'text-jt-muted' },
    { block: 'bg-jt-sky', body: 'text-white' },
    { block: 'bg-jt-green', body: 'text-jt-ink/75' },
];

function StepCard({
    number,
    title,
    body,
    children,
    className,
    bodyClassName,
}: {
    number: string;
    title: string;
    body: string;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-8 overflow-hidden rounded-[32px] p-6 sm:rounded-jt-block sm:p-12 md:flex-row md:gap-12',
                className,
            )}
        >
            <div className="w-full md:flex-1">
                <span className="inline-flex items-center bg-white px-2 py-0.5 text-[17px] font-semibold text-jt-ink">
                    {number}. {title}
                </span>
                <p
                    className={cn(
                        'mt-4 max-w-md text-base leading-6 tracking-[-0.02em]',
                        bodyClassName,
                    )}
                >
                    {body}
                </p>
            </div>
            <div className="w-full md:flex-1">{children}</div>
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
                        className="flex items-center justify-between rounded-full bg-jt-surface px-4 py-2.5"
                    >
                        <span className="text-xs font-semibold text-jt-ink">
                            {label}
                        </span>
                        <ToggleRight className="h-5 w-5 text-jt-green-deep" />
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
        <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => (
                <div key={i} className="text-center">
                    <div className="text-xs font-bold text-jt-muted">{day}</div>
                    <div className="mt-1 space-y-1">
                        {chips[i].map((chip, j) => (
                            <div
                                key={j}
                                className={cn(
                                    'h-2 rounded-full',
                                    chip % 2 === 0
                                        ? 'bg-jt-green'
                                        : 'bg-jt-ink/70',
                                )}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AnalyticsMock() {
    return (
        <div>
            <div className="flex items-center justify-between text-xs font-bold text-jt-ink">
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
                    stroke="#A981FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-jt-muted">
                <span>Likes</span>
                <span>834</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-medium text-jt-muted">
                <span>Comments</span>
                <span>92</span>
            </div>
        </div>
    );
}

function SlideshowEditorMock() {
    return (
        <div className="relative mx-auto aspect-[3/4] w-24 overflow-hidden rounded-[16px] bg-white shadow-jt-soft">
            <img
                src="/landing/s8.webp"
                alt=""
                width={160}
                height={213}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute top-[22%] right-2 left-2">
                <div className="rounded border-2 border-dashed border-jt-green-deep p-2">
                    <span className="block h-2 w-16 rounded bg-white/80" />
                    <span className="mt-1 block h-2 w-20 rounded bg-white/80" />
                </div>
                <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-jt-green-deep" />
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-jt-green-deep" />
                <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-jt-green-deep" />
                <div className="absolute -right-1 -bottom-1 h-2 w-2 rounded-full bg-jt-green-deep" />
            </div>
        </div>
    );
}

function PinterestMock() {
    return (
        <div>
            <div className="flex items-center gap-2 rounded-full bg-jt-surface px-3 py-2">
                <Search className="h-4 w-4 text-jt-muted" />
                <span className="text-xs text-jt-muted">aesthetic gym</span>
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
                        className="aspect-square w-full rounded-[12px] object-cover"
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
                    className="flex items-center gap-2 rounded-full bg-jt-surface px-3 py-2 text-xs font-semibold text-jt-ink"
                >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-jt-green-deep" />
                    <span className="truncate">{hook}</span>
                </div>
            ))}
        </div>
    );
}

function BulkMock() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 rounded-[16px] bg-jt-surface p-3">
                {['hook 1', 'hook 2', 'hook 3'].map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-jt-line" />
                        <span className="text-xs text-jt-muted">{line}</span>
                    </div>
                ))}
            </div>
            <span className="text-xs font-bold text-jt-muted">→</span>
            <div className="rounded-full bg-jt-ink px-3 py-2 text-xs font-semibold text-white">
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
                    className="flex items-center gap-2 rounded-full bg-jt-surface px-3 py-1.5"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-jt-ink text-[10px] font-bold text-white">
                        {account.initials}
                    </span>
                    <span className="text-xs font-semibold text-jt-ink">
                        {account.handle}
                    </span>
                    <span className="ml-auto h-2 w-2 rounded-full bg-jt-lime ring-1 ring-jt-ink/10" />
                </div>
            ))}
        </div>
    );
}

function AppStoreScreenshotsMock() {
    return (
        <div className="flex items-center justify-center gap-4">
            <div className="h-24 w-16 rounded-[16px] bg-gradient-to-b from-jt-green to-jt-green-deep shadow-jt-soft" />
            <div className="h-24 w-16 rounded-[16px] bg-gradient-to-b from-jt-sky to-jt-ink shadow-jt-soft" />
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
        title: 'Automations',
        text: 'Set it up once. Slidezz creates and queues new slideshows every day.',
        Visual: AutomationsMock,
        badge: 'new',
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
    badge,
}: {
    title: string;
    text: string;
    children: ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex flex-col overflow-hidden rounded-[32px] bg-jt-surface p-5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none sm:rounded-jt-card sm:p-8">
            <div className="flex min-h-[200px] items-center justify-center rounded-[20px] bg-white p-6">
                <div className="w-full max-w-[280px]">{children}</div>
            </div>
            <div className="mt-6 px-1">
                {badge && (
                    <span className="mb-2 inline-flex rounded-full bg-jt-lime px-2 py-0.5 text-[12px] font-semibold text-jt-ink">
                        {badge}
                    </span>
                )}
                <h3 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-jt-ink">
                    {title}
                </h3>
                <p className="mt-2 text-[16px] leading-6 tracking-[-0.02em] text-jt-muted">
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
        buttonClass: 'bg-jt-ink text-white hover:bg-jt-ink-soft',
        badge: null,
        highlighted: false,
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
        buttonClass: 'bg-jt-green text-jt-ink hover:brightness-95',
        badge: 'Recommended',
        highlighted: true,
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
        buttonClass: 'bg-jt-ink text-white hover:bg-jt-ink-soft',
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
    onClick,
    buttonClass,
    badge,
    highlighted,
}: {
    name: string;
    price: number;
    struckPrice?: number | null;
    billingCycle: 'monthly' | 'annual';
    features: string[];
    onClick: () => void;
    buttonClass: string;
    badge?: string | null;
    highlighted?: boolean;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-[32px] p-8 sm:rounded-jt-card',
                highlighted
                    ? 'bg-jt-ink text-white shadow-jt-soft'
                    : 'bg-jt-surface',
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <h3
                    className={cn(
                        'text-xl font-semibold tracking-[-0.02em]',
                        highlighted ? 'text-white' : 'text-jt-ink',
                    )}
                >
                    {name}
                </h3>
                {badge && (
                    <span className="rounded-full bg-jt-green px-3 py-1 text-xs font-semibold text-jt-ink">
                        {badge}
                    </span>
                )}
            </div>
            <div className="mt-6">
                {struckPrice && (
                    <div
                        className={cn(
                            'text-sm line-through',
                            highlighted ? 'text-white/50' : 'text-jt-muted',
                        )}
                    >
                        ${struckPrice}/mo
                    </div>
                )}
                <div className="flex items-baseline gap-1">
                    <span
                        className={cn(
                            'font-landing-display text-5xl font-extrabold tracking-[-0.04em]',
                            highlighted ? 'text-white' : 'text-jt-ink',
                        )}
                    >
                        ${price}
                    </span>
                    <span
                        className={cn(
                            'text-sm font-medium',
                            highlighted ? 'text-white/70' : 'text-jt-muted',
                        )}
                    >
                        per month
                    </span>
                </div>
                <p
                    className={cn(
                        'mt-1 text-xs font-medium',
                        highlighted ? 'text-white/50' : 'text-jt-muted',
                    )}
                >
                    {billingCycle === 'annual'
                        ? 'billed annually'
                        : 'billed monthly'}
                </p>
            </div>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'mt-6 h-14 w-full rounded-full text-[16px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50',
                    buttonClass,
                )}
            >
                Get started
            </button>
            <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                    <li
                        key={feature}
                        className={cn(
                            'flex items-start gap-2 text-sm',
                            highlighted ? 'text-white/75' : 'text-jt-muted',
                        )}
                    >
                        <Check
                            className={cn(
                                'mt-0.5 h-4 w-4 flex-shrink-0',
                                highlighted ? 'text-jt-green' : 'text-jt-ink',
                            )}
                        />
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
        <div className="border-b border-jt-line">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50 focus-visible:ring-inset"
            >
                <span className="text-[18px] font-semibold tracking-[-0.02em] text-jt-ink sm:text-[20px]">
                    {q}
                </span>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-jt-surface">
                    <ChevronDown
                        className={cn(
                            'h-5 w-5 text-jt-ink transition-transform duration-300',
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
                    <p className="pb-6 text-[16px] leading-6 tracking-[-0.02em] text-jt-muted">
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
        <footer className="bg-black pb-16">
            <div className="rounded-b-[50px] bg-white sm:rounded-b-[80px]">
                <div className="mx-auto max-w-[1320px] px-4 pt-16 pb-12 sm:px-6">
                    <div className="grid gap-10 md:grid-cols-3">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jt-ink">
                                    <AppLogoIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-landing-display text-xl font-bold tracking-[-0.03em] text-jt-ink">
                                    Slidezz
                                </span>
                            </div>
                            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-jt-muted">
                                Automate TikTok and Instagram slideshows that
                                bring traffic to your business.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-[14px] font-semibold text-jt-muted">
                                Product
                            </h4>
                            <ul className="mt-4 space-y-3 text-[14px]">
                                <li>
                                    <a
                                        href="#features"
                                        className="text-jt-ink hover:text-jt-green-deep"
                                    >
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#pricing"
                                        className="text-jt-ink hover:text-jt-green-deep"
                                    >
                                        Pricing
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#faq"
                                        className="text-jt-ink hover:text-jt-green-deep"
                                    >
                                        FAQ
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[14px] font-semibold text-jt-muted">
                                Legal
                            </h4>
                            <ul className="mt-4 space-y-3 text-[14px]">
                                <li>
                                    <Link
                                        href="/privacy-policy"
                                        className="text-jt-ink hover:text-jt-green-deep"
                                    >
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/terms"
                                        className="text-jt-ink hover:text-jt-green-deep"
                                    >
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <p className="text-[14px] text-jt-muted">
                            © {year} Slidezz. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4 text-jt-ink">
                            <TikTokMark className="h-5 w-5" />
                            <InstagramMark className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const sectionTag =
    'inline-flex rounded-full bg-jt-surface px-3 py-1 text-[14px] font-medium text-jt-ink';
const sectionTitle =
    'mt-5 max-w-4xl font-landing-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-jt-ink';
const greenButton =
    'inline-flex h-14 items-center justify-center rounded-full bg-jt-green px-8 text-[18px] font-semibold text-jt-ink transition duration-200 hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50';

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
            </Head>

            <div className="min-h-screen overflow-x-clip bg-white font-landing text-jt-ink">
                {/* ── NAV ── */}
                <header
                    className={cn(
                        'sticky top-0 z-50 transition-colors duration-200',
                        scrolled
                            ? 'bg-white/85 backdrop-blur-md'
                            : 'bg-transparent',
                    )}
                >
                    <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-4 sm:h-[88px] sm:px-6">
                        <div className="flex items-center gap-10">
                            <Link
                                href="/"
                                className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jt-ink">
                                    <AppLogoIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-landing-display text-[22px] font-bold tracking-[-0.03em] text-jt-ink">
                                    Slidezz
                                </span>
                            </Link>

                            <nav className="hidden items-center gap-8 md:flex">
                                {[
                                    ['#features', 'Features'],
                                    ['#pricing', 'Pricing'],
                                    ['#faq', 'FAQ'],
                                ].map(([href, label]) => (
                                    <a
                                        key={href}
                                        href={href}
                                        className="text-[15px] font-semibold text-jt-ink transition-colors hover:text-jt-muted"
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
                                    className="hidden text-[15px] font-semibold text-jt-ink transition-colors hover:text-jt-muted sm:inline-flex"
                                >
                                    Log in
                                </Link>
                            )}
                            <Link
                                href={auth.user ? dashboard() : ctaHref}
                                className="inline-flex h-11 items-center justify-center rounded-full bg-jt-ink px-5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-jt-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50 sm:h-[52px] sm:px-6 sm:text-[17px]"
                            >
                                {auth.user ? 'Go to app' : 'Get started'}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mx-auto max-w-[1320px] px-4 pt-16 pb-8 text-center sm:px-6 sm:pt-28">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-jt-surface px-4 py-1.5 text-[13px] text-jt-ink sm:text-[14px]">
                        <span className="font-semibold">
                            TikTok + Instagram
                        </span>
                        <span className="text-jt-green-deep">
                            · Posts every day
                        </span>
                    </div>

                    <h1 className="mx-auto mt-8 font-landing-display text-[clamp(2.75rem,9vw,8.75rem)] leading-[0.9] font-extrabold tracking-[-0.045em] text-balance text-jt-ink sm:max-w-[14ch]">
                        Automate TikTok slideshows 100% on autopilot
                    </h1>

                    <p className="mx-auto mt-8 max-w-xl text-[18px] leading-relaxed tracking-[-0.02em] text-jt-muted sm:text-[20px]">
                        Slidezz writes, designs and schedules faceless
                        slideshows and carousels for your brand. They don't look
                        like AI.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link href={ctaHref} className={greenButton}>
                            Make your first slideshow, free
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-jt-surface px-8 text-[18px] font-semibold text-jt-ink transition-colors duration-200 hover:bg-jt-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-jt-green-deep/50"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            See how it works
                        </a>
                    </div>

                    <SlideArc />

                    <div className="relative mt-10">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-jt-line" />
                        <div className="relative mx-auto flex w-fit flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-white px-4 text-[13px] text-jt-muted">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-jt-ink">
                                Publishes to
                                <TikTokMark className="h-4 w-4" />
                                <InstagramMark className="h-4 w-4" />
                            </span>
                            <span>
                                Works for apps, e-commerce, coaches, agencies
                                and creators.
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section
                    id="how-it-works"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <span className={sectionTag}>How it works</span>
                    <h2 className={sectionTitle}>
                        Automate faceless pages.{' '}
                        <span className="text-jt-ink/25">On autopilot.</span>
                    </h2>
                    <div className="mt-12 flex flex-col gap-4 sm:gap-6">
                        {steps.map((step, i) => (
                            <StepCard
                                key={step.title}
                                number={String(i + 1)}
                                title={step.title}
                                body={step.text}
                                className={stepStyles[i].block}
                                bodyClassName={stepStyles[i].body}
                            >
                                <step.Visual />
                            </StepCard>
                        ))}
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section
                    id="features"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <span className={sectionTag}>Features</span>
                    <h2 className={sectionTitle}>
                        Product features.{' '}
                        <span className="text-jt-ink/25">
                            Everything you need, all in one.
                        </span>
                    </h2>
                    <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {features.map((feature) => (
                            <FeatureCard
                                key={feature.title}
                                title={feature.title}
                                text={feature.text}
                                badge={feature.badge}
                            >
                                <feature.Visual />
                            </FeatureCard>
                        ))}
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section
                    id="pricing"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                        <div>
                            <span className={sectionTag}>Pricing</span>
                            <h2 className={sectionTitle}>Pricing & plans</h2>
                            <p className="mt-4 text-[18px] tracking-[-0.02em] text-jt-muted sm:text-[20px]">
                                Start small, upgrade when your posts start
                                working.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center gap-1 rounded-full bg-jt-surface p-1">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    'h-11 rounded-full px-5 text-sm font-semibold transition-colors duration-200',
                                    billingCycle === 'monthly'
                                        ? 'bg-white text-jt-ink shadow-jt-soft'
                                        : 'text-jt-muted hover:text-jt-ink',
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                className={cn(
                                    'flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200',
                                    billingCycle === 'annual'
                                        ? 'bg-white text-jt-ink shadow-jt-soft'
                                        : 'text-jt-muted hover:text-jt-ink',
                                )}
                            >
                                Annual
                                <span className="rounded-full bg-jt-lime px-2 py-0.5 text-[10px] font-semibold text-jt-ink">
                                    Save up to 35%
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-3">
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
                                    highlighted={plan.highlighted}
                                />
                            );
                        })}
                    </div>

                    {/* Lifetime offer */}
                    <div className="mt-4 overflow-hidden rounded-[32px] bg-jt-green-soft p-8 sm:mt-6 sm:rounded-jt-card sm:p-10">
                        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="inline-flex rounded-full bg-jt-lime px-3 py-1 text-xs font-semibold text-jt-ink">
                                    Launch offer
                                </span>
                                <h3 className="mt-3 font-landing-display text-3xl font-extrabold tracking-[-0.04em] text-jt-ink">
                                    Lifetime access
                                </h3>
                                <p className="mt-2 max-w-md text-[16px] text-jt-muted">
                                    Pay once, use forever. No subscription.
                                </p>
                                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                                    {lifetimeFeatures.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-center gap-2 text-sm font-medium text-jt-ink"
                                        >
                                            <Check className="h-4 w-4 text-jt-green-deep" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="text-left md:text-right">
                                <div className="font-landing-display text-5xl font-extrabold tracking-[-0.04em] text-jt-ink">
                                    $149
                                </div>
                                <div className="text-sm font-medium text-jt-muted">
                                    one-time payment
                                </div>
                                <Link
                                    href={ctaHref}
                                    className={cn(
                                        greenButton,
                                        'mt-4 bg-jt-ink text-[16px] whitespace-nowrap text-white hover:bg-jt-ink-soft hover:brightness-100',
                                    )}
                                >
                                    Claim lifetime access
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-[14px] text-jt-muted">
                        Cancel anytime. No contracts.
                    </p>
                </section>

                {/* ── FAQ ── */}
                <section
                    id="faq"
                    className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32"
                >
                    <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
                        <div>
                            <span className={sectionTag}>FAQ</span>
                            <h2 className={sectionTitle}>
                                Frequently asked questions
                            </h2>
                        </div>
                        <div className="border-t border-jt-line">
                            {faqs.map(({ q, a }) => (
                                <FaqItem key={q} q={q} a={a} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="mx-auto max-w-[1320px] px-4 pt-8 pb-24 text-center sm:px-6 sm:pb-32">
                    <h2 className="mx-auto max-w-[16ch] font-landing-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance text-jt-ink">
                        Your next 30 days of posts, done this afternoon.
                    </h2>
                    <Link href={ctaHref} className={cn(greenButton, 'mt-10')}>
                        Make your first slideshow, free
                    </Link>
                </section>

                {/* ── FOOTER ── */}
                <Footer />
            </div>
        </>
    );
}
