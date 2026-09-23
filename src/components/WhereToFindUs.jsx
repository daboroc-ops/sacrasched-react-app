import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faClock, faEnvelope, faPhone, faMobileScreen, faRoute, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { faFacebook } from '@fortawesome/free-brands-svg-icons';

/**
 * Where the parish is — at the foot of its landing page: the address and
 * how to get there, the office hours and contacts, beside a map.
 *
 * The office fills this in under Configuration → Parish. The map takes
 * whatever it gave: a Google Maps embed link is used as it is; a "lat,lng"
 * pair or a place name is searched; nothing at all falls back to the
 * address. A parish with none of these has no section.
 */
const EMBED = /^https:\/\/www\.google\.com\/maps\/embed/i;

function mapSrc(parish) {
    const raw = String(parish.visit?.map || '').trim();
    if (EMBED.test(raw)) return raw;
    const q = raw || parish.address || parish.name;
    return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : '';
}

function mapLink(parish) {
    const raw = String(parish.visit?.map || '').trim();
    if (raw && !EMBED.test(raw) && /^https?:/i.test(raw)) return raw;
    const q = (!EMBED.test(raw) && raw) || parish.address || parish.name;
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

export default function WhereToFindUs({ parish }) {
    if (!parish) return null;
    const v = parish.visit || {};
    const hours = v.officeHours || parish.officeHours || '';
    const rows = [
        parish.address      && { icon: faLocationDot, label: 'Address',      text: parish.address },
        v.directions        && { icon: faRoute,       label: 'How to get there', text: v.directions },
        hours               && { icon: faClock,       label: 'Office hours', text: hours },
        parish.contactPhone && { icon: faPhone,       label: 'Phone',        text: parish.contactPhone, href: `tel:${parish.contactPhone}` },
        v.mobile            && { icon: faMobileScreen, label: 'Mobile',      text: v.mobile,            href: `tel:${v.mobile.replace(/s+/g, '')}` },
        parish.contactEmail && { icon: faEnvelope,    label: 'Email',        text: parish.contactEmail, href: `mailto:${parish.contactEmail}` },
        v.facebook          && { icon: faFacebook,    label: 'Facebook',     text: v.facebook.replace(/^https?:\/\/(www\.)?/, ''), href: v.facebook }
    ].filter(Boolean);
    if (!rows.length) return null;

    const src  = mapSrc(parish);
    const link = mapLink(parish);

    return (
        <section className="lp-section lp-section--alt" id="visit">
            <div className="lp-section__inner">
                <div className="lp-section__hd">
                    <span className="lp-eyebrow">Visit</span>
                    <h2>Where to find us</h2>
                </div>

                <div className={`pl-visit${src ? '' : ' pl-visit--nomap'}`}>
                    <div className="pl-contact">
                        {rows.map(r => (
                            <div className="pl-contact__item" key={r.label}>
                                <FontAwesomeIcon icon={r.icon} />
                                <span>
                                    <b>{r.label}</b>
                                    {r.href ? <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{r.text}</a> : r.text}
                                </span>
                            </div>
                        ))}
                    </div>

                    {src && (
                        <div className="pl-map">
                            <iframe
                                src={src}
                                title={`Map to ${parish.name}`}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                            {link && (
                                <a className="pl-map__open" href={link} target="_blank" rel="noreferrer">
                                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Open in Google Maps
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
