import { useState, useEffect } from 'react';

/* How far down the page the bar draws in */
const COMPACT_AT = 96;

/**
 * Has the visitor scrolled past the top of the page? The landing bars use
 * it to minimise: full width at the top, a small floating pill once the
 * hero has gone by — never hidden, just smaller.
 */
export default function useCompactNav() {
    const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.scrollY > COMPACT_AT);

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setCompact(window.scrollY > COMPACT_AT);
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return compact;
}
