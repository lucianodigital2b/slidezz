import { ArrowRight } from 'lucide-react';
import type { ComponentProps, CSSProperties } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type CtaSubmitProps = ComponentProps<'button'> & {
    processing?: boolean;
};

/**
 * Full-width submit button matching the landing CTAs: orange pill with a white
 * arrow-circle on the right that grows leftward to fill the button on hover,
 * flipping the centered label to orange. Shows a spinner while processing.
 */
export default function CtaSubmit({
    children,
    processing,
    className,
    disabled,
    ...props
}: CtaSubmitProps) {
    return (
        <button
            type="submit"
            disabled={disabled ?? processing}
            style={{ '--cta': '#FFE156' } as CSSProperties}
            className={cn(
                'group relative flex h-12 w-full items-center justify-center rounded-full border border-[var(--cta)] bg-[var(--cta)] px-6 text-base font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-80',
                className,
            )}
            {...props}
        >
            {/* White circle that grows from the right to fill the pill on hover */}
            <span
                aria-hidden
                className="absolute top-1/2 right-1.5 h-9 w-9 -translate-y-1/2 rounded-full bg-white transition-all duration-300 ease-out group-hover:top-0 group-hover:right-0 group-hover:h-full group-hover:w-full group-hover:translate-y-0 motion-reduce:transition-none"
            />
            <span className="relative z-10 transition-colors duration-300 ease-out group-hover:text-[var(--cta)]">
                {children}
            </span>
            <span className="absolute top-1/2 right-1.5 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[var(--cta)]">
                {processing ? (
                    <Spinner />
                ) : (
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
                )}
            </span>
        </button>
    );
}
