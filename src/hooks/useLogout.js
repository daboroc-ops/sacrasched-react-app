import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosPublic from '../api/axios';
import useAuth from './useAuth';
import { clearSession } from '../utils/session';

/**
 * Signing out, in one place.
 *
 * Order matters. The POST is what actually ends the session: it clears the
 * httpOnly refresh cookie and wipes the stored refresh token, so a later
 * page load — including one from the browser's Back button — cannot revive
 * the session through PersistLogin's silent /refresh.
 *
 * Clearing the in-memory token alone is not enough: that only hides the UI
 * until the next reload.
 */
export default function useLogout() {
    const { setAuth } = useAuth();
    const navigate = useNavigate();

    return useCallback(async () => {
        try {
            await axiosPublic.post('/logout');
        } catch {
            // Already signed out, or the API is unreachable — the local session
            // still has to go, so carry on regardless.
        }

        setAuth({});
        clearSession();

        // replace, so Back does not land on the page we just left
        navigate('/login', { replace: true });
    }, [setAuth, navigate]);
}
