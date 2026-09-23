import useParish from '../hooks/useParish';
import useSiteContent from '../hooks/useSiteContent';
import { mediaUrl } from '../utils/media';
import FadeImg from './FadeImg';

/**
 * The masthead of the devotee dashboard: one wide card carrying the page it is
 * on, the SacraSched mark, and the parish the site belongs to, over the
 * parish's own cover photo.
 *
 * The gradient is drawn from the theme tokens rather than fixed colours, so a
 * parish that recolours its site recolours this too.
 */
export default function DashboardBanner({ page, role }) {
    const { siteName, isTenant } = useParish();
    const { slots }    = useSiteContent();

    // The cover the parish already publishes for its landing page; the sidebar
    // picture is the fallback so the banner is never bare.
    const cover = slots['landing-hero'] || slots['sidebar-banner'];

    return (
        <header className="dbanner">
            <div className="dbanner__art" aria-hidden="true">
                {cover && (
                    <FadeImg
                        src={mediaUrl(cover.url)}
                        alt=""
                        className="dbanner__photo"
                    />
                )}
                <div className="dbanner__veil" />
            </div>

            <div className="dbanner__lead">
                <h1 className="dbanner__page">{page}</h1>
                {role && <span className="dbanner__role">{role}</span>}
            </div>

            <img
                src="/sacrasched-wordmark.svg"
                alt="SacraSched"
                className="dbanner__mark"
            />

            {/* On the platform host the name and the wordmark are the same
                word; only a parish site has something else to say here. */}
            {isTenant && (
                <span className="dbanner__parish" title={siteName}>{siteName}</span>
            )}
        </header>
    );
}
