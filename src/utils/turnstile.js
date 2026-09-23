/**
 * Whether the captcha is configured for this build.
 *
 * The API applies the same rule from its side: with no key set, the challenge
 * is neither rendered nor enforced, so the app runs without Cloudflare
 * credentials during development.
 */
export const turnstileEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
