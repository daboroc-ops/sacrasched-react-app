import { useEffect } from 'react';

/* No default agent on purpose. Each parish sets its own under
   Configuration → Parish; a parish that has not set one shows no
   assistant at all, rather than answering in another parish's voice. */

/**
 * Loads the JotForm chat agent and cleans it up on unmount.
 *
 * `autoOpenMs` is JotForm's `autoOpenChatIn` parameter — a delay in
 * milliseconds after which the panel pops itself open. Left null the agent
 * stays closed and shows only its launcher bubble, which is what you want on
 * a page someone has just arrived at: an unrequested panel covering the
 * content is the first thing a visitor closes.
 */
export default function JotformAgent({ agentId = '', autoOpenMs = null }) {
    useEffect(() => {
        if (!agentId) return undefined;

        const src = `https://cdn.jotfor.ms/agent/embedjs/${agentId}/embed.js`
            + (autoOpenMs != null ? `?autoOpenChatIn=${autoOpenMs}` : '');

        /* The embed script declares globals at the top level, so it can only
           ever run once per page: loading it a second time (a route change,
           StrictMode's double mount) throws "already been declared". Load it
           once and keep it; leaving the page only hides what it drew. */
        const widgets = () => document.querySelectorAll('[id^="JotformAgent"], [id^="JotFormAgent"], [class*="jotform-agent"]');
        let timer = null;
        if (document.querySelector(`script[src="${src}"]`)) {
            widgets().forEach(el => { el.style.display = ''; });
        } else {
            /* The widget is the heaviest thing on the page and the least
               urgent: it loads once the page itself has finished, and a
               few seconds after that, so the parish's own content comes
               first. A tap or a scroll before then brings it in sooner. */
            const load = () => {
                if (document.querySelector(`script[src="${src}"]`)) return;
                const script = document.createElement('script');
                script.src   = src;
                script.async = true;
                document.body.appendChild(script);
            };
            const soon = () => { clearTimeout(timer); timer = setTimeout(load, 800); };
            const after = () => { timer = setTimeout(load, 4000); };
            if (document.readyState === 'complete') after();
            else window.addEventListener('load', after, { once: true });
            window.addEventListener('scroll', soon, { once: true, passive: true });
            window.addEventListener('pointerdown', soon, { once: true });
        }

        return () => {
            clearTimeout(timer);
            // The embed's nodes live outside React's tree; tuck them away so
            // the bubble does not outlive the page, ready for the next visit.
            widgets().forEach(el => { el.style.display = 'none'; });
        };
    }, [agentId, autoOpenMs]);

    return null;
}
