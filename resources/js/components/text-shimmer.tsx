import { motion } from 'motion/react';
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type TextShimmerProps = {
    children: string;
    /** Element to render. Only `span`, `p` and `div` are supported. */
    as?: 'span' | 'p' | 'div';
    className?: string;
    duration?: number;
    spread?: number;
    /** Resting text color. */
    baseColor?: string;
    /** Color of the moving shimmer band. */
    gradientColor?: string;
};

/**
 * Animated shimmer text: a bright band sweeps across the word on a continuous
 * loop. Adapted from motion-primitives (motion-primitives.com/docs/text-shimmer)
 * with explicit brand color props instead of light/dark CSS variables.
 */
function TextShimmerComponent({
    children,
    as = 'p',
    className,
    duration = 2,
    spread = 2,
    baseColor = '#E8440A',
    gradientColor = '#FFD9A8',
}: TextShimmerProps) {
    const dynamicSpread = useMemo(
        () => children.length * spread,
        [children, spread],
    );

    const motionProps = {
        className: cn(
            'relative inline-block bg-[length:250%_100%,auto] bg-clip-text [background-repeat:no-repeat,padding-box] text-transparent',
            className,
        ),
        initial: { backgroundPosition: '100% center' },
        animate: { backgroundPosition: '0% center' },
        transition: { repeat: Infinity, duration, ease: 'linear' as const },
        style: {
            '--spread': `${dynamicSpread}px`,
            '--base-color': baseColor,
            '--base-gradient-color': gradientColor,
            backgroundImage:
                'linear-gradient(90deg,#0000 calc(50% - var(--spread)),var(--base-gradient-color),#0000 calc(50% + var(--spread))), linear-gradient(var(--base-color), var(--base-color))',
        } as React.CSSProperties,
    };

    if (as === 'span') {
        return <motion.span {...motionProps}>{children}</motion.span>;
    }

    if (as === 'div') {
        return <motion.div {...motionProps}>{children}</motion.div>;
    }

    return <motion.p {...motionProps}>{children}</motion.p>;
}

export const TextShimmer = React.memo(TextShimmerComponent);
