import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, Layers, Zap, Settings, MessageCircle } from 'lucide-react';
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
                        {/* Credits button */}
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setCreditsOpen(true)}
                                tooltip={{ children: `${auth.credits} créditos` }}
                                className="text-[#E8440A] bg-orange-50 hover:bg-orange-100 font-semibold rounded-full"
                            >
                                <Zap className="w-4 h-4 fill-[#E8440A] text-[#E8440A]" />
                                <span>{auth.credits} créditos</span>
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
