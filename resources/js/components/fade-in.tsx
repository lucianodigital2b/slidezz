import { motion, useReducedMotion } from 'motion/react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type FadeInProps = {
    children: ReactNode;
    /** Delay before the fade starts, in seconds. Useful for staggering siblings. */
    delay?: number;
    /** Vertical travel distance in px while fading in. */
    y?: number;
    className?: string;
} & Omit<ComponentPropsWithoutRef<typeof motion.div>, 'children'>;

/**
 * Fades and lifts its children into view the first time they scroll near the
 * viewport. Honors `prefers-reduced-motion` by rendering statically.
 */
export default function FadeIn({ children, delay = 0, y = 24, className, ...props }: FadeInProps) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -12% 0px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
