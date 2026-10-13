import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editApiTokens } from '@/routes/api-tokens';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editBrand } from '@/routes/brand';
import { edit as editBilling } from '@/routes/billing';
import { edit as editIntegrations } from '@/routes/integrations';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { mcpEnabled } = usePage<{ mcpEnabled?: boolean }>().props;

    const sidebarNavItems: NavItem[] = [
        { title: t('settings.nav.profile'), href: edit(), icon: null },
        { title: t('settings.nav.brand'), href: editBrand(), icon: null },
        { title: t('settings.nav.security'), href: editSecurity(), icon: null },
        { title: t('settings.nav.appearance'), href: editAppearance(), icon: null },
        { title: t('settings.nav.integrations'), href: editIntegrations(), icon: null },
        // Dev-only MCP token UI (see HandleInertiaRequests: mcpEnabled).
        ...(mcpEnabled ? [{ title: t('settings.nav.apiTokens'), href: editApiTokens(), icon: null }] : []),
        { title: t('settings.nav.billing'), href: editBilling(), icon: null },
    ];

    return (
        <div className="px-4 py-6">
            <Heading
                title={t('settings.title')}
                description={t('settings.description')}
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0" aria-label="Settings">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
