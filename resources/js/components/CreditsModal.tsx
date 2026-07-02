import { router, usePage } from '@inertiajs/react';
import { Check, Zap } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { purchase } from '@/actions/App/Http/Controllers/CreditController';
import { subscribe as billingSubscribe } from '@/routes/billing';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type BillingCycle = 'monthly' | 'annual';

// Which plans to feature in the modal and their visual emphasis. Prices, names
// and credit counts come from the localized `pricing` shared prop (BRL/USD).
const FEATURED_PLANS = [
    { key: 'starter', highlighted: false },
    { key: 'pro', highlighted: true },
] as const;

// Map the config-level badge back to a translatable label.
const PACK_BADGE_KEY: Record<string, 'badgeMostPopular' | 'badgeBestValue'> = {
    pack_30: 'badgeMostPopular',
    pack_70: 'badgeBestValue',
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditsModal({ open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const { pricing } = usePage().props;
    const [cycle, setCycle] = useState<BillingCycle>('monthly');
    const [busy, setBusy] = useState<string | null>(null);

    const handleSubscribe = (planKey: string) => {
        setBusy(`sub_${planKey}`);
        router.post(
            billingSubscribe().url,
            { plan: planKey, cycle },
            { onFinish: () => setBusy(null) },
        );
    };

    const handlePack = (packKey: string) => {
        setBusy(packKey);
        router.post(
            purchase().url,
            { pack: packKey },
            { onFinish: () => setBusy(null) },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!bg-white !text-gray-900 max-w-lg w-full p-0 overflow-hidden gap-0"
                style={{ colorScheme: 'light' }}
            >
                <div className="px-6 pt-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">
                            {t('creditsModal.title')}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('creditsModal.subtitle')}
                        </p>
                    </DialogHeader>

                    {/* Monthly / Annual toggle */}
                    <div className="flex items-center gap-1 mt-5 bg-gray-100 rounded-full p-1 w-fit">
                        {(['monthly', 'annual'] as const).map((c) => (
                            <button
                                key={c}
                                onClick={() => setCycle(c)}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    cycle === c
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {c === 'monthly' ? t('creditsModal.monthly') : t('creditsModal.annual')}
                                {c === 'annual' && (
                                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                        -40%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subscription plans */}
                <div className="px-6 grid grid-cols-2 gap-3">
                    {FEATURED_PLANS.map(({ key, highlighted }) => {
                        const plan = pricing?.plans[key];
                        if (!plan) {
                            return null;
                        }
                        const label = cycle === 'monthly' ? plan.monthly?.price_label : plan.annual?.price_label;
                        const sub = cycle === 'annual' ? t(`creditsModal.plans.${key}.annualSub`) : null;
                        const features = t(`creditsModal.plans.${key}.features`, { returnObjects: true }) as string[];
                        const isBusy = busy === `sub_${key}`;
                        return (
                            <div
                                key={key}
                                className={`rounded-xl border p-4 flex flex-col gap-3 ${
                                    highlighted
                                        ? 'border-[#E8440A] bg-orange-50/40'
                                        : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-900 text-sm">{plan.name}</span>
                                        {highlighted && (
                                            <span className="text-[10px] font-bold text-[#E8440A] bg-orange-100 px-1.5 py-0.5 rounded-full">
                                                POPULAR
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-2xl font-bold text-gray-900">{label}</span>
                                    </div>
                                    {sub && <span className="text-xs text-gray-400">{sub}</span>}
                                    <p className="text-xs text-gray-400 mt-0.5">{t('creditsModal.imagesPerMonth', { count: plan.credits_per_cycle })}</p>
                                </div>

                                <ul className="space-y-1.5 flex-1">
                                    {features.map((f) => (
                                        <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                                            <Check className="w-3 h-3 text-[#E8440A] mt-0.5 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    disabled={isBusy}
                                    onClick={() => handleSubscribe(key)}
                                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                        highlighted
                                            ? 'bg-[#E8440A] text-white hover:bg-[#D13D09]'
                                            : 'bg-gray-900 text-white hover:bg-gray-700'
                                    }`}
                                >
                                    {isBusy ? t('creditsModal.redirecting') : t('creditsModal.subscribeTo', { plan: plan.name })}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <p className="px-6 mt-5 text-xs text-gray-400 text-center">
                    {t('creditsModal.noSubscription')}
                </p>

                {/* Credit packs */}
                <div className="px-6 pb-6 mt-3 grid grid-cols-2 gap-3">
                    {(pricing?.packs ?? []).map((pack) => {
                        const isBusy = busy === pack.key;
                        const badgeKey = PACK_BADGE_KEY[pack.key];
                        return (
                            <button
                                key={pack.key}
                                disabled={isBusy}
                                onClick={() => handlePack(pack.key)}
                                className="relative border border-gray-200 rounded-xl p-4 text-left hover:border-[#E8440A] hover:bg-orange-50/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {pack.badge && (
                                    <span className="absolute -top-2.5 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8440A] text-white">
                                        {badgeKey ? t(`creditsModal.${badgeKey}`) : pack.badge}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 mb-1">
                                    <Zap className="w-3.5 h-3.5 text-[#E8440A] fill-[#E8440A]" />
                                    <span className="font-semibold text-gray-900 text-sm">{t('creditsModal.credits', { count: pack.credits })}</span>
                                </div>
                                <p className="text-xs text-gray-400">{pack.label}</p>
                                <p className="text-base font-bold text-gray-900 mt-2">{pack.price}</p>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
