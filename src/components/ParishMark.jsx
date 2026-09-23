import { mediaUrl } from '../utils/media';

/**
 * A parish's mark: the logo it uploaded (Configuration → Parish, or
 * Content → Parish logo), or its initials on the brand gradient until it
 * has. Same square everywhere it stands for the parish — the navbar, the
 * directory cards, the carousel, the hero crest.
 */
export default function ParishMark({ parish, className = '' }) {
    if (!parish) return null;
    const initials = parish.code || String(parish.name || '').slice(0, 3).toUpperCase();
    return parish.logo
        ? <span className={`${className} pmark pmark--logo`}><img src={mediaUrl(parish.logo)} alt="" /></span>
        : <span className={`${className} pmark`}>{initials}</span>;
}
