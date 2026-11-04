import { Link } from '@inertiajs/react';
import { BadgeCheck, ChevronRight, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pricing cards shared by the landing page, onboarding and billing settings.
 * Content structure from MyPostFlow (weekly / monthly / annual, billed amount
 * as the biggest price), layout from the Kaviyan Framer template (grey frame,
 * white top card with price + CTA, features on the grey below).
 */
export type PricingCardPlan = {
    key: string;
    name: string;
    billing_note: string | null;
    per_day: string | null;
    credits_note: string | null;
    features: string[];
    price_label: string | null;
    compare_at: string | null;
    save: string | null;
    highlighted: boolean;
    suffix: string;
    cta: string;
};

type Props = {
    plans: PricingCardPlan[];
    featuresTitle: string;
    highlightBadge: string;
    saveLabel?: (save: string) => string;
    /** Renders the CTA as a link (landing page). */
    href?: string;
    /** Renders the CTA as a button (onboarding, billing). */
    onSelect?: (key: string) => void;
    loadingKey?: string | null;
    currentKey?: string | null;
    note?: string;
};

function splitPrice(label: string) {
    const match = label.match(/^(\D+)(\d[\d.,]*?)([.,]\d{2})$/);

    return match ? { currency: match[1], integer: match[2], decimals: match[3] } : null;
}

export default function PricingCards({
    plans,
    featuresTitle,
    highlightBadge,
    saveLabel = (save) => save,
    href,
    onSelect,
    loadingKey = null,
    currentKey = null,
    note,
}: Props) {
    // Keep the price rows aligned: when any card shows a struck-through price,
    // the others reserve the same line.
    const anyCompare = plans.some((plan) => plan.compare_at);

    return (
        // Container query: three columns only when the cards get room for them
        // (landing, onboarding), stacked in the narrower settings panel.
        <div className="@container">
            {note && <p className="mb-4 text-center text-xs text-[#8A8A8A]">{note}</p>}

            <div className="grid gap-4 @3xl:grid-cols-3">
                {plans.map((plan) => {
                    const price = plan.price_label ? splitPrice(plan.price_label) : null;
                    const isCurrent = currentKey === plan.key;
                    const isLoading = loadingKey === plan.key;
                    const ctaClass = cn(
                        'mt-6 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed',
                        isCurrent
                            ? 'bg-[#E5E5E5] text-[#6B6B6B]'
                            : 'bg-[#111] text-white hover:bg-black/85 disabled:opacity-60',
                    );
                    const ctaContent = (
                        <>
                            {plan.cta}
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </>
                    );

                    return (
                        <div key={plan.key} className="flex flex-col rounded-[28px] bg-[#EEEEEE] p-2">
                            <div
                                className={cn(
                                    'rounded-[22px] p-6',
                                    plan.highlighted
                                        ? 'bg-[linear-gradient(150deg,#FFFFFF_40%,#DDF8CF_100%)]'
                                        : 'bg-white',
                                )}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-2xl font-medium tracking-tight text-[#111]">{plan.name}</h3>
                                    {plan.highlighted && (
                                        <span className="rounded-full bg-[#D4F27A] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#111] uppercase">
                                            {highlightBadge}
                                        </span>
                                    )}
                                </div>
                                {plan.billing_note && <p className="mt-1 text-sm text-[#6B6B6B]">{plan.billing_note}</p>}

                                {anyCompare && (
                                    <div
                                        className={cn('mt-4 flex h-5 items-center gap-2', !plan.compare_at && 'invisible')}
                                        aria-hidden={!plan.compare_at}
                                    >
                                        {plan.compare_at && (
                                            <s className="text-xs text-[#9A9A9A]">
                                                {plan.compare_at}
                                                {plan.suffix}
                                            </s>
                                        )}
                                        {plan.save && (
                                            <span className="rounded-full border border-[#D9D9D9] px-2 py-0.5 text-[10px] font-medium text-[#111]">
                                                {saveLabel(plan.save)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className={cn('flex items-baseline gap-1', anyCompare ? 'mt-2' : 'mt-6')}>
                                    {price ? (
                                        <>
                                            <span className="text-2xl font-light text-[#6B6B6B]">{price.currency}</span>
                                            <span className="font-[Urbanist,Inter,sans-serif] text-5xl font-medium tracking-tight text-[#111]">
                                                {price.integer}
                                            </span>
                                            <span className="text-sm text-[#6B6B6B]">
                                                {price.decimals}
                                                {plan.suffix}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="font-[Urbanist,Inter,sans-serif] text-5xl font-medium tracking-tight text-[#111]">
                                            {plan.price_label ?? '—'}
                                        </span>
                                    )}
                                </div>
                                {plan.per_day && <p className="mt-1 text-xs text-[#9A9A9A]">{plan.per_day}</p>}

                                {href ? (
                                    <Link href={href} className={ctaClass}>
                                        {ctaContent}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        className={ctaClass}
                                        disabled={loadingKey !== null || isCurrent}
                                        onClick={() => onSelect?.(plan.key)}
                                    >
                                        {ctaContent}
                                    </button>
                                )}
                            </div>

                            <div className="px-5 pt-5 pb-5">
                                {plan.credits_note && (
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#111]">
                                        <Zap className="h-4 w-4 flex-none" />
                                        {plan.credits_note}
                                    </div>
                                )}
                                <p className="mt-4 text-sm text-[#7A7A7A]">{featuresTitle}</p>
                                <ul className="mt-3 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm text-[#2A2A2A]">
                                            <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-[#111]" strokeWidth={1.75} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
