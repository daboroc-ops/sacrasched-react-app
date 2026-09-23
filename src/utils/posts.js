/** Where a post opens: under /parish/<subdomain> on the platform, /news on the parish's own site. */
export const postPath = (subdomain, slug) => (subdomain ? `/parish/${subdomain}/news/${slug}` : `/news/${slug}`);

/** "13 September 2026" */
export const fmtPostDate = iso => new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * A post's HTML as the page should show it: pictures the office put in
 * are stored as /uploads/… and are served through the API.
 */
export const postHtmlForPage = html => String(html || '').replace(/src="\/uploads\//g, 'src="/api/uploads/');
