import { Form, Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('auth.register.headTitle')} />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('auth.register.name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder={t('auth.register.namePlaceholder')}
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('auth.register.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder={t('auth.register.emailPlaceholder')}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('auth.register.password')}</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder={t('auth.register.passwordPlaceholder')}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">{t('auth.register.confirmPassword')}</Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button type="submit" className="mt-2 w-full" tabIndex={5} data-test="register-user-button">
                                {processing && <Spinner />}
                                {t('auth.register.submit')}
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            {t('auth.register.haveAccount')}{' '}
                            <TextLink href={login()} tabIndex={6}>
                                {t('auth.register.logIn')}
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Criar uma conta',
    description: 'Insira seus dados abaixo para criar sua conta',
};
