import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import { home } from '@/routes';

type AuthBrandSplitProps = {
    title: string;
    description: string;
    image: { src: string; srcSet?: string; alt: string };
    testimonial: { quote: string; author: string; role: string };
    children: ReactNode;
};

export default function AuthBrandSplit({
    title,
    description,
    image,
    testimonial,
    children,
}: AuthBrandSplitProps) {
    return (
        <div className="relative flex min-h-svh flex-col bg-white lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <LanguageSwitcher className="absolute top-5 right-5 z-20" />
            <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
                <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="(min-width: 1024px) 40vw, 0px"
                    alt={image.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45" />

                <Link
                    href={home()}
                    className="relative z-10 flex items-center gap-2.5 text-white"
                >
                    <AppLogoIcon className="size-7" />
                    <span className="text-lg font-semibold tracking-tight">Slidezz</span>
                </Link>

                <figure className="relative z-10 max-w-xl">
                    <blockquote className="text-3xl leading-snug font-semibold tracking-tight text-balance text-white">
                        “{testimonial.quote}”
                    </blockquote>
                    <figcaption className="mt-6">
                        <div className="text-base font-semibold text-white">
                            {testimonial.author}
                        </div>
                        <div className="text-sm text-white/70">{testimonial.role}</div>
                    </figcaption>
                </figure>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
                <Link
                    href={home()}
                    className="mb-10 flex items-center gap-2.5 text-foreground lg:hidden"
                >
                    <AppLogoIcon className="size-7 text-violet-600" />
                    <span className="text-lg font-semibold tracking-tight">Slidezz</span>
                </Link>

                <div className="mx-auto w-full max-w-sm">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground">
                            {title}
                        </h1>
                        <p className="text-sm text-pretty text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    <div className="mt-7">{children}</div>
                </div>
            </main>
        </div>
    );
}
