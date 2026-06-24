import { Form, Head, Link } from '@inertiajs/react';
import { Check, KeyRound, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import IntegrationsController from '@/actions/App/Http/Controllers/Settings/IntegrationsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit as editBilling } from '@/routes/billing';
import { edit } from '@/routes/integrations';

export default function Integrations({
    byokEnabled,
    hasGeminiKey,
}: {
    byokEnabled: boolean;
    hasGeminiKey: boolean;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('settings.integrations.title')} />

            <h1 className="sr-only">{t('settings.integrations.title')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.integrations.geminiTitle')}
                    description={t('settings.integrations.geminiDescription')}
                />

                {!byokEnabled ? (
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">{t('settings.integrations.lockedTitle')}</p>
                                <p className="text-sm text-muted-foreground">{t('settings.integrations.lockedDescription')}</p>
                                <Button asChild size="sm" className="mt-1">
                                    <Link href={editBilling()}>{t('settings.integrations.upgradeCta')}</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Form
                        {...IntegrationsController.update.form()}
                        options={{ preserveScroll: true }}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                {hasGeminiKey && (
                                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                                        <Check className="h-4 w-4" />
                                        {t('settings.integrations.keyConnected')}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="gemini_api_key">{t('settings.integrations.keyLabel')}</Label>
                                    <div className="relative">
                                        <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="gemini_api_key"
                                            name="gemini_api_key"
                                            type="password"
                                            autoComplete="off"
                                            className="pl-9"
                                            placeholder={hasGeminiKey ? '••••••••••••••••' : 'AIza...'}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t('settings.integrations.keyHint')}</p>
                                    <InputError className="mt-1" message={errors.gemini_api_key} />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button disabled={processing}>{t('settings.integrations.save')}</Button>
                                </div>
                            </>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}

Integrations.layout = {
    breadcrumbs: [
        {
            title: 'Integrações',
            href: edit(),
        },
    ],
};
