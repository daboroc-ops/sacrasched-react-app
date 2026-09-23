/**
 * Uploaded images are stored by the API under /uploads and served from the
 * backend origin, which the app always reaches through the /api proxy.
 */
export const mediaUrl = url => (url ? `/api${url}` : '');

/** "2.4 MB" */
export const fileSize = bytes => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};
