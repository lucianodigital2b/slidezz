import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface FacebookPage {
    id: string;
    name: string | null;
    avatar: string | null;
    connected: boolean;
}

export default function FacebookPages({
    pages,
    selected,
}: {
    pages: FacebookPage[];
    selected: string[];
}) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<{
        page_ids: string[];
    }>({ page_ids: selected });

    const toggle = (id: string, checked: boolean) =>
        setData(
            'page_ids',
            checked
                ? [...data.page_ids, id]
                : data.page_ids.filter((p) => p !== id),
        );

    return (
        <>
            <Head title={t('settings.facebookPages.title')} />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings.facebookPages.title')}
                    description={t('settings.facebookPages.description')}
                />

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setData(
                                'page_ids',
                                pages.map((p) => p.id),
                            )
                        }
                    >
                        {t('settings.facebookPages.selectAll')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setData('page_ids', [])}
                    >
                        {t('settings.facebookPages.none')}
                    </Button>
                </div>

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        post('/social-accounts/facebook/pages');
                    }}
                >
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                        {pages.map((page) => (
                            <li key={page.id}>
                                <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                                    <Checkbox
                                        checked={data.page_ids.includes(
                                            page.id,
                                        )}
                                        onCheckedChange={(checked) =>
                                            toggle(page.id, checked === true)
                                        }
                                    />
                                    <Avatar className="h-8 w-8">
                                        {page.avatar && (
                                            <AvatarImage src={page.avatar} />
                                        )}
                                        <AvatarFallback>
                                            {(page.name ?? '?')
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">
                                        {page.name ?? page.id}
                                    </span>
                                    {page.connected && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {t(
                                                'settings.facebookPages.connected',
                                            )}
                                        </span>
                                    )}
                                </label>
                            </li>
                        ))}
                    </ul>

                    <InputError
                        message={
                            errors.page_ids
                                ? t('settings.facebookPages.pickOne')
                                : undefined
                        }
                    />

                    <Button
                        type="submit"
                        disabled={processing || data.page_ids.length === 0}
                    >
                        {t('settings.facebookPages.submit')}
                    </Button>
                </form>
            </div>
        </>
    );
}
