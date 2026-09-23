/**
 * Applying design tokens at runtime.
 *
 * A theme is a map of CSS custom properties, e.g. { '--brand': '#964B01' }.
 * Every colour in the devotee and admin stylesheets reads one of these, so
 * writing them onto :root re-skins both templates with no rebuild.
 */

/** Only real custom properties holding a literal colour or size are applied. */
const SAFE_KEY   = /^--[a-z0-9-]+$/;
const SAFE_VALUE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|\d{1,2}(\.\d+)?(px|rem))$/i;

const isSafe = (key, value) =>
    SAFE_KEY.test(key) && SAFE_VALUE.test(String(value).trim());

/** Writes a token map onto an element's inline style (default: :root). */
export function applyTokens(tokens, element) {
    const target = element || document.documentElement;
    Object.entries(tokens || {}).forEach(([key, value]) => {
        if (isSafe(key, value)) target.style.setProperty(key, String(value).trim());
    });
}

/** Turns a token map into a React `style` object, for scoped previews. */
export function tokensToStyle(tokens) {
    return Object.entries(tokens || {}).reduce((style, [key, value]) => {
        if (isSafe(key, value)) style[key] = value;
        return style;
    }, {});
}
