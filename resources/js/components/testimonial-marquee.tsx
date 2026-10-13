export type Testimonial = {
    name: string;
    role: string;
    quote: string;
    initials: string;
};

type TestimonialMarqueeProps = {
    items: Testimonial[];
    /** Seconds for one full loop. Lower = faster. */
    speedSeconds?: number;
};

/**
 * Edge-to-edge, continuously auto-scrolling row of testimonial cards.
 * Pauses on hover and falls back to a manual horizontal scroll when the
 * user prefers reduced motion. Cards use uniform right margin (not flex
 * `gap`) so the duplicated track loops seamlessly at exactly -50%.
 */
export default function TestimonialMarquee({
    items,
    speedSeconds = 60,
}: TestimonialMarqueeProps) {
    const loop = [...items, ...items];

    return (
        <div
            className="slidezz-marquee group relative overflow-hidden"
            style={{
                WebkitMaskImage:
                    'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
                maskImage:
                    'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
            }}
        >
            <style>{`
                @keyframes slidezz-marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .slidezz-marquee-track { animation: slidezz-marquee var(--marquee-duration, 60s) linear infinite; }
                .slidezz-marquee:hover .slidezz-marquee-track { animation-play-state: paused; }
                @media (prefers-reduced-motion: reduce) {
                    .slidezz-marquee { overflow-x: auto; }
                    .slidezz-marquee-track { animation: none; }
                }
            `}</style>

            <div
                className="slidezz-marquee-track flex w-max"
                style={{ ['--marquee-duration' as string]: `${speedSeconds}s` }}
            >
                {loop.map((t, i) => (
                    <figure
                        key={i}
                        aria-hidden={i >= items.length || undefined}
                        className="mr-5 flex w-[320px] flex-shrink-0 flex-col rounded-2xl bg-white p-7 sm:w-[360px]"
                        style={{ border: '1px solid #E8E7E2' }}
                    >
                        <blockquote className="flex-1 text-lg leading-relaxed font-medium text-[#333330]">
                            “{t.quote}”
                        </blockquote>
                        <figcaption className="mt-6 flex items-center gap-3">
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                                style={{ background: '#1A1A1A' }}
                            >
                                {t.initials}
                            </div>
                            <div>
                                <div className="font-extrabold text-[#1A1A1A]">
                                    {t.name}
                                </div>
                                <div className="text-sm font-semibold text-[#888880]">
                                    {t.role}
                                </div>
                            </div>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}
