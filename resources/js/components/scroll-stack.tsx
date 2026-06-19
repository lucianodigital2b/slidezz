import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { type ReactNode, useRef } from 'react';

type ScrollStackProps = {
    /** One card per item. Cards pin and stack on top of each other as the user scrolls. */
    items: ReactNode[];
};

/**
 * Scroll-driven stacking cards. Each card is pinned to the viewport for one
 * screen of scroll; the next card scrolls up from below and stacks on top,
 * while the cards beneath recede slightly (scale down). Falls back to a plain
 * vertical list when the user prefers reduced motion.
 */
export default function ScrollStack({ items }: ScrollStackProps) {
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    if (reduceMotion) {
        return (
            <div className="flex flex-col items-center gap-6">
                {items.map((item, i) => (
                    <div key={i} className="w-full max-w-2xl">
                        {item}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div ref={ref}>
            {items.map((item, i) => (
                <StackCard key={i} index={i} total={items.length} progress={scrollYProgress}>
                    {item}
                </StackCard>
            ))}
        </div>
    );
}

function StackCard({
    index,
    total,
    progress,
    children,
}: {
    index: number;
    total: number;
    progress: MotionValue<number>;
    children: ReactNode;
}) {
    // Cards lower in the stack (smaller index) recede further as later cards arrive.
    const targetScale = 1 - (total - 1 - index) * 0.05;
    const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

    return (
        <div className="sticky top-0 flex h-screen items-center justify-center">
            <motion.div
                style={{ scale, top: `calc(-6vh + ${index * 26}px)` }}
                className="relative w-full max-w-2xl origin-top"
            >
                {children}
            </motion.div>
        </div>
    );
}
