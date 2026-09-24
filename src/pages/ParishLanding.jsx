import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faArrowRight, faChurch, faHandsPraying,
    faFileLines, faCross,
} from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useParish';
import { platformHomeHref } from '../utils/platform';
import { mediaUrl } from '../utils/media';
import useCompactNav from '../hooks/useCompactNav';
import ParishBooking from '../components/ParishBooking';
import WhereToFindUs from '../components/WhereToFindUs';
import ParishMark from '../components/ParishMark';
import ParishSchedule from '../components/ParishSchedule';
import ParishPosts from '../components/ParishPosts';
import ParishActivities from '../components/ParishActivities';
import { ParishLandingSkeleton } from '../components/Skeleton';
import JotformAgent from '../components/JotformAgent';

/**
 * The SacraSched mark on a parish page, linking back to the main landing page.
 *
 * On a real parish subdomain that is a different host, so it renders a plain
 * anchor to https://<base domain>. On localhost — and on the platform site —
 * there is no separate host, so it stays an in-app link to "/".
 */
function PlatformLink({ siteHost }) {
    const href = platformHomeHref(siteHost);

    const inner = (
        <>
            <img src="/favicon.svg" alt="" className="lp-nav__mark" />
            <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="lp-nav__wordmark" />
        </>
    );

    return href ? (
        <a href={href} className="lp-nav__brand" title="Back to the SacraSched home page">{inner}</a>
    ) : (
        <Link to="/" className="lp-nav__brand" title="Back to the SacraSched home page">{inner}</Link>
    );
}

/* Icons for the service list, in the order a parish publishes them. */
const SERVICE_ICONS = [faHandsPraying, faChurch, faCross, faFileLines];

const STEPS = [
    { n: 1, title: 'Pick a day',         text: 'Choose a date on the calendar and the service you need.' },
    { n: 2, title: 'Fill in the details', text: 'Only what the office needs — no account required.' },
    { n: 3, title: 'Follow it through',  text: 'A reference comes by text; check the request any time.' },
];

/**
 * A parish's own landing page.
 *
 * In production a published parish is served from its subdomain and the whole
 * app switches into tenant mode (see context/ParishContext.jsx). This route is
 * the way in without a subdomain: it renders the same welcome for the sample
 * parish on the SacraSched landing page, and for any published parish it can
 * look up by name.
 */
export default function ParishLanding() {
    const { subdomain } = useParams();
    // Keyed so switching parishes starts the page from scratch rather than
    // showing the previous church while the next one loads.
    return <ParishSite key={subdomain} subdomain={subdomain} />;
}

