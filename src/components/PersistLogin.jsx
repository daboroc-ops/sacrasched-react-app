import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useRefreshToken from '../hooks/useRefreshToken';
import { hadSession } from '../utils/session';
import { Skeleton, SkeletonBlock } from './Skeleton';

/**
 * Wraps protected routes. On every page load/refresh it silently calls
 * GET /refresh — if the httpOnly jwt cookie is still valid, a new access
 * token comes back and auth state is restored. If the cookie is gone or
 * expired the refresh fails quietly and RequireAuth will redirect to /login.
 */
export default function PersistLogin() {
    const { auth } = useAuth();
    // Already signed in this session (fresh login) — nothing to restore; a
    // browser that never signed in has no cookie to restore from either
    const [checking, setChecking] = useState(() => !auth?.accessToken && hadSession());
    const refresh  = useRefreshToken();
    const hasRun   = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invocation in development
        if (hasRun.current) return;
        hasRun.current = true;

        // Only call refresh if we don't already have a token in memory
        // (avoids a redundant request right after a fresh login)
        if (auth?.accessToken) return;

        // A visitor who has never signed in on this browser has no cookie to
        // refresh from — asking would only earn a 401 on every public page.
        // The flag is set on sign-in and cleared on sign-out (utils/session).
        if (!hadSession()) return;

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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount only: hasRun guards it, and the token check must not re-run on every auth change

    if (checking) {
        return (
            <div className="skel-gate">
                <SkeletonBlock label="Signing you in…">
                    <Skeleton w="100%" h={104} r={22} />
                    <Skeleton w="100%" h={54} r={99} style={{ marginTop: 12 }} />
                    <Skeleton w="100%" h={320} r={8} style={{ marginTop: 18 }} />
                </SkeletonBlock>
            </div>
        );
    }

    return <Outlet />;
}
