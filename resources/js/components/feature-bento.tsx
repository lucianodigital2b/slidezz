import { Check, Clock, Download, Sparkles, Users } from 'lucide-react';
import { motion, type Transition, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const INK = '#1A1A1A';
const FLAME = '#E8440A';

const reveal = {
    hidden: { opacity: 0, y: 28 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const loop = (extra: Transition): Transition => ({
    repeat: Infinity,
    repeatType: 'reverse',
    ease: 'easeInOut',
    ...extra,
});

function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <motion.div
            variants={reveal}
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-[24px] bg-white p-6 sm:p-7',
                className,
            )}
            style={{ border: `1px solid ${INK}`, boxShadow: '0 14px 36px rgba(0,0,0,0.06)' }}
        >
            {children}
        </motion.div>
    );
}

function Copy({ title, body }: { title: string; body: string }) {
    return (
        <div className="mt-auto">
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">{title}</h3>
            <p className="mt-1.5 text-base font-medium leading-relaxed text-[#666660]">{body}</p>
        </div>
    );
}

// ── Graphics ─────────────────────────────────────────────────────────────────

function CarouselsGraphic({ still }: { still: boolean }) {
    const slide = (extra: string, content: React.ReactNode) => (
        <div
            className={cn('absolute h-[200px] w-[160px] rounded-2xl bg-white p-4', extra)}
            style={{ border: `1px solid ${INK}` }}
        >
            {content}
        </div>
    );
    return (
        <div className="relative mb-6 flex h-[260px] items-center justify-center">
            <div
                className="absolute h-40 w-40 rounded-full opacity-20 blur-2xl"
                style={{ background: FLAME }}
            />
            {slide(
                '-rotate-[10deg] -translate-x-16 translate-y-2 opacity-90',
                <div className="space-y-2">
                    <div className="h-2.5 w-10 rounded-full" style={{ background: '#E8E7E2' }} />
                    <div className="h-3 w-24 rounded-full bg-[#1A1A1A]/80" />
                    <div className="h-2 w-20 rounded-full" style={{ background: '#E8E7E2' }} />
                </div>,
            )}
            {slide(
                'rotate-[10deg] translate-x-16 translate-y-2 opacity-90',
                <div className="space-y-2">
                    <div className="h-2.5 w-12 rounded-full" style={{ background: '#E8E7E2' }} />
                    <div className="h-3 w-20 rounded-full bg-[#1A1A1A]/80" />
                    <div className="h-2 w-24 rounded-full" style={{ background: '#E8E7E2' }} />
                </div>,
            )}
            <motion.div
                className="absolute h-[210px] w-[166px] rounded-2xl bg-white p-4 shadow-[0_20px_40px_rgba(0,0,0,0.14)]"
                style={{ border: `1px solid ${INK}` }}
                animate={still ? undefined : { y: [-6, 6] }}
                transition={still ? undefined : loop({ duration: 3 })}
            >
                <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white uppercase"
                    style={{ background: FLAME }}
                >
                    Hook
                </span>
                <div className="mt-3 space-y-2">
                    <div className="h-3.5 w-full rounded bg-[#1A1A1A]" />
                    <div className="h-3.5 w-3/4 rounded bg-[#1A1A1A]" />
                </div>
                <div className="mt-4 space-y-1.5">
                    <div className="h-2 w-full rounded-full" style={{ background: '#E8E7E2' }} />
                    <div className="h-2 w-5/6 rounded-full" style={{ background: '#E8E7E2' }} />
                    <div className="h-2 w-2/3 rounded-full" style={{ background: '#E8E7E2' }} />
                </div>
                <div className="mt-5 flex gap-1.5">
                    <span className="h-1.5 w-5 rounded-full" style={{ background: FLAME }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]/20" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]/20" />
                </div>
            </motion.div>
        </div>
    );
}

