import { Check, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGE_STORAGE_KEY, type SupportedLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

const LANGUAGES: { code: SupportedLanguage; label: string; short: string }[] = [
    { code: 'pt', label: 'Português', short: 'PT' },
    { code: 'en', label: 'English', short: 'EN' },
];

export default function LanguageSwitcher({ className }: { className?: string }) {
    const { i18n } = useTranslation();
    const active = i18n.language?.split('-')[0];
    const current = LANGUAGES.find((lang) => lang.code === active) ?? LANGUAGES[0];

    const changeLanguage = (code: SupportedLanguage) => {
        i18n.changeLanguage(code);
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-input bg-white/90 px-3 py-1.5 text-sm font-medium text-foreground shadow-xs backdrop-blur transition-colors hover:bg-white focus-visible:ring-[3px] focus-visible:ring-violet-500/30 focus-visible:outline-none',
                    className,
                )}
                aria-label="Change language"
            >
                <Globe className="size-4 text-muted-foreground" />
                {current.short}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onSelect={() => changeLanguage(lang.code)}
                        className="justify-between"
                    >
                        {lang.label}
                        {lang.code === current.code && (
                            <Check className="size-4 text-violet-600" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
