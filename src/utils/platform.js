/**
 * Getting back to SacraSched itself from a parish site.
 *
 * On a parish subdomain the main landing page is a *different host*, so "/"
 * would only reload that parish's own page. Dropping the first label of the
 * site host turns icp.sacrasched.online into sacrasched.online.
 *
 * Returns null when there is no separate platform host to travel to — the
 * localhost dev server, or the platform site itself — and the caller should
 * use a normal in-app link to "/" instead.
 */
export function platformHomeHref(siteHost) {
    const host = String(siteHost || '').split(':')[0].trim();
    const labels = host.split('.').filter(Boolean);

    // Fewer than three labels is already an apex domain, not a parish site
    if (labels.length < 3) return null;

    return `https://${labels.slice(1).join('.')}`;
}