function ScriptGraphic({ still }: { still: boolean }) {
    const widths = ['92%', '78%', '85%', '60%'];
    return (
        <div
            className="mb-5 rounded-xl p-4"
            style={{ background: '#FAFAF7', border: '1px solid #E8E7E2' }}
        >
            <div className="mb-3 flex items-center gap-2">
                <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                    style={{ background: FLAME }}
                >
                    <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
                <div className="h-2 w-16 rounded-full bg-[#1A1A1A]/15" />
            </div>
            <div className="space-y-2.5">
                {widths.map((w, i) => (
                    <motion.div
                        key={i}
                        className="h-2.5 origin-left rounded-full"
                        style={{ background: i === 0 ? '#1A1A1A' : '#E8E7E2', width: w }}
                        animate={still ? undefined : { scaleX: [0, 1] }}
                        transition={
                            still
                                ? undefined
                                : loop({ duration: 1.4, delay: i * 0.25, repeatDelay: 0.6 })
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function EditorGraphic({ still }: { still: boolean }) {
    const swatches = [FLAME, '#1A1A1A', '#2563EB', '#16A34A', '#EAB308'];
    return (
        <div className="mb-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                {swatches.map((c, i) => (
                    <span
                        key={c}
                        className="h-7 w-7 rounded-full"
                        style={{
                            background: c,
                            boxShadow: i === 0 ? `0 0 0 2px #fff, 0 0 0 4px ${FLAME}` : 'none',
                            border: '1px solid rgba(0,0,0,0.1)',
                        }}
                    />
                ))}
                <span
                    className="ml-auto flex h-7 w-9 items-center justify-center rounded-md text-sm font-extrabold"
                    style={{ border: `1px solid ${INK}` }}
                >
                    Aa
                </span>
            </div>
            <div className="relative h-2 rounded-full" style={{ background: '#E8E7E2' }}>
                <motion.span
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white"
                    style={{ border: `2px solid ${INK}` }}
                    animate={still ? { left: '60%' } : { left: ['8%', '72%'] }}
                    transition={still ? undefined : loop({ duration: 2.4 })}
                />
            </div>
        </div>
    );
}

function ExportGraphic({ still }: { still: boolean }) {
    return (
        <div className="mb-5">
            <div
                className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl"
                style={{
                    border: `1px solid ${INK}`,
                    background:
                        'linear-gradient(135deg, #FFD93D33, #FF6B6B33, #E8440A33)',
                }}
            >
                <span
                    className="rounded-md px-2 py-0.5 text-xs font-extrabold text-white"
                    style={{ background: INK }}
                >
                    1080 × 1080
                </span>
                <span
                    className="absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                    style={{ background: FLAME }}
                >
                    PNG
                </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <Download className="h-4 w-4" style={{ color: FLAME }} />
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#E8E7E2' }}>
                    <motion.span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: FLAME }}
                        animate={still ? { width: '100%' } : { width: ['0%', '100%'] }}
                        transition={still ? undefined : loop({ duration: 2, repeatType: 'loop', repeatDelay: 0.4 })}
                    />
                </div>
            </div>
        </div>
    );
}

function MinutesGraphic({ still }: { still: boolean }) {
    return (
        <div className="mb-5 flex items-center gap-4">
            <div
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full"
                style={{ border: `2px solid ${INK}` }}
            >
                <Clock className="h-7 w-7" style={{ color: INK }} />
            </div>
            <div>
                <div className="font-[Bebas_Neue] text-5xl leading-none tracking-normal text-[#1A1A1A]">
                    &lt; 60s
                </div>
                <motion.span
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: '#FAFAF7', border: '1px solid #E8E7E2' }}
                    animate={still ? undefined : { opacity: [0.6, 1] }}
                    transition={still ? undefined : loop({ duration: 1.1 })}
                >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: FLAME }} />
                    +12 today
                </motion.span>
            </div>
        </div>
    );
}

function CommunityGraphic({ still }: { still: boolean }) {
    const people = [
        { i: 'MD', bg: '#1A1A1A' },
        { i: 'RS', bg: FLAME },
        { i: 'JM', bg: '#2563EB' },
        { i: 'LP', bg: '#16A34A' },
        { i: 'BF', bg: '#7C3AED' },
    ];
    return (
        <div className="mb-5 flex items-center">
            <div className="flex">
                {people.map((p, idx) => (
                    <motion.span
                        key={p.i}
                        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xs font-extrabold text-white first:ml-0"
                        style={{ background: p.bg, border: '2px solid #fff', zIndex: people.length - idx }}
                        animate={still ? undefined : { y: [0, idx % 2 === 0 ? -5 : 5, 0] }}
                        transition={still ? undefined : loop({ duration: 2.6, delay: idx * 0.2, repeatType: 'loop' })}
                    >
                        {p.i}
                    </motion.span>
                ))}
            </div>
            <span
                className="ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: INK }}
            >
                <Users className="h-3.5 w-3.5" /> +2.4k
            </span>
        </div>
    );
}

// ── Bento ────────────────────────────────────────────────────────────────────

export default function FeatureBento() {
    const reduce = useReducedMotion() ?? false;

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[minmax(248px,auto)]"
        >
            <Cell className="md:col-span-2 md:row-span-2">
                <span
                    className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: FLAME }}
                >
                    <Check className="h-4 w-4" />
                </span>
                <CarouselsGraphic still={reduce} />
                <Copy
                    title="AI-Generated Carousels"
                    body="You provide the theme and tone; AI assembles the slides with a coherent layout, ready to publish. No starting from scratch in Canva."
                />
            </Cell>

            <Cell>
                <ScriptGraphic still={reduce} />
                <Copy
                    title="Ready-Made Text & Script"
                    body="Titles, hooks, and slide text suggested by AI, no jumping to ChatGPT in another tab."
                />
            </Cell>

            <Cell>
                <EditorGraphic still={reduce} />
                <Copy
                    title="Simple Visual Editor"
                    body="Adjust colors, fonts, and images with drag and drop. No steep learning curve."
                />
            </Cell>

            <Cell>
                <ExportGraphic still={reduce} />
                <Copy
                    title="Full HD Export"
                    body="Download in PNG at 1080px, the right size for Instagram. No quality loss."
                />
            </Cell>

            <Cell>
                <MinutesGraphic still={reduce} />
                <Copy
                    title="Content in Minutes"
                    body="Produce multiple carousels in one session. Less time on design, more time selling."
                />
            </Cell>

            <Cell>
                <CommunityGraphic still={reduce} />
                <Copy
                    title="Community for Creators"
                    body="Trade references and posting rhythm with creators who want consistency, not posting blindly."
                />
            </Cell>
        </motion.div>
    );
}
