import { Form, Head } from '@inertiajs/react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AuthField,
    AuthPasswordField,
    PasswordRequirements,
} from '@/components/auth/auth-fields';
import CtaSubmit from '@/components/cta-submit';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import AuthBrandSplit from '@/layouts/auth/auth-brand-split';
import { trackMeta } from '@/lib/meta';
import { login } from '@/routes';
import { store } from '@/routes/register';

const REGISTER_IMAGE =
    'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=1000&h=1300&q=80';

export default function Register() {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');

    return (
        <>
            <Head title={t('auth.register.headTitle')} />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                onSuccess={() => trackMeta('CompleteRegistration')}
            >
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        <div>
                            <AuthField
                                label={t('auth.register.name')}
                                id="name"
                                type="text"
                                name="name"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                placeholder={t('auth.register.namePlaceholder')}
                            />
                            <InputError
                                message={errors.name}
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <AuthField
                                label={t('auth.register.email')}
                                id="email"
                                type="email"
                                name="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                placeholder={t(
                                    'auth.register.emailPlaceholder',
                                )}
                            />
                            <InputError
                                message={errors.email}
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <AuthPasswordField
                                label={t('auth.register.password')}
                                id="password"
                                name="password"
                                required
                                tabIndex={3}
                                autoComplete="new-password"
                                placeholder={t(
                                    'auth.register.passwordPlaceholder',
                                )}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <PasswordRequirements value={password} />
                            <InputError
                                message={errors.password}
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <AuthPasswordField
                                label={t('auth.register.confirmPassword')}
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                placeholder={t(
                                    'auth.register.confirmPasswordPlaceholder',
                                )}
                            />
                            <InputError
                                message={errors.password_confirmation}
                                className="mt-1.5"
                            />
                        </div>

                        <CtaSubmit
                            tabIndex={5}
                            data-test="register-user-button"
                            processing={processing}
                        >
                            {t('auth.register.submit')}
                        </CtaSubmit>

                        <p className="text-center text-sm text-muted-foreground">
                            {t('auth.register.haveAccount')}{' '}
                            <TextLink
                                href={login()}
                                className="font-medium text-[#E8440A] no-underline hover:text-[#D13D09] hover:underline"
                                tabIndex={6}
                            >
                                {t('auth.register.logIn')}
                            </TextLink>
                        </p>
                    </div>
                )}
            </Form>
        </>
    );
}

function RegisterLayout({ children }: { children: ReactNode }) {
    const { t } = useTranslation();

    return (
        <AuthBrandSplit
            title={t('auth.register.title')}
            description={t('auth.register.description')}
            image={{
                src: REGISTER_IMAGE,
                srcSet: `${REGISTER_IMAGE} 1x, ${REGISTER_IMAGE.replace('w=1000&h=1300', 'w=1500&h=1950')} 2x`,
                alt: t('auth.register.imageAlt'),
            }}
            testimonial={{
                quote: t('auth.register.testimonialQuote'),
                author: t('auth.register.testimonialAuthor'),
                role: t('auth.register.testimonialRole'),
            }}
        >
            {children}
        </AuthBrandSplit>
    );
}

Register.layout = (page: ReactNode) => <RegisterLayout>{page}</RegisterLayout>;
