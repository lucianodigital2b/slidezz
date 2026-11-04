import { Head, router } from '@inertiajs/react';
import { CreditCard, Crown, Download, ExternalLink, Zap } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import PricingCards from '@/components/pricing/PricingCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cancel, edit, portal, resume, subscribe } from '@/routes/billing';

interface PricingPlan {
    key: 'weekly' | 'monthly' | 'annual';
    name: string;
    billing_note: string | null;
    per_day: string | null;
    credits_note: string | null;
    features: string[];
    price_label: string | null;
    price_id: string | null;
    compare_at: string | null;
    save: string | null;
    highlighted: boolean;
}

interface Subscription {
    name: string;
    type?: string;
    stripe_status: string;
    ends_at: string | null;
    on_grace_period: boolean;
    cancelled: boolean;
    active: boolean;
}

interface Invoice {
    id: string;
    date: string;
    total: string;
    status: string;
    download_url: string;
}

interface Props {
    plans: Record<string, PricingPlan>;
    subscription: Subscription | null;
    on_trial: boolean;
    invoices: Invoice[];
    pass_expires_at: string | null;
    lifetime_access: boolean;
}

const SUFFIX: Record<string, string> = { weekly: '/7 dias', monthly: '/mês', annual: '/ano' };
const CTA: Record<string, string> = { weekly: 'Quero o Semanal', monthly: 'Assinar Mensal', annual: 'Assinar Anual' };

function statusBadge(subscription: Subscription) {
    if (subscription.on_grace_period) {
        return <Badge variant="outline" className="border-[#1A2023] text-[#5B6870]">Cancelado — acesso até {subscription.ends_at}</Badge>;
    }
    if (subscription.active) {
        return <Badge className="bg-green-500 hover:bg-green-500">Ativo</Badge>;
    }
    return <Badge variant="destructive">Inativo</Badge>;
}

export default function Billing({ plans, subscription, invoices, pass_expires_at, lifetime_access }: Props) {
    const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

    const subscribeToPlan = (planKey: string) => {
        setSubscribingTo(planKey);
        router.post(subscribe.url(), { plan: planKey }, { onError: () => setSubscribingTo(null) });
    };

    const cancelSubscription = () => {
        if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você manterá acesso até o fim do período pago.')) return;
        router.post(cancel.url());
    };

    const resumeSubscription = () => {
        router.post(resume.url());
    };

    const currentPlanKey = subscription?.type ?? subscription?.name ?? null;
    const passUntil = pass_expires_at && new Date(pass_expires_at) > new Date()
        ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(pass_expires_at))
        : null;
    const planCards = Object.values(plans).map((plan) => ({ ...plan, suffix: SUFFIX[plan.key], cta: CTA[plan.key] }));

    return (
        <>
            <Head title="Assinatura" />

            <h1 className="sr-only">Assinatura</h1>

            <div className="space-y-8">
                {/* Current status */}
                {subscription ? (
                    <div className="space-y-4">
                        <Heading
                            variant="small"
                            title="Plano atual"
                            description="Detalhes da sua assinatura ativa"
                        />

                        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A2023]/5">
                                        <Zap className="h-4 w-4 text-[#1A1A1A]" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{plans[currentPlanKey!]?.name ?? currentPlanKey}</p>
                                        <p className="text-sm text-muted-foreground">{plans[currentPlanKey!]?.price_label}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {statusBadge(subscription)}
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => { window.location.href = portal.url(); }}
                                >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Gerenciar pagamento
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </Button>

                                {subscription.on_grace_period ? (
                                    <Button
                                        size="sm"
                                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                                        onClick={resumeSubscription}
                                    >
                                        Reativar assinatura
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                                        onClick={cancelSubscription}
                                    >
                                        Cancelar assinatura
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : lifetime_access ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#1A2023] bg-[#1A2023]/5 p-5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A2023]">
                            <Crown className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold">Acesso vitalício ativo</p>
                            <p className="text-sm text-muted-foreground">Você garantiu a oferta de lançamento. Seu acesso continua pra sempre.</p>
                        </div>
                    </div>
                ) : passUntil ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A2023]/5">
                            <Zap className="h-4 w-4 text-[#1A1A1A]" />
                        </div>
                        <div>
                            <p className="font-semibold">Plano Semanal ativo</p>
                            <p className="text-sm text-muted-foreground">Seu acesso vai até {passUntil}. O Semanal não renova sozinho.</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                        Você ainda não tem um plano ativo. Escolha um plano abaixo para começar.
                    </div>
                )}

                {/* Plan cards */}
                <div className="space-y-4">
                    <Heading
                        variant="small"
                        title="Planos disponíveis"
                        description="Escolha o plano ideal para o seu negócio"
                    />

                    <PricingCards
                        plans={planCards}
                        featuresTitle="O que está incluso:"
                        highlightBadge="Mais escolhido"
                        saveLabel={(save) => `Poupe ${save}`}
                        onSelect={subscribeToPlan}
                        loadingKey={subscribingTo}
                        currentKey={subscription?.active ? currentPlanKey : null}
                    />
                </div>

                {/* Invoices */}
                {invoices.length > 0 && (
                    <div className="space-y-4">
                        <Heading
                            variant="small"
                            title="Histórico de faturas"
                            description="Baixe suas faturas anteriores"
                        />

                        <div className="rounded-xl border border-border bg-card divide-y divide-border">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-medium">{invoice.total}</p>
                                            <p className="text-xs text-muted-foreground">{invoice.date}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={invoice.download_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        PDF
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

Billing.layout = {
    breadcrumbs: [
        {
            title: 'Assinatura',
            href: edit(),
        },
    ],
};
