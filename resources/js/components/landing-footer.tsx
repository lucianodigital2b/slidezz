import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

const INK = '#1A1A1A';
const FLAME = '#FFE156';
const LINE = '#E8E7E2';

type FooterLink = { label: string; href: string };

type LandingFooterProps = {
    reachOutTitle: string;
    contact: { title: string; subtitle: string; href: string };
    columns: { title: string; links: FooterLink[] }[];
    socialLabel: string;
    rights: string;
    legal: FooterLink[];
};

// NOTE: social + legal hrefs are placeholders ("#") — swap in real handles / pages.
const SOCIALS: { label: string; icon: ReactNode; href: string }[] = [
    {
        label: 'X',
        href: '#',
        icon: (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
            >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
        ),
    },
    {
        label: 'Instagram',
        href: '#',
        icon: (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
            >
                <rect x="2" y="2" width="20" height="20" rx="5.5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle
                    cx="17.4"
                    cy="6.6"
                    r="1.1"
                    fill="currentColor"
                    stroke="none"
                />
            </svg>
        ),
    },
    {
        label: 'LinkedIn',
        href: '#',
        icon: (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
            >
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
        ),
    },
];

export default function LandingFooter({
    reachOutTitle,
    contact,
    columns,
    socialLabel,
    rights,
    legal,
}: LandingFooterProps) {
    return (
        <footer
            id="site-footer"
            className="relative scroll-mt-24 overflow-hidden"
            style={{ borderTop: `1px solid ${LINE}`, background: '#F9F6F4' }}
        >
            {/* Giant fading wordmark */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center overflow-hidden"
            >
                <span
                    className="font-display leading-[0.78] tracking-tight select-none"
                    style={{
                        fontSize: 'clamp(6rem, 23vw, 19rem)',
                        color: INK,
                        opacity: 0.06,
                        transform: 'translateY(16%)',
                        WebkitMaskImage:
                            'linear-gradient(to bottom, #000 32%, transparent 92%)',
                        maskImage:
                            'linear-gradient(to bottom, #000 32%, transparent 92%)',
                    }}
                >
                    Slidezz
                </span>
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-8">
                {/* Top row */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ background: INK }}
                        >
                            <AppLogoIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="mt-1 font-display text-2xl tracking-wide text-[#1A1A1A]">
                            Slidezz
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#1A1A1A]">
                            {socialLabel}
                        </span>
                        <div className="flex items-center gap-2">
                            {SOCIALS.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    aria-label={s.label}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                                    style={{ border: `1px solid ${LINE}` }}
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <hr className="my-10" style={{ borderColor: '#DDD7CC' }} />

                {/* Middle: reach out + columns */}
                <div className="grid gap-10 md:grid-cols-2">
                    <div>
                        <h3 className="mb-4 text-base font-extrabold text-[#1A1A1A]">
                            {reachOutTitle}
                        </h3>
                        <a
                            href={contact.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-sm items-center gap-3 rounded-2xl bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                            style={{ border: `1px solid ${LINE}` }}
                        >
                            <span
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white"
                                style={{ background: FLAME }}
                            >
                                <MessageCircle className="h-5 w-5" />
                            </span>
                            <span>
                                <span className="block text-sm font-extrabold text-[#1A1A1A]">
                                    {contact.title}
                                </span>
                                <span className="block text-xs font-medium text-[#888880]">
                                    {contact.subtitle}
                                </span>
                            </span>
                        </a>
                    </div>

                    <div className="grid grid-cols-2 gap-8 sm:justify-items-end">
                        {columns.map((col) => (
                            <div key={col.title}>
                                <h4 className="mb-4 text-base font-extrabold text-[#1A1A1A]">
                                    {col.title}
                                </h4>
                                <ul className="space-y-3">
                                    {col.links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className="text-base font-medium text-[#666660] transition-colors hover:text-[#1A1A1A]"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Space for the giant wordmark to breathe */}
                <div className="h-24 md:h-36" />

                {/* Bottom bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-[#888880]">
                        {rights}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {legal.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-[#888880] transition-colors hover:text-[#1A1A1A]"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
