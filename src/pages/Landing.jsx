import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGlobe, faPalette, faClipboardList, faShieldHalved,
    faArrowRight, faArrowUpRightFromSquare, faBars, faXmark, faEnvelope, faPhone, faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { faFacebook } from '@fortawesome/free-brands-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';
import useParish, { usePageTitle } from '../hooks/useParish';
import useSiteContent from '../hooks/useSiteContent';
import { mediaUrl } from '../utils/media';
import FadeImg from '../components/FadeImg';
import { platformHomeHref } from '../utils/platform';
import useCompactNav from '../hooks/useCompactNav';
import ParishBooking from '../components/ParishBooking';
import WhereToFindUs from '../components/WhereToFindUs';
import ParishSchedule from '../components/ParishSchedule';
import ParishPosts from '../components/ParishPosts';
import ParishActivities from '../components/ParishActivities';
import ParishCarousel from '../components/ParishCarousel';
import ParishMark from '../components/ParishMark';
import JotformAgent from '../components/JotformAgent';
import { ParishDirectorySkeleton, CarouselSkeleton } from '../components/Skeleton';

/* What SacraSched gives a parish that signs up — platform capabilities,
   not devotee instructions. The booking detail lives on each parish site. */
const CAPABILITIES = [
    {
        icon: faGlobe,
        title: 'Your own address',
        text: 'Every parish gets its own subdomain — a website of its own, not a page inside someone else\'s.',
    },
    {
        icon: faPalette,
        title: 'Your own look',
        text: 'Colours and photos are set per parish, so the site carries your identity rather than ours.',
    },
    {
        icon: faClipboardList,
        title: 'One office inbox',
        text: 'Blessings, Mass intentions, sacraments and document requests arrive in a single dashboard.',
    },
    {
        icon: faShieldHalved,
        title: 'Separate by design',
        text: 'Each parish sees only its own records. Nothing is shared between parishes.',
    },
];

/* The top of a parish card in the directory: the parish's colours, with
   the photo it published fading in from the side and its badge over it. */
function ParishCardBanner({ site }) {
    return (
        <span className={`lp-parish__banner${site.photo ? '' : ' lp-parish__banner--plain'}`}>
            {site.photo && <img src={mediaUrl(site.photo)} alt="" loading="lazy" />}
            <span className="lp-parish__banner-text">
                <ParishMark parish={site} className="lp-parish__badge" />
                <span className="lp-parish__banner-name">
                    <b>{site.name}</b>
                    {site.diocese && <small>{site.diocese}</small>}
                </span>
            </span>
        </span>
    );
}

