import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import ParishCalendar from './ParishCalendar';

/**
 * The parish calendar, and the way from it to a booking.
 *
 * A visitor picks the day out of the calendar, then the service, and the
 * booking page opens with that date already in it — so the question the
 * calendar just answered is never asked again. The wizard lives on a page
 * of its own (pages/BookPage), not inside this section.
 *
 * The whole region removes itself when there is no calendar to show — no
 * parish on this host, or the feed is down.
 */
export default function ParishBooking({ subdomain }) {
    const navigate = useNavigate();
    const [gone, setGone] = useState(false);

    // Stable: ParishCalendar has it in an effect's dependencies.
    const hide = useCallback(() => setGone(true), []);

    /* Coming back from the booking page: the landing page starts at the
       top on mount and this section arrives after the parish has loaded,
       so the #calendar in the address has to be honoured here, once the
       section exists. */
    useEffect(() => {
        if (window.location.hash !== '#calendar') return;
        // The sections above fill in for a second or two (the schedule, the
        // photos), pushing the calendar down after the first scroll — so it
        // is brought back a few times, unless the visitor has scrolled since.
        let touched = false;
        const stop = () => { touched = true; };
        window.addEventListener('wheel', stop, { passive: true, once: true });
        window.addEventListener('touchstart', stop, { passive: true, once: true });
        const timers = [60, 400, 1000, 2000].map(ms => setTimeout(() => {
            if (!touched) document.getElementById('calendar')?.scrollIntoView({ block: 'start' });
        }, ms));
        return () => { timers.forEach(clearTimeout); window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); };
    }, []);

    if (gone) return null;

    const home = subdomain ? `/parish/${subdomain}` : '';
    const startBooking = (date, service) => {
        const q = new URLSearchParams({ service, ...(date && { date }) });
        navigate(`${home}/book?${q}`);
    };

    return (
        <section className="lp-section lp-section--alt" id="calendar">
            <div className="lp-section__inner">
                <div className="pb__pane">
                    <div className="lp-section__hd">
                        <h2>This month</h2>
                        <p>Pick a day to see what is on, and to book it.</p>
                    </div>

                    <ParishCalendar
                        subdomain={subdomain}
                        onBook={startBooking}
                        onUnavailable={hide}
                    />

                    <p className="pb__track">
                        Already sent an intention?{' '}
                        <Link to="/track">
                            <FontAwesomeIcon icon={faMagnifyingGlass} /> Check a request
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}
