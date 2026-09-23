import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useRefreshToken from '../hooks/useRefreshToken';

/**
 * Wraps protected routes. On every page load/refresh it silently calls
 * GET /refresh — if the httpOnly jwt cookie is still valid, a new access
 * token comes back and auth state is restored. If the cookie is gone or
 * expired the refresh fails quietly and RequireAuth will redirect to /login.
 */
export default function PersistLogin() {
    const [checking, setChecking] = useState(true);
    const { auth } = useAuth();
    const refresh  = useRefreshToken();
    const hasRun   = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invocation in development
        if (hasRun.current) return;
        hasRun.current = true;

        // Only call refresh if we don't already have a token in memory
        // (avoids a redundant request right after a fresh login)
        if (auth?.accessToken) {
            setChecking(false);
            return;
        }

        const tryRefresh = async () => {
            try {
                await refresh(); // restores auth.accessToken from the httpOnly cookie
            } catch {
                // cookie missing or expired — RequireAuth will redirect to /login
            } finally {
                setChecking(false);
            }
        };

        tryRefresh();
    }, []); // intentionally empty — run once on mount only

    if (checking) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'var(--stone-100)',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--text-muted)'
            }}>
                Loading…
            </div>
        );
    }

    return <Outlet />;
}
