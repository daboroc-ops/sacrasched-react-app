import { createContext, useState, useEffect, useMemo } from 'react';
import axiosPublic from '../api/axios';

const ParishContext = createContext({});

/**
 * Resolves which parish site the app is being served as, from the host.
 *
 *   sjp.sacrasched.app → that parish  (tenant mode: branding, implied parish
 *                                     on bookings, scoped admin data)
 *   sacrasched.app     → null         (platform mode: today's behaviour)
 *
 * The API does the resolving — GET /site reads the Host header — so the
 * frontend never has to guess at domain shapes. Public by design: the
 * sign-in page is branded before anyone logs in.
 */
export const ParishProvider = ({ children }) => {
    const [parish,  setParish]  = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                // localhost has no subdomain, so in development ?parish=<subdomain>
                // stands in for one. Branding only — the API still scopes data by
                // the real host, and this is stripped from production builds.
                const preview = import.meta.env.DEV
                    ? new URLSearchParams(window.location.search).get('parish')
                    : null;

                const res = await axiosPublic.get('/site', {
                    params: preview ? { subdomain: preview } : {}
                });
                // { platform: true } = the platform host itself, no parish
                if (alive) setParish(res.data?.name ? res.data : null);
            } catch {
                // 404 = no such site, 403 = suspended; both fall back to platform mode
                if (alive) setParish(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, []);

    const value = useMemo(() => ({
        parish,
        loading,
        /** True when the app is serving one parish's own site. */
        isTenant: Boolean(parish),
        /** What to call this deployment in headings and titles. */
        siteName: parish?.name || 'SacraSched',
    }), [parish, loading]);

    return (
        <ParishContext.Provider value={value}>
            {children}
        </ParishContext.Provider>
    );
};

export default ParishContext;
