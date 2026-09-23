import { createContext, useState, useEffect, useMemo } from 'react';
import axiosPublic from '../api/axios';
import { applyTokens } from '../utils/theme';

const ThemeContext = createContext({});

/**
 * Loads the theme for whatever host the app is served from — a parish
 * subdomain gets its own, everything else the platform theme — and applies it
 * to :root. The stylesheets read those variables, so both the devotee and the
 * admin template re-skin without a rebuild.
 *
 * The request is public: the login and landing pages must be themed before
 * anyone signs in.
 */
export const ThemeProvider = ({ children }) => {
    const [theme,   setTheme]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [nonce,   setNonce]   = useState(0);      // bumped by reload()

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await axiosPublic.get('/theme');
                if (!alive) return;
                applyTokens(res.data?.tokens);
                setTheme(res.data);
            } catch {
                // No saved theme, or the API is unreachable — base.css defaults stand
                if (alive) setTheme(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [nonce]);

    const value = useMemo(() => ({
        theme,
        loading,
        /** Apply a token map immediately — used by the theme editor's preview. */
        preview: applyTokens,
        /** Re-fetch after saving so the running app picks the change up. */
        reload: () => setNonce(n => n + 1),
    }), [theme, loading]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
