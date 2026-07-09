import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, Layers, LineChart, Sparkles, Zap, Settings, MessageCircle, Rocket } from 'lucide-react';
import { edit as billingEdit } from '@/routes/billing';
import { useTranslation } from 'react-i18next';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';


export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    const { t } = useTranslation();
    const { auth, igEnabled } = usePage().props;

    const navItems = [
        { title: t('sidebar.generate'), href: '/generate', icon: Sparkles },
        // Calendar/schedule + analytics are gated to Instagram-enabled users
        // (canUseInstagram allowlist) — both depend on published social posts.
        ...(igEnabled
            ? [
                  { title: t('sidebar.schedule'), href: '/schedule', icon: CalendarDays },
                  { title: t('sidebar.analytics'), href: '/analytics', icon: LineChart },
              ]
            : []),
        // { title: t('sidebar.automations'), href: '/automations', icon: Zap },
        { title: t('sidebar.slideshowEditor'), href: '/slideshow-editor', icon: Layers },
        { title: t('sidebar.settings'), href: '/settings/profile', icon: Settings },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-4 flex flex-col justify-between">
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="px-2 mt-auto">
                    <SidebarMenu>
                        {/* Upgrade button — chamativo, acima dos créditos */}
                        {auth.user && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={{ children: t('sidebar.upgrade') }}
                                    className="group !text-[#1A1A1A] bg-gradient-to-r from-[#FFE156] to-[#E6CB4D] hover:from-[#E6CB4D] hover:to-[#D4B93A] font-bold rounded-full shadow-lg shadow-[#FFE156]/30 ring-1 ring-black/10 hover:shadow-xl hover:shadow-[#FFE156]/40 transition-all justify-center"
                                >
                                    <Link href={billingEdit.url()} prefetch>
                                        <Rocket className="w-4 h-4 fill-black/10 text-[#1A1A1A] transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
                                        <span>{t('sidebar.upgrade')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {/* Credits button hidden during the BYOK launch offer —
                            balances keep accruing server-side; re-add this item
                            (and the CreditsModal below) to bring credits back. */}

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                tooltip={{ children: 'Support' }}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                                <a href="https://wa.me/5527997798070" target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Support</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
