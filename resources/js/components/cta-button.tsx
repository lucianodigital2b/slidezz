import type { InertiaLinkProps } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const COLORS = {
    orange: '#FFE156',
    dark: '#1A1A1A',
} as const;

type CtaButtonProps = {
    href: NonNullable<InertiaLinkProps['href']>;
    children: ReactNode;
    /** Pill + fill color. Defaults to brand orange. */
    variant?: keyof typeof COLORS;
    /** Extra classes to tune sizing/spacing on the outer pill. */
    className?: string;
    /**
     * Optional click handler. Call `event.preventDefault()` inside to block the
     * navigation (e.g. to open a gating modal instead of following `href`).
     */
    onClick?: (event: MouseEvent<Element>) => void;
};

/**
 * Pill CTA with an expanding-fill hover effect:
 * resting = solid colored pill + white text + arrow inside a white circle on
 *           the right;
 * hover   = the white circle grows leftward until it fills the whole pill,
 *           sweeping over the text which flips to the pill color.
 */
export default function CtaButton({
    href,
    children,
    variant = 'orange',
    className,
    onClick,
}: CtaButtonProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            style={{ '--cta': COLORS[variant] } as CSSProperties}
            className={cn(
                'group relative inline-flex items-center gap-3 rounded-full border border-[var(--cta)] bg-[var(--cta)] py-1.5 pr-1.5 pl-6 text-lg font-bold text-[#1A1A1A]',
                className,
            )}
        >
            {/* White circle that grows from the right to fill the pill on hover */}
            <span
                aria-hidden
                className="absolute top-1/2 right-1.5 h-9 w-9 -translate-y-1/2 rounded-full bg-white transition-all duration-300 ease-out group-hover:top-0 group-hover:right-0 group-hover:h-full group-hover:w-full group-hover:translate-y-0 motion-reduce:transition-none"
            />
            <span className="relative z-10 text-[#1A1A1A]">
                {children}
            </span>
            <span className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center text-[#1A1A1A]">
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
