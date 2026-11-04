import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { setLanguage } from '@/i18n';
import type { SupportedLanguage } from '@/i18n';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { update as updateLanguage } from '@/routes/language';

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
    { code: 'pt', label: 'Português' },
    { code: 'en', label: 'English' },
];

function LanguageTabs() {
    const { i18n } = useTranslation();
    const active = i18n.language?.split('-')[0];

    const choose = (code: SupportedLanguage) => {
        // Switch right away; the account copy makes it stick on any browser.
        setLanguage(code);
        router.patch(
            updateLanguage.url(),
            { locale: code },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <div className="inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {LANGUAGES.map(({ code, label }) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => choose(code)}
                    aria-pressed={active === code}
                    className={cn(
                        'flex items-center rounded-md px-3.5 py-1.5 text-sm transition-colors',
                        active === code
                            ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                            : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

export default function Appearance() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('settings.appearance.title')} />

            <h1 className="sr-only">{t('settings.appearance.title')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.appearance.title')}
                    description={t('settings.appearance.description')}
                />
                <AppearanceTabs />
            </div>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.language.title')}
                    description={t('settings.language.description')}
                />
                <LanguageTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
