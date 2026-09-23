import useSiteContent from '../hooks/useSiteContent';
import useParish from '../hooks/useParish';
import { mediaUrl } from '../utils/media';
import FadeImg from './FadeImg';

/**
 * Identity block at the top of a dashboard sidebar: the picture published to
 * the "sidebar-banner" slot in the admin CMS, with the site name over it.
 *
 * On a parish site the name is that parish; on the platform host it is
 * SacraSched. With no picture uploaded a themed panel with the seal stands in,
 * so the sidebar looks finished either way.
 */
export default function SidebarBanner({ subtitle }) {
    const { slots }    = useSiteContent();
    const { siteName } = useParish();

    const banner = slots['sidebar-banner'];

    return (
        <div className="sb-banner">
            <div className="sb-banner__media">
                {banner ? (
                    <FadeImg src={mediaUrl(banner.url)} alt={banner.alt || ''} className="sb-banner__img" />
                ) : (
                    <div className="sb-banner__placeholder" aria-hidden="true">
                        <img src="/favicon.svg" alt="" />
                    </div>
                )}
            </div>

            <div className="sb-banner__body">
                <span className="sb-banner__name" title={siteName}>{siteName}</span>
                {subtitle && <span className="sb-banner__sub">{subtitle}</span>}
            </div>
        </div>
    );
}
