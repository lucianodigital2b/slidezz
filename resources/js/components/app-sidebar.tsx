import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, Layers, Sparkles, Zap, Settings, MessageCircle, Rocket } from 'lucide-react';
import { edit as billingEdit } from '@/routes/billing';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLogo from '@/components/app-logo';
import { CreditsModal } from '@/components/CreditsModal';
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
    const { auth } = usePage().props;
    const [creditsOpen, setCreditsOpen] = useState(false);

    const navItems = [
        { title: t('sidebar.generate'), href: '/generate', icon: Sparkles },
        // { title: t('sidebar.schedule'), href: '/schedule', icon: CalendarDays },
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
                                    className="group !text-white bg-gradient-to-r from-[#E8440A] to-[#F97316] hover:from-[#D13D09] hover:to-[#EA6A0C] font-bold rounded-full shadow-lg shadow-[#E8440A]/30 ring-1 ring-white/20 hover:shadow-xl hover:shadow-[#E8440A]/40 transition-all justify-center"
                                >
                                    <Link href={billingEdit.url()} prefetch>
                                        <Rocket className="w-4 h-4 fill-white/20 text-white transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
                                        <span>{t('sidebar.upgrade')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {/* Credits button */}
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setCreditsOpen(true)}
                                tooltip={{ children: `${auth.credits} credits` }}
                                className="text-[#E8440A] bg-orange-50 hover:bg-orange-100 font-semibold rounded-full"
                            >
                                <Zap className="w-4 h-4 fill-[#E8440A] text-[#E8440A]" />
                                <span>{auth.credits} {t('sidebar.credits')}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

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

            <CreditsModal open={creditsOpen} onOpenChange={setCreditsOpen} />
        </Sidebar>
    );
}
