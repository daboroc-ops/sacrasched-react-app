import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useParish from '../hooks/useParish';
import ParishBanner from './ParishBanner';

/**
 * The shell every end-of-journey page shares — payment confirmed, payment
 * cancelled, email sent, email confirmed.
 *
 * These are the moments a visitor is most likely to screenshot, forward, or
 * come back to hours later, so each one says plainly where it came from: the
 * SacraSched mark, and the parish whose site they are on.
 *
 * `tone` colours the icon: 'ok' for something finished, 'pending' for
 * something still in flight, 'bad' for something that did not work.
 *
 * `parish` — the card the API sends with a payment — puts the parish's
 * photo and name across the top instead of the plain wordmark header, so
 * a receipt says whose church it is at a glance.
 */
export default function ResultPage({
    tone = 'ok',
    icon,
    iconSpin = false,
    title,
    sub,
    children,
    actions,
    foot,
    parish = null,
    eyebrow,
}) {
    const { siteName, isTenant } = useParish();

    return (
        <div className="res">
            <div className="res__card">
                {parish?.name ? (
                    <ParishBanner parish={parish} eyebrow={eyebrow} />
                ) : (
                    <header className="res__brand">
                        <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="res__mark" />
                        {/* On the platform host the parish name IS "SacraSched" —
                            printing it under the mark would just say it twice. */}
                        {isTenant && <span className="res__parish">{siteName}</span>}
                    </header>
                )}

                <div className={`res__icon res__icon--${tone}`}>
                    <FontAwesomeIcon icon={icon} spin={iconSpin} />
                </div>

                <h1 className="res__title">{title}</h1>
                {sub && <p className="res__sub">{sub}</p>}

                {children}

                {actions && <div className="res__actions">{actions}</div>}
                {foot && <div className="res__foot">{foot}</div>}
            </div>
        </div>
    );
}
