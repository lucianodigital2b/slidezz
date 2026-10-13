import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#1A1A1A]">
                <AppLogoIcon className="size-4 text-white" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="mb-0.5 truncate font-display text-xl leading-tight tracking-wide text-[#1A1A1A]">
                    Slidezz
                </span>
            </div>
        </>
    );
}
