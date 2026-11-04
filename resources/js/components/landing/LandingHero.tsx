import { Link } from '@inertiajs/react';
import {
    Bot,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Images,
    Layers,
    Loader2,
    Play,
    Plus,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type HeroCopy = {
    badgeTag: string;
    badgeText: string;
    badgeHref: string;
    line1: string;
    line2: string;
    lead: string;
    sub: string;
    cta: string;
    secondary: string;
    secondaryHref: string;
    footLeft: string;
    footRight: string;
    app: {
        workspace: string;
        project: string;
        status: string;
        sectionLabel: string;
        nav: { label: string; count?: number }[];
        teamName: string;
        teamSub: string;
        kicker: string;
        title: string;
        generate: string;
        generating: string;
        slides: { src: string; text: string }[];
        canvasHint: string;
        panelLabel: string;
        panelBadge: string;
        panelTitle: string;
        panelSub: string;
        fieldLabel: string;
        fieldText: string;
        rows: { label: string; value: string }[];
        panelFoot: string;
        statusLeft: string;
        zoom: string;
    };
};

const sans = "font-['Instrument_Sans',system-ui,sans-serif]";
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const navIcons = [Bot, Sparkles, CalendarDays, Images, Layers] as const;

/** Phones show 3 slides, sm 4, lg 5: the rest only count toward the total. */
function slideVisibility(index: number) {
    if (index < 3) {
        return '';
    }

    if (index === 3) {
        return 'hidden sm:block';
    }

    if (index === 4) {
        return 'hidden lg:block';
    }

    return 'hidden';
}

function rise(delay: number, y = 40) {
    return {
        initial: { opacity: 0, y },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: EASE_OUT, delay },
    };
}