function ParishSite({ subdomain }) {
    const { auth } = useAuth();

    // A real parish the API resolves by subdomain
    const [parish,  setParish]  = useState(null);
    const [loading, setLoading] = useState(true);

    const signedIn = Boolean(auth?.accessToken);
    const compact  = useCompactNav();

    usePageTitle(parish?.name || null);

    // Arriving from the directory keeps the previous scroll position, which
    // would drop the visitor half-way down a church they have not seen yet.
    useEffect(() => { window.scrollTo(0, 0); }, []);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await axiosPublic.get('/site', { params: { subdomain } });
                if (alive) setParish(res.data);
            } catch {
                if (alive) setParish(null);   // unpublished, suspended, or no such parish
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [subdomain]);

    if (loading) return <div className="lp pl"><ParishLandingSkeleton /></div>;

    if (!parish) {
        return (
            <div className="lp pl-state">
                <div className="lp-directory__empty">
                    <FontAwesomeIcon icon={faChurch} />
                    <p><b>That parish site isn’t available.</b></p>
                    <p>It may not be published yet. Browse the parishes listed on SacraSched instead.</p>
                    <Link to="/" className="lp-btn lp-btn--filled pl-state__back">
                        <FontAwesomeIcon icon={faArrowLeft} /> Back to SacraSched
                    </Link>
                </div>
            </div>
        );
    }

    const services = parish.services || [];
    const initials = parish.code || parish.name.slice(0, 3).toUpperCase();

    return (
        <div className="lp pl">

            {/* Parish assistant — launcher only; it does not open by itself.
                This parish's own agent, set by its office; nothing if unset. */}
            {parish?.chatbot?.jotformAgentId && (
                <JotformAgent agentId={parish.chatbot.jotformAgentId} />
            )}

            {/* ── Navigation ── */}
            {/* SacraSched at the top; once the hero has scrolled by, the bar
                draws in, the wordmark folds to the mark and the parish's
                name comes up beside it. */}
            <header className={`lp-nav pl-nav${compact ? ' lp-nav--compact' : ''}`}>
                <div className="lp-nav__inner">
                    <PlatformLink siteHost={parish.siteHost} />

                    <a href="#top" className="lp-nav__parish" aria-hidden={!compact} tabIndex={compact ? 0 : -1}
                       onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <ParishMark parish={parish} className="pl-nav__badge" />
                        <span className="pl-nav__names">
                            <b>{parish.name}</b>
                            {parish.tagline && <small>{parish.tagline}</small>}
                        </span>
                    </a>

                    <nav className="lp-nav__links">
                        <a href="#services">Services</a>
                        <a href="#schedule">Mass Schedule</a>
                        <a href="#visit">Visit</a>
                    </nav>

                    {/* A parishioner books without an account, so the bar
                        offers none; staff who are signed in get their way in. */}
                    {signedIn && (
                        <div className="lp-nav__actions">
                            <Link to="/dashboard" className="lp-btn lp-btn--filled lp-btn--sm">Go to Dashboard</Link>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="lp-hero">
                <div className="lp-hero__inner">
                    <div className="lp-hero__copy">
                        {parish.diocese && <span className="lp-eyebrow">{parish.diocese}</span>}
                        <h1 className="lp-hero__title">
                            You are welcome at <em>{parish.name}</em>
                        </h1>

                        <p className="lp-hero__sub">
                            {parish.about ||
                                'Book blessings, Mass intentions, sacraments and church documents with this parish, and follow every request until the office confirms it.'}
                        </p>

                        <div className="lp-hero__cta">
                            <a href="#calendar" className="lp-btn lp-btn--filled lp-btn--big">
                                Book Now <FontAwesomeIcon icon={faArrowRight} />
                            </a>
                        </div>

                        {parish.feast && (
                            <ul className="lp-hero__points">
                                <li><FontAwesomeIcon icon={faChurch} /> {parish.feast}</li>
                            </ul>
                        )}
                    </div>

                    <div className="lp-hero__art">
                        <div className="lp-hero__photo lp-hero__photo--empty pl-hero__crest">
                            {parish.logo
                                ? <img className="pl-hero__logo" src={mediaUrl(parish.logo)} alt="" />
                                : <span className="pl-hero__initials">{initials}</span>}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Services ── */}
            {services.length > 0 && (
                <section className="lp-section" id="services">
                    <div className="lp-section__inner">
                        <div className="lp-section__hd">
                            <h2>What you can request here</h2>
                        </div>

                        <div className="lp-grid lp-grid--4">
                            {services.map((s, i) => (
                                <article className="lp-tile" key={s.title}>
                                    <span className="lp-tile__icon">
                                        <FontAwesomeIcon icon={SERVICE_ICONS[i % SERVICE_ICONS.length]} />
                                    </span>
                                    <h3>{s.title}</h3>
                                    <p>{s.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── News and activities — the office's own ── */}
            <ParishPosts subdomain={subdomain} />
            <ParishActivities subdomain={subdomain} />

            {/* ── The calendar, and the booking it leads to ──
                One region: pick the day, then the service, and the form opens
                with that date in it. This route is on the platform host rather
                than the parish's own, so the calendar has to name the parish. */}
            <ParishBooking
                parishName={parish.name}
                parishId={parish._id}
                subdomain={subdomain}
            />

            {/* ── The week of Masses ──
                Under the calendar: the calendar is what the page is for, and
                the week reads as the standing note that follows it. */}
            <ParishSchedule subdomain={subdomain} />

            {/* ── How it works ── */}
            <section className="lp-section" id="how">
                <div className="lp-section__inner">
                    <div className="lp-section__hd">
                        <h2>How it works</h2>
                    </div>

                    <div className="lp-grid lp-grid--3">
                        {STEPS.map(s => (
                            <article className="lp-step" key={s.n}>
                                <span className="lp-step__n">{s.n}</span>
                                <h3>{s.title}</h3>
                                <p>{s.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Visit ── */}
            {/* ── Where to find us — filled in under Configuration → Parish ── */}
            <WhereToFindUs parish={parish} />

            {/* ── Closing ── */}
            <section className="lp-cta">
                <div className="lp-cta__inner">
                    <h2>Book with {parish.name}</h2>

                    <div className="lp-cta__btns">
                        <a href="#calendar" className="lp-btn lp-btn--light lp-btn--big">
                            Book Now <FontAwesomeIcon icon={faArrowRight} />
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer__inner">
                    <span className="pl-footer__parish">
                        <FontAwesomeIcon icon={faChurch} /> {parish.name}
                    </span>
                    <nav className="lp-footer__links">
                        <a href="#services">Services</a>
                        <a href="#schedule">Mass Schedule</a>
                        <Link to="/">SacraSched</Link>
                        {/* For the office, quietly: the way into the parish's dashboard */}
                        {!signedIn && (
                            <Link to="/login" className="lp-footer__staff" title="Parish office sign-in">
                                Manage
                            </Link>
                        )}
                    </nav>
                    <p className="lp-footer__note">
                        © {new Date().getFullYear()} {parish.name} · A parish site on SacraSched.
                    </p>
                </div>
            </footer>
        </div>
    );
}
