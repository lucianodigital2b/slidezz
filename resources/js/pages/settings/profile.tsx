import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import { connect, destroy } from '@/routes/social-accounts';
import { LogOut, Plus } from 'lucide-react';

interface SocialAccount {
    id: number;
    provider: string;
    handle: string;
    avatar: string | null;
    expires_at: string | null;
}

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.72a8.19 8.19 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z" />
        </svg>
    );
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

const PLATFORM_CONFIG = {
    tiktok: {
        label: 'TikTok',
        icon: TikTokIcon,
        iconBg: 'bg-black',
        connectBg: 'bg-[#010101] hover:bg-[#1a1a1a]',
    },
    instagram: {
        label: 'Instagram',
        icon: InstagramIcon,
        iconBg: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
        connectBg: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90',
    },
} as const;

type Provider = keyof typeof PLATFORM_CONFIG;

function PlatformRow({ provider, accounts }: { provider: Provider; accounts: SocialAccount[] }) {
    const { t } = useTranslation();
    const config = PLATFORM_CONFIG[provider];
    const Icon = config.icon;
    const connected = accounts.filter((a) => a.provider === provider);

    const handleDisconnect = (account: SocialAccount) => {
        if (!confirm(t('settings.profile.connectedAccounts.confirmDisconnect', { handle: account.handle }))) return;
        router.delete(destroy.url(account.id), { preserveScroll: true });
    };

    if (connected.length > 0) {
        return (
            <>
                {connected.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${config.iconBg}`}>
                                <Icon className="h-4 w-4 text-white" />
                            </div>
                            {account.avatar ? (
                                <img
                                    src={account.avatar}
                                    alt={account.handle}
                                    className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold ring-2 ring-border">
                                    {account.handle.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="leading-tight">
                                <p className="text-sm font-medium">@{account.handle}</p>
                                <p className="text-xs text-muted-foreground">{config.label}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                            onClick={() => handleDisconnect(account)}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            {t('settings.profile.connectedAccounts.disconnect')}
                        </Button>
                    </div>
                ))}
            </>
        );
    }

    return (
        <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${config.iconBg}`}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
            </div>
            <Button
                size="sm"
                className={`gap-1.5 rounded-full text-white ${config.connectBg}`}
                onClick={() => { window.location.href = connect.url(provider); }}
            >
                <Plus className="h-3.5 w-3.5" />
                {t('settings.profile.connectedAccounts.connect', { platform: config.label })}
            </Button>
        </div>
    );
}

function ConnectedAccounts({ accounts }: { accounts: SocialAccount[] }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title={t('settings.profile.connectedAccounts.title')}
                description={t('settings.profile.connectedAccounts.description')}
            />

            <div className="rounded-xl border border-border bg-card divide-y divide-border">
                <PlatformRow provider="tiktok" accounts={accounts} />
                <PlatformRow provider="instagram" accounts={accounts} />
            </div>
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
    socialAccounts,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    socialAccounts: SocialAccount[];
}) {
    const { t } = useTranslation();
    const { auth } = usePage().props;

    return (
        <>
            <Head title={t('settings.profile.title')} />

            <h1 className="sr-only">{t('settings.profile.title')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.profile.infoTitle')}
                    description={t('settings.profile.infoDescription')}
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('settings.profile.name')}</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder={t('settings.profile.namePlaceholder')}
                                />

                                <InputError className="mt-2" message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('settings.profile.email')}</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder={t('settings.profile.emailPlaceholder')}
                                />

                                <InputError className="mt-2" message={errors.email} />
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="-mt-4 text-sm text-muted-foreground">
                                        {t('settings.profile.emailUnverified')}{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                        >
                                            {t('settings.profile.resendVerification')}
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                            {t('settings.profile.verificationSent')}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <Button disabled={processing} data-test="update-profile-button">
                                    {t('settings.profile.save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <Separator />

            <ConnectedAccounts accounts={socialAccounts} />

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Configurações de perfil',
            href: edit(),
        },
    ],
};
