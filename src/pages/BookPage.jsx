import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChurch } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useParish, { usePageTitle } from '../hooks/useParish';
import GuestBooking from '../components/GuestBooking';
import ParishMark from '../components/ParishMark';
import ParishBanner from '../components/ParishBanner';
import { SERVICES } from '../utils/services';

/**
 * The booking wizard on a page of its own — /book on a parish's site, or
 * /parish/<subdomain>/book on the platform. The calendar hands over the day
 * and the service in the query string, so the first question is already
 * answered; "Back to the calendar" returns to that section of the landing.
 */
const KNOWN = new Set(['intention', 'blessing', 'sacrament', 'document', 'occasional']);

export default function BookPage() {
    const { subdomain = '' } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { parish: tenant, siteName } = useParish();

    // On the platform the parish is named by the URL; on its own site it is already known
    const [parish, setParish] = useState(tenant || null);
    const [state,  setState]  = useState(tenant || !subdomain ? 'ok' : 'loading');

    const service = KNOWN.has(params.get('service')) ? params.get('service') : 'intention';
    const date    = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : '';
    const label   = SERVICES.find(s => s.id === service)?.label || 'Booking';

    usePageTitle(`Book ${label}`);

    useEffect(() => {
        if (tenant || !subdomain) return;
        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.get('/site', { params: { subdomain } });
                if (alive) { setParish(res.data); setState('ok'); }
            } catch {
                if (alive) setState('missing');
            }
        })();
        return () => { alive = false; };
    }, [subdomain, tenant]);

    // Arriving from the calendar keeps the old scroll position; start at the top
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const home     = subdomain ? `/parish/${subdomain}` : '/';
    const calendar = () => navigate(`${home}#calendar`);
    const name     = parish?.name || siteName || 'the parish';

    return (
        <div className="lp pl book-page">
            <header className="lp-nav pl-nav">
                <div className="lp-nav__inner">
                    <Link to={home} className="lp-nav__brand pl-nav__brand">
                        {parish ? <ParishMark parish={parish} className="pl-nav__badge" /> : <span className="pl-nav__badge"><FontAwesomeIcon icon={faChurch} /></span>}
                        <span className="pl-nav__names"><b>{name}</b></span>
                    </Link>
                    <button type="button" className="lp-btn lp-btn--ghost lp-btn--sm book-page__back" onClick={calendar}>
                        <FontAwesomeIcon icon={faArrowLeft} /> Back to the calendar
                    </button>
                </div>
            </header>

            <main className="lp-section book-page__main">
                <div className="lp-section__inner book-page__inner">
                    {state === 'missing' ? (
                        <div className="pl-state">
                            <h2>That parish site isn’t available.</h2>
                            <Link to="/" className="lp-btn lp-btn--filled pl-state__back">Back to SacraSched</Link>
                        </div>
                    ) : (
                        <>
                            {parish && <ParishBanner parish={parish} eyebrow="Booking with" className="book-page__banner" />}
                            <GuestBooking
                                key={`${service}:${date}`}
                                parishName={name}
                                parishId={parish?._id}
                                subdomain={subdomain}
                                service={service}
                                initialMode="book"
                                initialDate={date}
                                onExit={calendar}
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
