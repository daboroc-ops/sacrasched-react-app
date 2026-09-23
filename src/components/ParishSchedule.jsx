import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChurch } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import WeekSchedule from './WeekSchedule';
import { WeekScheduleSkeleton } from './Skeleton';

const fmtTime = v => {
    if (!v) return '';
    const [h, m] = String(v).split(':').map(Number);
    if (Number.isNaN(h)) return v;
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/* ScheduledMass dates are stored at UTC midnight; read them back the same way. */
const utcDate = iso => {
    const d = new Date(iso);
    return {
        day:  d.getUTCDate(),
        // "Wed · Sep" — the leaf under the day number
        tag:  [d.toLocaleDateString('en-PH', { weekday: 'short', timeZone: 'UTC' }),
               d.toLocaleDateString('en-PH', { month: 'short',   timeZone: 'UTC' })].join(' · ')
    };
};

/**
 * The parish's Mass times on its public site — the schedule the office keeps
 * in the admin, day by day, and the special Masses it has set for the month.
 *
 * Nothing here is typed into the page: it is whatever the parish admin has
 * saved, and a parish that has saved nothing shows nothing rather than
 * another parish's times.
 */
export default function ParishSchedule({ subdomain = '' }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const now = new Date();
                const res = await axiosPublic.get('/site/calendar', {
                    params: { year: now.getFullYear(), month: now.getMonth() + 1, ...(subdomain && { subdomain }) }
                });
                if (alive) setData(res.data || {});
            } catch {
                if (alive) setData(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [subdomain]);

    /* The section keeps its place while the times are on their way, so the
       calendar below does not lurch up and back down. */
    if (loading) return (
        <section className="lp-section" id="schedule">
            <div className="lp-section__inner">
                <div className="lp-section__hd"><h2>Mass schedule</h2></div>
                <WeekScheduleSkeleton />
            </div>
        </section>
    );

    if (!data) return null;

    const days = data.massSchedule?.days || {};
    const hasWeek = Object.values(days).some(list => list?.length);

    /* The month's special Masses still ahead — a fiesta, a novena, an
       anniversary Mass — as the office set them under Specific Masses. */
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = (data.scheduled || [])
        .filter(m => new Date(m.date).getTime() >= Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
        .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.time).localeCompare(String(b.time)));

    if (!hasWeek && upcoming.length === 0) return null;

    const monthName = today.toLocaleDateString('en-PH', { month: 'long' });

    return (
        <section className="lp-section" id="schedule">
            <div className="lp-section__inner">
                <div className="lp-section__hd">
                    <h2>Mass schedule</h2>
                </div>

                {hasWeek && <WeekSchedule days={days} />}

                {upcoming.length > 0 && (
                    <div className="ps-up">
                        <h3 className="ps-up__title">
                            <FontAwesomeIcon icon={faChurch} /> Special Masses this {monthName}
                        </h3>
                        <ul className="ps-up__list">
                            {upcoming.map((m, i) => {
                                const d = utcDate(m.date);
                                return (
                                    <li key={i} className="ps-up__item">
                                        <span className="ps-up__date">
                                            <b>{d.day}</b>
                                            <span>{d.tag}</span>
                                        </span>
                                        <span className="ps-up__what">
                                            <b>{m.title}</b>
                                            <span>
                                                {m.time && <span className="ps-up__time">{fmtTime(m.time)}</span>}
                                                {m.time && (m.priest || m.venue) ? ' · ' : ''}
                                                {[m.priest, m.venue].filter(Boolean).join(' · ')}
                                            </span>
                                            {m.note && <em>{m.note}</em>}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}
