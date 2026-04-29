import { Link } from '@inertiajs/react';
import {
    Home, Play, Activity, CalendarDays,
    Zap, Layers, Images, Database, Plus,
} from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';

const mainNavItems = [
    { title: 'Início', href: '/dashboard', icon: Home },
    { title: 'Biblioteca', href: '/library', icon: Play },
    { title: 'Analytics', href: '/analytics', icon: Activity },
    { title: 'Agenda', href: '/schedule', icon: CalendarDays },
];

const slideshowItems = [
    { title: 'Automações', href: '/automations', icon: Zap },
    { title: 'Editor de Slideshow', href: '/slideshow-editor', icon: Layers },
    { title: 'Coleções de Imagens', href: '/image-collections', icon: Images },
    { title: 'Banco de Dados', href: '/database', icon: Database },
];

export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="bg-[#E8440A] hover:bg-[#D13D09] text-white hover:text-white data-[active=true]:bg-[#D13D09] data-[active=true]:text-white"
                        >
                            <Link href="/automations">
                                <Plus className="h-4 w-4 flex-shrink-0" />
                                <span>Nova Automação</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        {mainNavItems.map((item) => (
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

                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Slideshows</SidebarGroupLabel>
                    <SidebarMenu>
                        {slideshowItems.map((item) => (
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
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
