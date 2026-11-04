import {
    AlignCenter,
    ArrowRight,
    ArrowUp,
    Check,
    Download,
    Image as ImageIcon,
    Link2,
    Palette,
    PenTool,
    Plus,
    Sparkles,
    Terminal,
    Type as TypeIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';

export type CreateWay = {
    id: 'link' | 'describe' | 'editor' | 'claude';
    tag: string;
    title: string;
    body: string;
    checks: string[];
    open: string;
    demo: {
        input: string;
        chips: string[];
        result: string;
        action: string;
    };
};

// Each card holds the stage for DURATION ms, then hands over to the next one.
const DURATION = 7000;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const display = 'font-[Urbanist,Inter,sans-serif]';

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

// Starts while the card is still widening, total stagger stays under 0.5s.
const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const phase = (elapsed: number, start: number, duration: number) =>
    clamp01((elapsed - start) / duration);

// One-shot demo timeline: type, hold still, press, then the result lands.
function timeline(text: string) {
    const perChar = Math.min(28, 3300 / Math.max(1, text.length));
    const typeStart = 500;
    const typeEnd = typeStart + perChar * text.length;
    const press = typeEnd + 450;
    const result = press + 180;

    return { perChar, typeStart, typeEnd, press, result };
}

function typed(elapsed: number, text: string, reduce: boolean) {
    if (reduce) {
        return text;
    }

    const t = timeline(text);
    const count = Math.floor(
        clamp01((elapsed - t.typeStart) / (t.typeEnd - t.typeStart)) *
            text.length,
    );

    return text.slice(0, count);
}

function pressScale(elapsed: number, start: number) {
    return 1 - 0.06 * Math.sin(phase(elapsed, start, 180) * Math.PI);
}

function landing(elapsed: number, start: number, reduce: boolean) {
    if (reduce) {
        return { opacity: 1, y: 0 };
    }

    const t = phase(elapsed, start, 450);

    return { opacity: t, y: (1 - easeOut(t)) * 24 };
}

function useAutoAdvance(count: number, reduce: boolean) {
    const [active, setActive] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const elapsedRef = useRef(0);
    const holdRef = useRef(false);
    const stopRef = useRef(false);

    useEffect(() => {
        if (reduce) {
            return;
        }

        let raf = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const delta = Math.min(now - last, 100);
            last = now;

            if (!stopRef.current) {
                let next = elapsedRef.current + delta;

                if (next >= DURATION) {
                    if (holdRef.current) {
                        // Hovering: the demo finishes, the card stays.
                        next = DURATION;
                    } else {
                        next = 0;
                        setActive((current) => (current + 1) % count);
                    }
                }

                elapsedRef.current = next;
                setElapsed(next);
            }

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [count, reduce]);

    const activate = (index: number) => {
        elapsedRef.current = 0;
        setElapsed(0);
        setActive(index);
    };

    const setHold = (hold: boolean) => {
        holdRef.current = hold;
    };

    const setStopped = (stopped: boolean) => {
        stopRef.current = stopped;
    };

    return { active, elapsed, activate, setHold, setStopped };
}

const icons: Record<CreateWay['id'], LucideIcon> = {
    link: Link2,
    describe: Sparkles,
    editor: PenTool,
    claude: Terminal,
};

function IconTile({ id }: { id: CreateWay['id'] }) {
    const Icon = icons[id];

    return (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#111] text-white">
            <Icon size={18} />
        </span>
    );
}

function Tag({ children }: { children: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCEBF7] px-3 py-1 text-xs font-medium text-[#111]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8FB83A]" />
            {children}
        </span>
    );
}

function Checks({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2.5">
            {items.map((item) => (
                <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-[#111]"
                >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#DCEBF7]">
                        <Check size={12} />
                    </span>
                    {item}
                </li>
            ))}
        </ul>
    );
}

function ProgressBar({ elapsed }: { elapsed: number }) {
    return (
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
                className="h-full origin-left rounded-full bg-[#111]"
                style={{ transform: `scaleX(${clamp01(elapsed / DURATION)})` }}
            />
        </div>
    );
}

function StatusPill({ text, opacity }: { text: string; opacity: number }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#111] shadow-sm"
            style={{ opacity }}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-[#8FB83A]" />
            {text}
        </span>
    );
}

function SlideThumb({
    src,
    className,
    style,
}: {
    src: string;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            className={cn(
                'relative aspect-[3/4] shrink-0 overflow-hidden bg-white',
                className,
            )}
            style={style}
        >
            <img
                src={src}
                alt=""
                draggable={false}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3 w-2/3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-white/90" />
                <div className="h-1.5 w-2/3 rounded-full bg-white/60" />
            </div>
        </div>
    );
}

function Caret({ show }: { show: boolean }) {
    return show ? (
        <span className="ml-0.5 inline-block h-[1.1em] w-[1.5px] translate-y-[0.15em] bg-current" />
    ) : null;
}

function CollapsedArt({
    id,
    photos,
}: {
    id: CreateWay['id'];
    photos: string[];
}) {
    if (id === 'link') {
        return (
            <div className="relative -rotate-6">
                <img
                    src={photos[0]}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="aspect-[3/4] w-[100px] rounded-[16px] border-4 border-white object-cover shadow-xl"
                />
                <span className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-medium whitespace-nowrap text-[#111] shadow-sm">
                    <Link2 size={10} />
                    youtu.be/...
                </span>
            </div>
        );
    }

    if (id === 'describe') {
        return (
            <div className="w-[124px] rotate-3 rounded-[14px] bg-white p-3 shadow-lg">
                <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-[#E5E7EB]" />
                    <div className="h-2 w-3/4 rounded bg-[#E5E7EB]" />
                    <div className="h-2 w-1/2 rounded bg-[#E5E7EB]" />
                </div>
                <span className="mt-3 grid h-6 w-6 place-items-center rounded-md bg-[#D4F27A] text-[#111]">
                    <ArrowUp size={12} />
                </span>
            </div>
        );
    }

    if (id === 'editor') {
        return (
            <div className="relative rotate-6">
                <div className="relative aspect-[3/4] w-[100px] rounded-[14px] border border-[#E5E7EB] bg-white p-3 shadow-lg">
                    <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-[#E5E7EB]" />
                        <div className="h-2 w-2/3 rounded bg-[#E5E7EB]" />
                    </div>
                    <div className="absolute top-12 left-3 border border-dashed border-[#111]/40 px-2 py-1.5">
                        <div className="h-1.5 w-10 rounded bg-[#111]/25" />
                        {[
                            '-top-1 -left-1',
                            '-top-1 -right-1',
                            '-bottom-1 -left-1',
                            '-right-1 -bottom-1',
                        ].map((corner) => (
                            <span
                                key={corner}
                                className={cn(
                                    'absolute h-1.5 w-1.5 border border-[#111]/40 bg-white',
                                    corner,
                                )}
                            />
                        ))}
                    </div>
                </div>
                <span className="absolute -top-3 -right-3 grid h-7 w-7 place-items-center rounded-md bg-[#111] text-white shadow-sm">
                    <TypeIcon size={14} />
                </span>
            </div>
        );
    }

    return (
        <div className="w-[124px] -rotate-3 rounded-[14px] bg-[#111] p-3 shadow-xl">
            <div className="space-y-2">
                <div className="h-2 w-3/4 rounded bg-[#D4F27A]" />
                <div className="h-2 w-full rounded bg-white/40" />
                <div className="h-2 w-2/3 rounded bg-[#D4F27A]/70" />
                <div className="h-2 w-1/2 rounded bg-white/40" />
            </div>
        </div>
    );
}

type DemoProps = {
    way: CreateWay;
    elapsed: number;
    reduce: boolean;
    photos: string[];
};

function useDemo({ way, elapsed, reduce }: DemoProps) {
    const t = timeline(way.demo.input);
    const enter = reduce ? 1 : easeOut(phase(elapsed, 0, 400));

    return {
        t,
        text: typed(elapsed, way.demo.input, reduce),
        typing: !reduce && elapsed >= t.typeStart && elapsed < t.typeEnd,
        press: reduce ? 1 : pressScale(elapsed, t.press),
        resultOpacity: reduce ? 1 : phase(elapsed, t.result, 300),
        frame: reduce
            ? undefined
            : { opacity: enter, transform: `scale(${0.96 + enter * 0.04})` },
    };
}

function LinkDemo(props: DemoProps) {
    const { way, elapsed, reduce, photos } = props;
    const d = useDemo(props);

    return (
        <div
            className="flex w-full max-w-[400px] flex-col items-center gap-6 px-4"
            style={d.frame}
        >
            <div className="flex w-full items-center gap-2 rounded-full bg-white p-2 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F5F7] text-[#111]">
                    <Link2 size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#111]">
                    {d.text}
                    <Caret show={d.typing} />
                </span>
                <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#111] text-white"
                    style={{ transform: `scale(${d.press})` }}
                >
                    <ArrowRight size={18} />
                </span>
            </div>

            <div className="flex flex-col items-center gap-4">
                <StatusPill text={way.demo.result} opacity={d.resultOpacity} />
                <div className="flex items-center">
                    {[0, 1, 2].map((i) => {
                        const land = landing(
                            elapsed,
                            d.t.result + i * 80,
                            reduce,
                        );
                        const rotate = [-6, 0, 6][i];
                        const lift = i === 1 ? -10 : 0;

                        return (
                            <SlideThumb
                                key={i}
                                src={photos[i]}
                                className={cn(
                                    'w-[88px] rounded-[16px] border-2 border-white shadow-xl sm:w-[104px]',
                                    i === 1 ? 'z-10' : '-mx-3',
                                )}
                                style={{
                                    opacity: land.opacity,
                                    transform: `translateY(${land.y + lift}px) rotate(${rotate}deg)`,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function DescribeDemo(props: DemoProps) {
    const { way, elapsed, reduce, photos } = props;
    const d = useDemo(props);

    return (
        <div
            className="flex w-full max-w-[400px] flex-col items-center gap-5 px-4"
            style={d.frame}
        >
            <div className="w-full rounded-[18px] bg-white shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                <p className="min-h-[88px] p-4 text-[15px] leading-relaxed text-[#111]">
                    {d.text}
                    <Caret show={d.typing} />
                </p>
                <div className="flex items-center gap-1.5 border-t border-[#F0F1F3] p-2.5">
                    {way.demo.chips.map((chip) => (
                        <span
                            key={chip}
                            className="rounded-lg bg-[#F3F5F7] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-[#111]"
                        >
                            {chip}
                        </span>
                    ))}
                    <span
                        className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#D4F27A] text-[#111]"
                        style={{ transform: `scale(${d.press})` }}
                    >
                        <ArrowUp size={16} />
                    </span>
                </div>
            </div>

            <StatusPill text={way.demo.result} opacity={d.resultOpacity} />
            <div className="flex gap-3">
                {[3, 4, 5].map((photo, i) => {
                    const land = landing(elapsed, d.t.result + i * 80, reduce);

                    return (
                        <SlideThumb
                            key={photo}
                            src={photos[photo]}
                            className="w-[76px] rounded-[14px] shadow-lg sm:w-[84px]"
                            style={{
                                opacity: land.opacity,
                                transform: `translateY(${land.y}px)`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function EditorDemo(props: DemoProps) {
    const { way, photos } = props;
    const d = useDemo(props);
    const tools: LucideIcon[] = [TypeIcon, ImageIcon, Palette, AlignCenter];

    return (
        <div
            className="flex w-full max-w-[400px] flex-col items-center gap-4 px-4"
            style={d.frame}
        >
            <div className="rounded-[18px] bg-white p-3 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                <div className="flex items-center gap-1.5">
                    {tools.map((Icon, i) => (
                        <span
                            key={i}
                            className="grid h-7 w-7 place-items-center rounded-md bg-[#F3F5F7] text-[#5B6470]"
                        >
                            <Icon size={14} />
                        </span>
                    ))}
                    <span
                        className="ml-auto grid h-7 w-7 place-items-center rounded-md bg-[#111] text-white"
                        style={{ transform: `scale(${d.press})` }}
                    >
                        <Download size={14} />
                    </span>
                </div>

                <div className="relative mt-3 aspect-[3/4] w-[210px] overflow-hidden rounded-[12px]">
                    <img
                        src={photos[1]}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/15 to-transparent" />
                    <div className="absolute top-5 right-4 left-4 border border-dashed border-white/80 px-2 py-1.5">
                        <p className="text-lg leading-tight font-bold text-white">
                            {d.text}
                            <Caret show={d.typing} />
                        </p>
                        {[
                            '-top-1 -left-1',
                            '-top-1 -right-1',
                            '-bottom-1 -left-1',
                            '-right-1 -bottom-1',
                        ].map((corner) => (
                            <span
                                key={corner}
                                className={cn(
                                    'absolute h-2 w-2 bg-white',
                                    corner,
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <StatusPill text={way.demo.result} opacity={d.resultOpacity} />
        </div>
    );
}

function ClaudeDemo(props: DemoProps) {
    const { way, elapsed, reduce, photos } = props;
    const d = useDemo(props);
    const tool = reduce ? 1 : easeOut(phase(elapsed, d.t.press, 220));

    return (
        <div className="w-full max-w-[400px] px-4" style={d.frame}>
            <div className="rounded-[18px] bg-[#111] p-5 font-mono text-[13px] text-white/90 shadow-xl">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </div>

                <p className="mt-4 flex min-h-[40px] gap-2">
                    <span className="text-white/40">&gt;</span>
                    <span className="flex-1">
                        {d.text}
                        <Caret show={d.typing} />
                    </span>
                </p>

                <span
                    className="mt-3 inline-flex origin-left items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px]"
                    style={{
                        opacity: tool,
                        transform: `scale(${0.9 + tool * 0.1})`,
                    }}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4F27A]" />
                    slidezz · generate_slideshow
                </span>

                <p
                    className="mt-3 text-[#D4F27A]"
                    style={{ opacity: d.resultOpacity }}
                >
                    ✓ {way.demo.result}
                </p>

                <div className="mt-3 flex gap-2">
                    {[2, 3, 4].map((photo, i) => {
                        const land = landing(
                            elapsed,
                            d.t.result + i * 80,
                            reduce,
                        );

                        return (
                            <img
                                key={photo}
                                src={photos[photo]}
                                alt=""
                                draggable={false}
                                loading="lazy"
                                className="aspect-[3/4] w-16 rounded-lg object-cover"
                                style={{
                                    opacity: land.opacity,
                                    transform: `translateY(${land.y}px)`,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Demo(props: DemoProps) {
    switch (props.way.id) {
        case 'link':
            return <LinkDemo {...props} />;
        case 'describe':
            return <DescribeDemo {...props} />;
        case 'editor':
            return <EditorDemo {...props} />;
        case 'claude':
            return <ClaudeDemo {...props} />;
    }
}

function ExpandedText({
    way,
    number,
    elapsed,
    reduce,
    wide,
}: {
    way: CreateWay;
    number: string;
    elapsed: number;
    reduce: boolean;
    wide: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-col',
                wide ? 'h-full w-[290px] shrink-0 p-7' : 'p-6',
            )}
        >
            <div className="flex items-start justify-between">
                <IconTile id={way.id} />
                <span className="text-xs text-[#9AA1AB] tabular-nums">
                    {number}
                </span>
            </div>

            <motion.div
                className={wide ? 'mt-auto' : 'mt-6'}
                variants={containerVariants}
                initial={reduce ? false : 'hidden'}
                animate="show"
            >
                <motion.div variants={itemVariants}>
                    <Tag>{way.tag}</Tag>
                </motion.div>
                <motion.h3
                    variants={itemVariants}
                    className={cn(
                        display,
                        'mt-3 font-semibold tracking-[-0.03em] text-[#111]',
                        wide
                            ? 'text-[40px] leading-[1.02]'
                            : 'text-[34px] leading-[1.02]',
                    )}
                >
                    {way.title}
                </motion.h3>
                <motion.p
                    variants={itemVariants}
                    className="mt-3 text-[15px] leading-relaxed text-[#5B6470]"
                >
                    {way.body}
                </motion.p>
                <motion.div variants={itemVariants} className="mt-5">
                    <Checks items={way.checks} />
                </motion.div>
                {!reduce && (
                    <motion.div variants={itemVariants} className="mt-6">
                        <ProgressBar elapsed={elapsed} />
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default function CreateWays({
    ways,
    photos,
}: {
    ways: CreateWay[];
    photos: string[];
}) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const reduce = Boolean(useReducedMotion());
    const { active, elapsed, activate, setHold, setStopped } = useAutoAdvance(
        ways.length,
        reduce,
    );
    const setStoppedRef = useRef(setStopped);

    // Off screen or in a background tab, everything stops.
    useEffect(() => {
        const el = rootRef.current;
        const stop = setStoppedRef.current;
        let visible = true;
        const sync = () => stop(!visible || document.hidden);

        const observer = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                sync();
            },
            { threshold: 0.35 },
        );

        if (el) {
            observer.observe(el);
        }

        document.addEventListener('visibilitychange', sync);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);

    const onPointer =
        (hold: boolean) => (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse') {
                setHold(hold);
            }
        };

    return (
        <div
            ref={rootRef}
            onPointerEnter={onPointer(true)}
            onPointerLeave={onPointer(false)}
            className="flex flex-col gap-2 rounded-[32px] bg-[#F3F5F7] p-2 xl:h-[560px] xl:flex-row"
        >
            {ways.map((way, index) => {
                const isActive = index === active;
                const number = String(index + 1).padStart(2, '0');
                const panelId = `create-way-${way.id}`;

                return (
                    <div
                        key={way.id}
                        className={cn(
                            'relative min-w-0 overflow-hidden rounded-[26px] bg-white',
                            isActive
                                ? 'xl:shrink xl:grow xl:basis-0'
                                : 'xl:shrink-0 xl:grow-0 xl:basis-[170px]',
                            !reduce &&
                                'xl:transition-[flex-grow,flex-basis] xl:duration-700 xl:ease-[cubic-bezier(0.22,1,0.36,1)]',
                        )}
                    >
                        {isActive ? (
                            <div
                                id={panelId}
                                role="region"
                                aria-label={way.title}
                                className="xl:flex xl:h-full"
                            >
                                <div className="hidden xl:contents">
                                    <ExpandedText
                                        key={`wide-${way.id}`}
                                        way={way}
                                        number={number}
                                        elapsed={elapsed}
                                        reduce={reduce}
                                        wide
                                    />
                                </div>
                                <div className="xl:hidden">
                                    <ExpandedText
                                        key={`narrow-${way.id}`}
                                        way={way}
                                        number={number}
                                        elapsed={elapsed}
                                        reduce={reduce}
                                        wide={false}
                                    />
                                </div>
                                <div
                                    aria-hidden="true"
                                    className="m-2 grid h-[360px] min-w-0 grid-cols-[minmax(0,1fr)] place-items-center overflow-hidden rounded-[22px] bg-[#F3F5F7] xl:h-auto xl:flex-1"
                                >
                                    <Demo
                                        way={way}
                                        elapsed={reduce ? DURATION : elapsed}
                                        reduce={reduce}
                                        photos={photos}
                                    />
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => activate(index)}
                                aria-expanded={false}
                                aria-controls={panelId}
                                aria-label={way.title}
                                className="group flex w-full cursor-pointer items-center gap-4 p-4 text-left xl:h-full xl:flex-col xl:items-stretch xl:gap-0 xl:p-5"
                            >
                                <span className="flex items-start justify-between xl:w-full">
                                    <IconTile id={way.id} />
                                    <span className="hidden text-xs text-[#9AA1AB] tabular-nums xl:inline">
                                        {number}
                                    </span>
                                </span>

                                <span
                                    aria-hidden="true"
                                    className="hidden flex-1 place-items-center xl:grid"
                                >
                                    <span
                                        className={cn(
                                            'block',
                                            !reduce &&
                                                'transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-1',
                                        )}
                                    >
                                        <CollapsedArt
                                            id={way.id}
                                            photos={photos}
                                        />
                                    </span>
                                </span>

                                <span className="block">
                                    <span
                                        className={cn(
                                            display,
                                            'block text-lg font-semibold tracking-[-0.02em] text-[#111] xl:text-2xl xl:leading-tight',
                                        )}
                                    >
                                        {way.title}
                                    </span>
                                    <span className="mt-2 hidden items-center gap-1.5 text-sm text-[#9AA1AB] xl:flex">
                                        <Plus size={14} />
                                        {way.open}
                                    </span>
                                </span>

                                <span className="ml-auto text-xs text-[#9AA1AB] tabular-nums xl:hidden">
                                    {number}
                                </span>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
