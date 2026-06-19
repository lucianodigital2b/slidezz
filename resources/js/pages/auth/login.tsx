import { Form, Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthField, AuthPasswordField } from '@/components/auth/auth-fields';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import AuthBrandSplit from '@/layouts/auth/auth-brand-split';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

const LOGIN_IMAGE =
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&h=1300&q=80';

export default function Login({ status, canResetPassword, canRegister }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('auth.login.headTitle')} />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        {status && (
                            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
                                {status}
                            </div>
                        )}

                        <div>
                            <AuthField
                                label={t('auth.login.email')}
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder={t('auth.login.emailPlaceholder')}
                            />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        <div>
                            <AuthPasswordField
                                label={t('auth.login.password')}
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder={t('auth.login.passwordPlaceholder')}
                            />
                            <InputError message={errors.password} className="mt-1.5" />
                            {canResetPassword && (
                                <div className="mt-2">
                                    <TextLink
                                        href={request()}
                                        className="text-sm font-medium text-violet-600 no-underline hover:text-violet-700 hover:underline"
                                        tabIndex={5}
                                    >
                                        {t('auth.login.forgotPassword')}
                                    </TextLink>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="remember"
                                className="cursor-pointer text-sm text-muted-foreground"
                            >
                                {t('auth.login.rememberMe')}
                            </label>
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                                className="data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            tabIndex={4}
                            data-test="login-button"
                            className="h-11 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40"
                        >
                            {processing && <Spinner />}
                            {t('auth.login.submit')}
                        </Button>

                        {canRegister && (
                            <p className="text-center text-sm text-muted-foreground">
                                {t('auth.login.noAccount')}{' '}
                                <TextLink
                                    href={register()}
                                    className="font-medium text-violet-600 no-underline hover:text-violet-700 hover:underline"
                                    tabIndex={6}
                                >
                                    {t('auth.login.signUp')}
                                </TextLink>
                            </p>
                        )}
                    </div>
                )}
            </Form>
        </>
    );
}

function LoginLayout({ children }: { children: ReactNode }) {
    const { t } = useTranslation();

    return (
        <AuthBrandSplit
            title={t('auth.login.title')}
            description={t('auth.login.description')}
            image={{
                src: LOGIN_IMAGE,
                srcSet: `${LOGIN_IMAGE} 1x, ${LOGIN_IMAGE.replace('w=1000&h=1300', 'w=1500&h=1950')} 2x`,
                alt: t('auth.login.imageAlt'),
            }}
            testimonial={{
                quote: t('auth.login.testimonialQuote'),
                author: t('auth.login.testimonialAuthor'),
                role: t('auth.login.testimonialRole'),
            }}
        >
            {children}
        </AuthBrandSplit>
    );
}

Login.layout = (page: ReactNode) => <LoginLayout>{page}</LoginLayout>;
