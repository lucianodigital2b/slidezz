import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, CreditCard, Download, ExternalLink, Zap } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cancel, edit, portal, resume, subscribe } from '@/routes/billing';

interface Plan {
    name: string;
    description: string;
    price_label: string;
    price_id: string | null;
    features: string[];
}

interface Subscription {
    name: string;
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
    plans: Record<string, Plan>;
    subscription: Subscription | null;
    on_trial: boolean;
    invoices: Invoice[];
}

function statusBadge(subscription: Subscription) {
    if (subscription.on_grace_period) {
        return <Badge variant="outline" className="border-yellow-400 text-yellow-600">Cancelado — acesso até {subscription.ends_at}</Badge>;
    }
    if (subscription.active) {
        return <Badge className="bg-green-500 hover:bg-green-500">Ativo</Badge>;
    }
    return <Badge variant="destructive">Inativo</Badge>;
}

export default function Billing({ plans, subscription, on_trial, invoices }: Props) {
    const { auth } = usePage().props as any;

    const subscribeToPlan = (planKey: string) => {
        router.post(subscribe.url(), { plan: planKey });
    };

    const cancelSubscription = () => {
        if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você manterá acesso até o fim do período pago.')) return;
        router.post(cancel.url());
    };

    const resumeSubscription = () => {
        router.post(resume.url());
    };

    const currentPlanKey = subscription?.name ?? null;

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
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE156]/10">
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
                ) : (
                    <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                        Você ainda não possui uma assinatura ativa. Escolha um plano abaixo para começar.
                    </div>
                )}

                {/* Plan cards */}
                <div className="space-y-4">
                    <Heading
                        variant="small"
                        title="Planos disponíveis"
                        description="Escolha o plano ideal para o seu negócio"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        {Object.entries(plans).map(([key, plan]) => {
                            const isCurrent = currentPlanKey === key && subscription?.active;

                            return (
                                <div
                                    key={key}
                                    className={`rounded-xl border bg-card p-5 space-y-4 flex flex-col ${isCurrent ? 'border-[#FFE156] ring-1 ring-[#FFE156]/30' : 'border-border'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-base">{plan.name}</p>
                                            {isCurrent && (
                                                <Badge className="bg-[#FFE156] hover:bg-[#FFE156] text-xs">Plano atual</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                                        <p className="mt-2 text-2xl font-bold tracking-tight">{plan.price_label}</p>
                                    </div>

                                    <ul className="space-y-1.5 flex-1">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        className={`w-full mt-2 ${isCurrent ? 'bg-muted text-muted-foreground hover:bg-muted cursor-default' : 'bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A]'}`}
                                        disabled={isCurrent || !plan.price_id}
                                        onClick={() => !isCurrent && subscribeToPlan(key)}
                                    >
                                        {isCurrent ? 'Plano ativo' : `Assinar ${plan.name}`}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
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
