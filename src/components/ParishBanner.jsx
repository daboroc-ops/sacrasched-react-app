import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChurch } from '@fortawesome/free-solid-svg-icons';
import { mediaUrl } from '../utils/media';

/**
 * The parish a booking belongs to, as a picture with its name across it —
 * heads every "you're done" screen: booked, paid, cancelled, the receipt.
 *
 * The photo is the one the office published for its landing page; a parish
 * that has published none gets its colours and its initials instead, so the
 * banner is never a blank. `parish` is the card the API sends with the
 * booking config and with a payment: { name, code, address, photo, logo }.
 */
export default function ParishBanner({ parish, eyebrow = 'Booked with', className = '' }) {
    if (!parish?.name) return null;
    const photo = parish.photo ? mediaUrl(parish.photo) : '';
    const logo  = parish.logo  ? mediaUrl(parish.logo)  : '';
    const code  = parish.code || parish.name.slice(0, 3).toUpperCase();

    return (
        <div className={`pban${photo ? '' : ' pban--plain'} ${className}`}>
            {photo && <img className="pban__img" src={photo} alt="" />}
            <div className="pban__shade" />
            <img src="/favicon.svg" alt="SacraSched" className="pban__mark" />
            <div className="pban__body">
                {logo
                    ? <img className="pban__logo" src={logo} alt="" />
                    : <span className="pban__badge">{code || <FontAwesomeIcon icon={faChurch} />}</span>}
                <div className="pban__text">
                    <small>{eyebrow}</small>
                    <b>{parish.name}</b>
                    {parish.address && <span>{parish.address}</span>}
                </div>
            </div>
        </div>
    );
}
