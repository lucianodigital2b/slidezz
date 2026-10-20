import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

// Pages that need the full width start with the main sidebar collapsed.
const COLLAPSED_PATHS = ['/agent'];

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const page = usePage();
    const [open, setOpen] = useState<boolean>(page.props.sidebarOpen);
    const [wideOpen, setWideOpen] = useState(false);

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    const path = page.url.split('?')[0];
    const startsCollapsed = COLLAPSED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

    return (
        <SidebarProvider
            open={startsCollapsed ? wideOpen : open}
            onOpenChange={startsCollapsed ? setWideOpen : setOpen}
        >
            {children}
        </SidebarProvider>
    );
}