export default function Landing() {
    const { auth } = useAuth();
    const { parish, isTenant, siteName } = useParish();
    const { slots } = useSiteContent();
    const [menuOpen, setMenu] = useState(false);
    const compact = useCompactNav();

    const [sites,   setSites]   = useState([]);
    const [contacts, setContacts] = useState(null);   // how to reach SacraSched
    const [loading, setLoading] = useState(true);

    usePageTitle(null);

    const signedIn = Boolean(auth?.accessToken);
    const hero = slots['landing-hero'];

    // Only set when this page is served from a parish subdomain
    const platformHref = isTenant ? platformHomeHref(parish?.siteHost) : null;

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.get('/sites');
                if (alive) { setSites(res.data?.sites || []); setContacts(res.data?.contacts || null); }
            } catch {
                if (alive) setSites([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    return (
        // On the platform host the page wears SacraSched's fixed palette; on a
        // parish subdomain it follows that parish's theme like every other page.
        <div className={isTenant ? 'lp' : 'lp lp--platform'}>

            {/* Parish assistant — only on a parish site, not the platform page */}
            {isTenant && <JotformAgent />}

            {/* ── Navigation ── */}
            {/* Minimises once the hero has scrolled by — see useCompactNav */}
            <header className={`lp-nav${compact ? ' lp-nav--compact' : ''}`}>
                <div className="lp-nav__inner">
                    {/* On a parish subdomain "/" is that parish's own page, so the
                        SacraSched mark has to cross hosts to reach the main site. */}
                    {platformHref ? (
                        <a href={platformHref} className="lp-nav__brand" title="Back to the SacraSched home page">
                            <img src="/favicon.svg" alt="" className="lp-nav__mark" />
                            <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="lp-nav__wordmark" />
                        </a>
                    ) : (
                        <Link to="/" className="lp-nav__brand">
                            <img src="/favicon.svg" alt="" className="lp-nav__mark" />
                            <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="lp-nav__wordmark" />
                        </Link>
                    )}

                    {/* On a parish site its name comes up beside the mark once
                        the bar is minimised and the hero has scrolled away */}
                    {isTenant && parish?.name && (
                        <a href="#top" className="lp-nav__parish" aria-hidden={!compact} tabIndex={compact ? 0 : -1}
                           onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                            <ParishMark parish={parish} className="pl-nav__badge" />
                            <span className="pl-nav__names"><b>{parish.name}</b></span>
                        </a>
                    )}

                    <nav className="lp-nav__links">
                        {/* The directory only exists on the platform host */}
                        {!isTenant && <a href="#parishes">Parishes</a>}
                        {!isTenant && <a href="#platform">What it does</a>}
                        {isTenant && <a href="#visit">Visit</a>}
                    </nav>

                    {/* Signing in belongs to a parish site, not to the platform
                        page — so the platform host only points at the directory */}
                    <div className="lp-nav__actions">
                        {signedIn ? (
                            <Link to="/dashboard" className="lp-btn lp-btn--filled lp-btn--sm">Go to Dashboard</Link>
                        ) : isTenant ? (
                            <a href="#calendar" className="lp-btn lp-btn--filled lp-btn--sm">Calendar</a>
                        ) : (
                            <a href="#parishes" className="lp-btn lp-btn--filled lp-btn--sm">Find your parish</a>
                        )}
                    </div>

                    <button
                        className="lp-nav__toggle"
                        onClick={() => setMenu(o => !o)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                    >
                        <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
                    </button>
                </div>

                {menuOpen && (
                    <div className="lp-nav__drawer">
                        {!isTenant && <a href="#parishes" onClick={() => setMenu(false)}>Parishes</a>}
                        {!isTenant && <a href="#platform" onClick={() => setMenu(false)}>What it does</a>}
                        {signedIn ? (
                            <Link to="/dashboard" className="lp-btn lp-btn--filled">Go to Dashboard</Link>
                        ) : isTenant ? (
                            <a href="#calendar" className="lp-btn lp-btn--filled" onClick={() => setMenu(false)}>Calendar</a>
                        ) : (
                            <a href="#parishes" className="lp-btn lp-btn--filled" onClick={() => setMenu(false)}>
                                Find your parish
                            </a>
                        )}
                    </div>
                )}
            </header>

            {/* ── Hero ──
                A parish site leads with its own photograph across the full
                width; the platform page keeps the copy-beside-picture layout,
                since it is describing a product rather than being a church. */}
            <section className={`lp-hero ${isTenant ? 'lp-hero--cover' : ''}`}>
                {isTenant && (
                    <div className={`lp-hero__cover ${hero ? '' : 'lp-hero__cover--empty'}`}>
                        {hero && (
                            <FadeImg
                                src={mediaUrl(hero.url)}
                                alt={hero.alt || ''}
                                className="lp-hero__cover-img"
                            />
                        )}
                        {/* Darkens the photo just enough to keep the text legible
                            whatever the parish uploads */}
                        <span className="lp-hero__scrim" aria-hidden="true" />
                    </div>
                )}

                <div className="lp-hero__inner">
                    <div className="lp-hero__copy">
                        <span className="lp-eyebrow">
                            {isTenant ? (parish?.diocese || siteName) : 'Parish websites & scheduling'}
                        </span>

                        <h1 className="lp-hero__title">
                            {isTenant ? (
                                <>Welcome to <em>{parish.name}</em></>
                            ) : (
                                <>SacraSched gives every parish <em>a website of its own.</em></>
                            )}
                        </h1>

                        <p className="lp-hero__sub">
                            {isTenant
                                ? 'Book blessings, Mass intentions, sacraments and church documents with this parish, and follow every request until the office confirms it.'
                                : 'One platform, many parishes. Each church gets its own address, its own look, and one dashboard where the office handles every request that comes in.'}
                        </p>

                        <div className="lp-hero__cta">
                            {signedIn ? (
                                <Link to="/dashboard" className="lp-btn lp-btn--filled">
                                    Go to Dashboard <FontAwesomeIcon icon={faArrowRight} />
                                </Link>
                            ) : isTenant ? (
                                <a href="#calendar" className="lp-btn lp-btn--filled lp-btn--big">
                                    Book Now <FontAwesomeIcon icon={faArrowRight} />
                                </a>
                            ) : (
                                <a href="#parishes" className="lp-btn lp-btn--filled">
                                    Find your parish <FontAwesomeIcon icon={faArrowRight} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* The parishes on SacraSched, one after another */}
                    {!isTenant && <div className="lp-hero__art">
                        {loading ? <CarouselSkeleton /> : <ParishCarousel sites={sites} />}
                    </div>}
                </div>
            </section>

            {/* ── Parish directory ── */}
            {!isTenant && (
                <section className="lp-section" id="parishes">
                    <div className="lp-section__inner">
                        <div className="lp-section__hd">
                            <span className="lp-eyebrow">Parishes on SacraSched</span>
                            <h2>Churches with a site here</h2>
                            <p>Open your parish to book a service or check its schedules.</p>
                        </div>

                        <div className="lp-directory">
                            {/* Published parishes live on their own subdomain */}
                            {sites.map(site => (
                                <a
                                    key={site._id}
                                    href={site.url}
                                    className="lp-parish"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ParishCardBanner site={site} />
                                    <span className="lp-parish__body">
                                        {site.address && <span className="lp-parish__address">{site.address}</span>}
                                        <span className="lp-parish__host">{site.subdomain} <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="lp-parish__go" /></span>
                                    </span>
                                </a>
                            ))}
                        </div>

                        {loading ? (
                            <ParishDirectorySkeleton />
                        ) : sites.length === 0 && (
                            <p className="lp-directory__state">
                                No church has published a site yet. Live parishes are listed here automatically.
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* ── Book without an account — parish sites only ──
                The API takes the parish from the host, so this has nowhere to
                file a request on the platform page. */}
            {/* The parish's Mass calendar and the booking it leads to, as one
                region: pick the day, then the service, and the form opens with
                that date in it. Mass times and feast days only — the public
                feed behind the calendar deliberately carries no bookings. It
                brings its own section and removes it if this host has no
                parish. */}
            {isTenant && (
                <>
                    <ParishPosts />
                    <ParishActivities />
                    <ParishSchedule />
                    <ParishBooking parishName={parish.name} parishId={parish._id} />
                    <WhereToFindUs parish={parish} />
                </>
            )}

            {/* ── What the platform does ──
                A pitch aimed at churches deciding whether to join, so it has no
                place on a parish's own site — its visitors are parishioners,
                not prospective customers. Platform host only. */}
            {!isTenant && (
                <section className="lp-section lp-section--alt" id="platform">
                    <div className="lp-section__inner">
                        <div className="lp-section__hd">
                            <span className="lp-eyebrow">What SacraSched does</span>
                            <h2>Built for parishes, not for one parish</h2>
                        </div>

                        <div className="lp-grid lp-grid--4">
                            {CAPABILITIES.map(c => (
                                <article className="lp-tile" key={c.title}>
                                    <span className="lp-tile__icon"><FontAwesomeIcon icon={c.icon} /></span>
                                    <h3>{c.title}</h3>
                                    <p>{c.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Closing ── */}
            <section className="lp-cta">
                <div className="lp-cta__inner">
                    <h2>{isTenant ? `Book with ${siteName}` : 'Bring your parish onto SacraSched'}</h2>
                    <p>
                        {isTenant
                            ? 'Pick a day on the calendar and the service you need — no account required.'
                            : 'Parishes are set up by the SacraSched team. Get in touch and yours can have its own site and dashboard.'}
                    </p>

                    <div className="lp-cta__btns">
                        {signedIn ? (
                            <Link to="/dashboard" className="lp-btn lp-btn--light">
                                Go to Dashboard <FontAwesomeIcon icon={faArrowRight} />
                            </Link>
                        ) : isTenant ? (
                            <a href="#calendar" className="lp-btn lp-btn--light lp-btn--big">
                                Book Now <FontAwesomeIcon icon={faArrowRight} />
                            </a>
                        ) : (
                            <a href="#parishes" className="lp-btn lp-btn--light">
                                Browse the parishes <FontAwesomeIcon icon={faArrowRight} />
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer__inner">
                    <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="lp-footer__wordmark" />
                    <nav className="lp-footer__links">
                        {!isTenant && <a href="#parishes">Parishes</a>}
                        {!isTenant && <a href="#platform">What it does</a>}
                        {isTenant && <a href="#visit">Visit</a>}
                        {/* For the office, quietly: the way into the parish's dashboard */}
                        {isTenant && !signedIn && (
                            <Link to="/login" className="lp-footer__staff" title="Parish office sign-in">
                                Manage
                            </Link>
                        )}
                    </nav>
                    {/* How to reach SacraSched — on the platform page, from the API's PLATFORM_* settings */}
                    {!isTenant && contacts && (contacts.email || contacts.phone || contacts.facebook || contacts.address) && (
                        <address className="lp-footer__contacts">
                            <b>Contact us</b>
                            {contacts.email    && <a href={`mailto:${contacts.email}`}><FontAwesomeIcon icon={faEnvelope} /> {contacts.email}</a>}
                            {contacts.phone    && <a href={`tel:${contacts.phone.replace(/\s+/g, '')}`}><FontAwesomeIcon icon={faPhone} /> {contacts.phone}</a>}
                            {contacts.facebook && <a href={contacts.facebook} target="_blank" rel="noreferrer"><FontAwesomeIcon icon={faFacebook} /> {contacts.facebook.replace(/^https?:\/\/(www\.)?/, '')}</a>}
                            {contacts.address  && <span><FontAwesomeIcon icon={faLocationDot} /> {contacts.address}</span>}
                        </address>
                    )}
                    <p className="lp-footer__note">
                        © {new Date().getFullYear()} SacraSched · Parish websites and service scheduling.
                    </p>
                </div>
            </footer>
        </div>
    );
}
