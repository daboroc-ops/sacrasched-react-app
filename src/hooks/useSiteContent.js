import { useState, useEffect } from 'react';
import axiosPublic from '../api/axios';

/**
 * Images published to content slots from the admin CMS.
 * Public on purpose — the sign-in page needs its cover before anyone logs in.
 *
 * Returns { slots, loading }; slots is keyed by slot id, e.g.
 *   { 'login-cover': { url, alt } }
 */
export default function useSiteContent() {
    const [slots,   setSlots]   = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await axiosPublic.get('/content');
                if (alive) setSlots(res.data?.slots || {});
            } catch {
                // No CMS content yet, or API down — callers fall back to a placeholder
                if (alive) setSlots({});
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, []);

    return { slots, loading };
}
