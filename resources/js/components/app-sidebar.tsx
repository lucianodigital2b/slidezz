import { Link, usePage } from '@inertiajs/react';
import { Bot, CalendarDays, Clapperboard, FileText, Images, Layers, LineChart, MessageCircle, Music2, Radar, Rocket, Settings, Smartphone, Sparkles, Zap } from 'lucide-react';
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
import { edit as billingEdit } from '@/routes/billing';


export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    const { t } = useTranslation();
    const { auth, igEnabled, canPost } = usePage().props;

    const navItems = [
        { title: t('sidebar.agent'), href: '/agent', icon: Bot },
        { title: t('sidebar.generate'), href: '/generate', icon: Sparkles },
        // Calendar/schedule + analytics are gated to Instagram-enabled users
        // (canUseInstagram allowlist, which also requires can_post) — both
        // depend on published social posts.
        ...(igEnabled && canPost
            ? [
                  { title: t('sidebar.schedule'), href: '/schedule', icon: CalendarDays },
                  { title: t('sidebar.analytics'), href: '/analytics', icon: LineChart },
                  { title: t('sidebar.reports'), href: '/reports', icon: FileText },
              ]
            : []),
        { title: t('sidebar.ugc'), href: '/ugc', icon: Radar },
        { title: t('sidebar.tiktok'), href: '/tiktok/create', icon: Music2 },
        ...(canPost ? [{ title: t('sidebar.automations'), href: '/automations', icon: Zap }] : []),
        { title: t('sidebar.mediaLibrary'), href: '/media-library', icon: Images },
        { title: t('sidebar.slideshowEditor'), href: '/slideshow-editor', icon: Layers },
        { title: t('sidebar.videos'), href: '/videos', icon: Clapperboard },
        { title: t('sidebar.appScreenshots'), href: '/app-screenshots/create', icon: Smartphone },
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
                    <SidebarMenu className="gap-1.5">
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                    className="h-10 gap-3 px-3 text-[14px]"
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
                                    className="group !text-white bg-[#1A2023] hover:!bg-[#2A3438] font-semibold rounded-full shadow-[0_8px_24px_-10px_rgba(26,32,35,0.6)] transition-all justify-center"
                                >
                                    <Link href={billingEdit.url()} prefetch>
                                        <Rocket className="w-4 h-4 text-white transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
                                        <span>{t('sidebar.upgrade')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        {/* Managed image credits (1 credit = 1 AI image). Buying more
                            happens on the billing page. */}
                        {auth.user && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={{ children: t('imageCredits.count', { count: auth.credits ?? 0 }) }}
                                    className="text-[#555550]"
                                >
                                    <Link href={billingEdit.url()} prefetch>
                                        <Images className="w-4 h-4" />
                                        <span>{t('imageCredits.count', { count: auth.credits ?? 0 })}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

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
