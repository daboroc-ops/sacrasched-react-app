import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { mediaUrl } from '../utils/media';
import FadeImg from './FadeImg';

/**
 * One service, as a photo card.
 *
 * Presentation only — the caller decides what it is. `as` takes an element or
 * component ('button', Link, …) so the devotee's picker can use a button and
 * a landing page can use a link without either restyling the card.
 *
 * The photo comes from the service's CMS slot. Without one the card is a
 * themed wash with its icon, at the same size, so publishing a picture later
 * changes nothing about the layout.
 */
export default function ServiceCard({
    service,
    art,
    as: Tag = 'button',
    className = '',
    children,
    ...rest
}) {
    return (
        <Tag className={`bk-card ${className}`} {...rest}>
            <span className="bk-card__art" aria-hidden="true">
                {art
                    ? <FadeImg src={mediaUrl(art.url)} alt="" className="bk-card__photo" />
                    : <span className="bk-card__fallback">
                          <FontAwesomeIcon icon={service.icon} />
                      </span>}
                <span className="bk-card__veil" />
            </span>

            <span className="bk-card__body">
                <span className="bk-card__title">{service.label}</span>
                <span className="bk-card__blurb">{children || service.blurb}</span>
            </span>

            <span className="bk-card__go" aria-hidden="true">
                <FontAwesomeIcon icon={faArrowRight} />
            </span>
        </Tag>
    );
}
