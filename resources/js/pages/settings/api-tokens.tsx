import { Form, Head } from '@inertiajs/react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ApiTokensController from '@/actions/App/Http/Controllers/Settings/ApiTokensController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/api-tokens';

interface TokenRow {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
                navigator.clipboard.writeText(value).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                });
            }}
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {label}
        </Button>
    );
}

export default function ApiTokens({
    tokens,
    newToken,
    mcpUrl,
}: {
    tokens: TokenRow[];
    newToken: string | null;
    mcpUrl: string;
}) {
    const { t } = useTranslation();

    const connectCommand = `claude mcp add --transport http slidezz ${mcpUrl} \\\n  --header "Authorization: Bearer ${newToken ?? '<seu-token>'}"`;

    return (
        <>
            <Head title={t('settings.apiTokens.title')} />

            <h1 className="sr-only">{t('settings.apiTokens.title')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.apiTokens.title')}
                    description={t('settings.apiTokens.description')}
                />

                {/* One-time reveal of a freshly created token */}
                {newToken && (
                    <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                            <Check className="h-4 w-4" />
                            {t('settings.apiTokens.createdTitle')}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('settings.apiTokens.createdHint')}</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
                                {newToken}
                            </code>
                            <CopyButton value={newToken} label={t('settings.apiTokens.copy')} />
                        </div>
                    </div>
                )}

                {/* Create a new token */}
                <Form
                    {...ApiTokensController.store.form()}
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('settings.apiTokens.nameLabel')}</Label>
                                <div className="relative">
                                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        autoComplete="off"
                                        className="pl-9"
                                        placeholder={t('settings.apiTokens.namePlaceholder')}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">{t('settings.apiTokens.nameHint')}</p>
                                <InputError className="mt-1" message={errors.name} />
                            </div>
                            <Button disabled={processing}>
                                <Plus className="h-4 w-4" />
                                {t('settings.apiTokens.create')}
                            </Button>
                        </div>
                    )}
                </Form>

                {/* Existing tokens */}
                <div className="space-y-3">
                    <p className="text-sm font-medium">{t('settings.apiTokens.listTitle')}</p>
                    {tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('settings.apiTokens.empty')}</p>
                    ) : (
                        <ul className="divide-y divide-border rounded-xl border border-border">
                            {tokens.map((token) => (
                                <li key={token.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{token.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('settings.apiTokens.createdAt', { when: token.created_at })}
                                            {token.last_used_at
                                                ? ` · ${t('settings.apiTokens.lastUsed', { when: token.last_used_at })}`
                                                : ` · ${t('settings.apiTokens.neverUsed')}`}
                                        </p>
                                    </div>
                                    <Form {...ApiTokensController.destroy.form({ token: token.id })} options={{ preserveScroll: true }}>
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="ghost"
                                                disabled={processing}
                                                className="text-muted-foreground hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {t('settings.apiTokens.revoke')}
                                            </Button>
                                        )}
                                    </Form>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* How to connect */}
                <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">{t('settings.apiTokens.connectTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.apiTokens.connectHint')}</p>
                    <div className="flex items-start gap-2">
                        <pre className="flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
{connectCommand}
                        </pre>
                        <CopyButton value={connectCommand} label={t('settings.apiTokens.copy')} />
                    </div>
                </div>
            </div>
        </>
    );
}

ApiTokens.layout = {
    breadcrumbs: [
        {
            title: 'API & MCP',
            href: edit(),
        },
    ],
};
