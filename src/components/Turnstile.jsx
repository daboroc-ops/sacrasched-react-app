import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing at all when VITE_TURNSTILE_SITE_KEY is unset, so the forms
 * keep working before the keys are configured — the API skips the check in
 * exactly the same case.
 *
 *   .env:
 *     VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
 *
 * The token it produces is single-use and short-lived; `resetKey` lets a form
 * ask for a fresh one after a failed submit.
 */
const SCRIPT_ID  = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Loads the Cloudflare script once, shared by every widget on the page. */
let scriptPromise = null;
function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);

    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const existing = document.getElementById(SCRIPT_ID);
            const el = existing || document.createElement('script');

            if (!existing) {
                el.id = SCRIPT_ID;
                el.src = SCRIPT_SRC;
                el.async = true;
                el.defer = true;
                document.head.appendChild(el);
            }

            el.addEventListener('load', () => resolve(window.turnstile));
            el.addEventListener('error', () => {
                scriptPromise = null;          // allow a retry on the next mount
                reject(new Error('Turnstile script failed to load'));
            });
        });
    }
    return scriptPromise;
}

export default function Turnstile({ onToken, resetKey = 0 }) {
    const siteKey   = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    const holder    = useRef(null);
    const widgetId  = useRef(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!siteKey || !holder.current) return undefined;

        let alive = true;
        const node = holder.current;

        loadTurnstile()
            .then(turnstile => {
                if (!alive || !turnstile) return;

                widgetId.current = turnstile.render(node, {
                    sitekey: siteKey,
                    // Turnstile defaults to 'auto', which follows the visitor's
                    // OS dark-mode setting and renders a black widget on our
                    // white cards. The app is light-only, so pin it to light.
                    theme: 'light',
                    // The normal widget is a fixed 300px, wider than a form
                    // column on a small phone; the compact one fits.
                    size: (node.clientWidth || 300) < 300 ? 'compact' : 'normal',
                    callback: token => onToken(token),
                    'expired-callback': () => onToken(''),
                    'error-callback':   () => { onToken(''); setFailed(true); },
                });
            })
            .catch(() => { if (alive) setFailed(true); });

        return () => {
            alive = false;
            if (widgetId.current && window.turnstile) {
                try { window.turnstile.remove(widgetId.current); } catch { /* already gone */ }
                widgetId.current = null;
            }
        };
        // resetKey changing tears the widget down and mounts a fresh challenge
    }, [siteKey, resetKey, onToken]);

    if (!siteKey) return null;

    return (
        <div className="turnstile">
            <div ref={holder} className="turnstile__widget" />
            {failed && (
                <p className="turnstile__error">
                    The verification challenge could not load. Check your connection and reload the page.
                </p>
            )}
        </div>
    );
}
