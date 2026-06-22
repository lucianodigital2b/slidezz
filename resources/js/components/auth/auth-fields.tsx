import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

const shellClasses =
    'group rounded-xl border border-input bg-white px-3.5 py-2 shadow-xs transition-[color,box-shadow] focus-within:border-[#E8440A] focus-within:ring-[3px] focus-within:ring-[#E8440A]/20';

const labelClasses = 'block text-[11px] font-medium tracking-wide text-muted-foreground';

const controlClasses =
    'w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground/50';

type FieldProps = ComponentProps<'input'> & { label: string };

export function AuthField({ label, id, name, className, ...props }: FieldProps) {
    const fieldId = id ?? name;

    return (
        <div className={shellClasses}>
            <label htmlFor={fieldId} className={labelClasses}>
                {label}
            </label>
            <input id={fieldId} name={name} className={cn(controlClasses, className)} {...props} />
        </div>
    );
}

export function AuthPasswordField({ label, id, name, className, ...props }: FieldProps) {
    const [show, setShow] = useState(false);
    const fieldId = id ?? name;

    return (
        <div className={shellClasses}>
            <label htmlFor={fieldId} className={labelClasses}>
                {label}
            </label>
            <div className="flex items-center gap-2">
                <input
                    id={fieldId}
                    name={name}
                    type={show ? 'text' : 'password'}
                    className={cn(controlClasses, className)}
                    {...props}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow((prev) => !prev)}
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
        </div>
    );
}

export function OrDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </span>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}

export function GoogleButton({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a
            href={href}
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-input bg-white text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-[#E8440A]/30 focus-visible:outline-none"
        >
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                    fill="#4285F4"
                    d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"
                />
                <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-4.07 1.16 7.16 7.16 0 0 1-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.28 14.3a7.18 7.18 0 0 1 0-4.6V6.62H1.28a12 12 0 0 0 0 10.78l4-3.1z"
                />
                <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.28 6.62l4 3.1A7.16 7.16 0 0 1 12 4.75z"
                />
            </svg>
            {children}
        </a>
    );
}
