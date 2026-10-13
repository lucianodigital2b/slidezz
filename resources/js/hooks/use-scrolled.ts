import { useEffect, useState } from 'react';

/**
 * Tracks whether the window has scrolled past a threshold. Used to switch the
 * landing nav into its floating translucent pill state.
 */
export function useScrolled(threshold = 16): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    return scrolled;
}