export default function LandingHero({
    copy,
    ctaHref,
    bgSrc,
    bgSrcSm,
    logo,
}: {
    copy: HeroCopy;
    ctaHref: string;
    bgSrc: string;
    bgSrcSm: string;
    logo: ReactNode;
}) {
    const [runKey, setRunKey] = useState(0);
    const [generating, setGenerating] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const app = copy.app;
    // First run waits for the frame to land; a replay starts right away.
    const slideStart = runKey === 0 ? 0.9 : 0.1;

    useEffect(
        () => () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    const handleGenerate = () => {
        setRunKey((key) => key + 1);
        setGenerating(true);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => setGenerating(false), 1200);
    };

    return (
        <MotionConfig reducedMotion="user">
            <div className="px-2 pt-2 sm:px-4 sm:pt-4">
                <section
                    className={cn(
                        sans,
                        'relative isolate overflow-hidden rounded-t-[14px] bg-[#FAFBFC]',
                    )}
                >
                    {/* Mirrored so the open sky sits behind the headline. */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 -scale-x-100"
                    >
                        <motion.img
                            src={bgSrc}
                            srcSet={`${bgSrcSm} 1280w, ${bgSrc} 2560w`}
                            sizes="100vw"
                            fetchPriority="high"
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
                            initial={{ scale: 1.06 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 1.6, ease: EASE_OUT }}
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(229,242,255,0.40)_0%,rgba(234,245,251,0.25)_55%,rgba(250,251,252,0.95)_100%)]"
                    />
                    {/* Phones crop to the arm, so the copy needs a stronger veil. */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-[#EEF4F9]/60 lg:hidden"
                    />

                    <div className="mx-auto max-w-[1320px] px-4 pt-[108px] pb-7 sm:px-8 lg:px-10 lg:pt-[150px]">
                        <motion.a
                            href={copy.badgeHref}
                            className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/70 bg-white/55 py-[3px] pr-2.5 pl-[3px] text-[#1A2023] backdrop-blur transition-colors hover:bg-white/80"
                            {...rise(0, 16)}
                        >
                            <span className="shrink-0 rounded bg-[#E7EF95] px-2 py-1 text-[9px] leading-none font-bold uppercase">
                                {copy.badgeTag}
                            </span>
                            <span className="truncate text-[11.5px]">
                                {copy.badgeText}
                            </span>
                            <ChevronRight
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                        </motion.a>

                        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-center">
                            <h1 className="text-[clamp(2.6rem,5.4vw,5.1rem)] leading-[0.99] font-medium tracking-[-0.065em]">
                                <motion.span
                                    className="block text-[#1A2023]"
                                    {...rise(0.05)}
                                >
                                    {copy.line1}
                                </motion.span>
                                <motion.span
                                    className="block text-[#344C5D]"
                                    {...rise(0.17)}
                                >
                                    {copy.line2}
                                </motion.span>
                            </h1>

                            <motion.div {...rise(0.3, 16)}>
                                <p className="text-[19.2px] leading-[1.35] tracking-[-0.025em] text-[#253E50]">
                                    {copy.lead}
                                </p>
                                <p className="mt-3 text-[13.6px] leading-[1.6] text-[#344F62]">
                                    {copy.sub}
                                </p>

                                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                                    <Link
                                        href={ctaHref}
                                        className="group inline-flex h-12 items-center gap-3.5 rounded-full bg-[#1A2023] pr-2 pl-[22px] text-sm font-medium text-white transition-colors hover:bg-[#2A3438]"
                                    >
                                        {copy.cta}
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/12 transition-transform group-hover:translate-x-0.5">
                                            <ChevronRight
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </Link>
                                    <a
                                        href={copy.secondaryHref}
                                        className="group inline-flex items-center gap-1 text-sm font-medium text-[#1A2023] hover:underline"
                                    >
                                        {copy.secondary}
                                        <ChevronRight
                                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                                            aria-hidden="true"
                                        />
                                    </a>
                                </div>
                            </motion.div>
                        </div>

                        {/* Glass frame around a working mock of the editor */}
                        <motion.div
                            className="mt-11 rounded-[18px] border border-white/75 bg-white/35 p-1.5 shadow-[0_30px_80px_-30px_rgba(23,52,84,0.35)] backdrop-blur-md sm:p-2"
                            initial={{ opacity: 0, y: 48 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.9,
                                ease: EASE_OUT,
                                delay: 0.35,
                            }}
                        >
                            <div className="overflow-hidden rounded-xl border border-[#E8ECEF] bg-white">
                                <div className="flex h-[52px] items-center border-b border-[#EEF1F3] px-4">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center">
                                            {logo}
                                        </span>
                                        <span className="shrink-0 text-xs font-semibold text-[#1A2023]">
                                            {app.workspace}
                                        </span>
                                        <span className="text-xs text-[#B5BEC5]">
                                            /
                                        </span>
                                        <span className="truncate text-xs text-[#6B7780]">
                                            {app.project}
                                        </span>
                                    </div>

                                    <div className="ml-auto flex shrink-0 items-center gap-2.5 pl-3">
                                        <div
                                            aria-hidden="true"
                                            className="hidden -space-x-1 sm:flex"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E3E8EC] text-[9px] font-semibold text-[#1A2023]">
                                                LV
                                            </span>
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#BFD9EE] text-[9px] font-semibold text-[#1A2023]">
                                                MS
                                            </span>
                                        </div>
                                        <span className="hidden items-center gap-1.5 text-[10.5px] text-[#6B7780] sm:flex">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
                                            {app.status}
                                        </span>
                                        <span className="grid h-7 w-7 place-items-center rounded-md text-[#5B6870]">
                                            <Layers
                                                className="h-[15px] w-[15px]"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </div>
                                </div>

                                <div className="grid min-h-[300px] md:grid-cols-[150px_minmax(0,1fr)] lg:h-[430px] lg:grid-cols-[170px_minmax(0,1fr)_250px]">
                                    <aside className="hidden flex-col border-r border-[#EEF1F3] bg-[#FBFCFC] p-3 md:flex">
                                        <p className="mb-3 px-1 text-[9px] tracking-wide text-[#7C878F] uppercase">
                                            {app.sectionLabel}
                                        </p>
                                        <div className="space-y-1">
                                            {app.nav.map((item, index) => {
                                                const Icon =
                                                    navIcons[
                                                        index % navIcons.length
                                                    ];

                                                return (
                                                    <div
                                                        key={item.label}
                                                        className={cn(
                                                            'flex h-[34px] items-center gap-2.5 rounded-md px-2.5 text-[11.5px]',
                                                            index === 0
                                                                ? 'bg-[#E4EEF8] text-[#1A2023]'
                                                                : 'text-[#5B6870]',
                                                        )}
                                                    >
                                                        <Icon
                                                            className="h-3.5 w-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="truncate">
                                                            {item.label}
                                                        </span>
                                                        {item.count !==
                                                            undefined && (
                                                            <span className="ml-auto text-[10px] tabular-nums">
                                                                {item.count}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-auto flex items-center gap-2.5 px-1 pt-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#E7EF95] text-[10px] font-semibold text-[#1A2023]">
                                                {app.teamName.charAt(0)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-[10.5px] font-semibold text-[#1A2023]">
                                                    {app.teamName}
                                                </span>
                                                <span className="block truncate text-[9px] text-[#7C878F]">
                                                    {app.teamSub}
                                                </span>
                                            </span>
                                        </div>
                                    </aside>

                                    <div className="flex min-w-0 flex-col">
                                        <div className="flex items-center gap-3 border-b border-[#EEF1F3] px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="text-[9px] tracking-wide text-[#7C878F] uppercase">
                                                    {app.kicker}
                                                </p>
                                                <p className="mt-0.5 truncate text-[13.5px] font-medium text-[#1A2023]">
                                                    {app.title}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleGenerate}
                                                className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-[#1A2023] px-3 text-[10.5px] font-medium text-white transition-colors hover:bg-[#2A3438]"
                                            >
                                                <Play
                                                    className="h-[11px] w-[11px]"
                                                    aria-hidden="true"
                                                />
                                                {app.generate}
                                            </button>
                                        </div>

                                        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-[radial-gradient(#E5EAEB_1px,transparent_1px)] [background-size:14px_14px] px-4 py-6">
                                            <div
                                                key={runKey}
                                                className="flex items-center gap-3"
                                            >
                                                {app.slides.map(
                                                    (slide, index) => {
                                                        const selected =
                                                            index === 0;

                                                        return (
                                                            <motion.div
                                                                key={slide.src}
                                                                className={cn(
                                                                    'relative aspect-[4/5] w-[88px] shrink-0 overflow-hidden rounded-lg border border-[#E8ECEF] bg-white shadow-sm sm:w-[100px] lg:w-[112px]',
                                                                    selected &&
                                                                        'ring-[1.5px] ring-[#5A8FC2] ring-offset-2',
                                                                    slideVisibility(
                                                                        index,
                                                                    ),
                                                                )}
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 16,
                                                                    scale: 0.96,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: selected
                                                                        ? -6
                                                                        : 0,
                                                                    scale: 1,
                                                                }}
                                                                transition={{
                                                                    duration: 0.5,
                                                                    ease: EASE_OUT,
                                                                    delay:
                                                                        slideStart +
                                                                        index *
                                                                            0.09,
                                                                }}
                                                            >
                                                                <img
                                                                    src={
                                                                        slide.src
                                                                    }
                                                                    alt=""
                                                                    draggable={
                                                                        false
                                                                    }
                                                                    className="absolute inset-0 h-full w-full object-cover"
                                                                />
                                                                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent p-2 pb-5">
                                                                    <p className="line-clamp-4 text-[9px] leading-snug font-semibold text-white">
                                                                        {
                                                                            slide.text
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <span className="absolute bottom-1.5 left-1.5 rounded bg-white/85 px-1 py-0.5 text-[8px] font-medium text-[#1A2023]">
                                                                    {index + 1}/
                                                                    {
                                                                        app
                                                                            .slides
                                                                            .length
                                                                    }
                                                                </span>
                                                            </motion.div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            <p className="flex items-center gap-1.5 text-[9.5px] text-[#7C878F]">
                                                <ShieldCheck
                                                    className="h-[11px] w-[11px]"
                                                    aria-hidden="true"
                                                />
                                                {app.canvasHint}
                                            </p>
                                        </div>

                                        <div className="flex h-8 items-center justify-between border-t border-[#EEF1F3] px-4 text-[9.5px] text-[#7C878F]">
                                            <span
                                                className="flex items-center gap-1.5"
                                                aria-live="polite"
                                            >
                                                {generating ? (
                                                    <>
                                                        <Loader2
                                                            className="h-2.5 w-2.5 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                        {app.generating}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="h-[5px] w-[5px] rounded-full bg-[#4CAF50]" />
                                                        {app.statusLeft}
                                                    </>
                                                )}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {app.zoom}
                                                <Plus
                                                    className="h-[11px] w-[11px]"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </div>
                                    </div>

                                    <aside className="hidden min-w-0 flex-col border-l border-[#EEF1F3] p-4 lg:flex">
                                        <div className="flex items-center gap-2">
                                            <span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-[#E7EF95] text-[#1A2023]">
                                                <Sparkles
                                                    className="h-[13px] w-[13px]"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="text-[9px] tracking-wide text-[#5B6870] uppercase">
                                                {app.panelLabel}
                                            </span>
                                            <span className="ml-auto rounded bg-[#F1F3F4] px-1.5 py-0.5 text-[9px] text-[#5B6870]">
                                                {app.panelBadge}
                                            </span>
                                        </div>

                                        <p className="mt-4 text-[15px] leading-tight font-medium tracking-[-0.01em] text-[#1A2023]">
                                            {app.panelTitle}
                                        </p>
                                        <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6B7780]">
                                            {app.panelSub}
                                        </p>

                                        <p className="mt-4 mb-1.5 text-[9.5px] text-[#7C878F]">
                                            {app.fieldLabel}
                                        </p>
                                        <div className="rounded-md border border-[#EAEDEF] bg-[#F6F7F8] p-2.5 text-[10px] leading-relaxed text-[#6B7780]">
                                            {app.fieldText}
                                        </div>

                                        <div className="mt-3">
                                            {app.rows.map((row) => (
                                                <div
                                                    key={row.label}
                                                    className="flex items-center justify-between gap-3 border-b border-[#EEF1F3] py-2 text-[10px]"
                                                >
                                                    <span className="text-[#7C878F]">
                                                        {row.label}
                                                    </span>
                                                    <span className="text-right font-medium text-[#1A2023]">
                                                        {row.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <p className="mt-auto flex items-center gap-1.5 pt-3 text-[9.5px] text-[#7C878F]">
                                            <CheckCircle2
                                                className="h-[11px] w-[11px]"
                                                aria-hidden="true"
                                            />
                                            {app.panelFoot}
                                        </p>
                                    </aside>
                                </div>
                            </div>
                        </motion.div>

                        <div className="mt-4 flex items-center justify-between pb-2 text-[11.5px] text-[#4A5E6C]">
                            <span className="flex items-center gap-1.5">
                                <Play
                                    className="h-[11px] w-[11px]"
                                    aria-hidden="true"
                                />
                                {copy.footLeft}
                            </span>
                            <a
                                href="#como-funciona"
                                className="hidden items-center gap-1.5 text-[10.5px] tracking-[0.08em] uppercase hover:text-[#1A2023] sm:flex"
                            >
                                {copy.footRight}
                                <ChevronDown
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                />
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </MotionConfig>
    );
}
