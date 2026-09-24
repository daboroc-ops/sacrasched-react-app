import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { StatusBadge, Loading, ErrorText, Empty } from '../../components/admin/AdminUI';
import { fmtTime, fmtDate } from '../../utils/format';
import { LITURGICAL_COLOUR, SHOW_IN_GRID, isoKey } from '../../utils/liturgical';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function AdminCalendar() {
    const axios = useAxiosPrivate();

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [cursor,  setCursor]  = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/calendar');
                if (alive) setData(res.data);
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Failed to load the calendar.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    /* ── Liturgical calendar for the month on screen ──────────
       Proxied through our API: calapi is HTTP-only and would be blocked as
       mixed content if the browser called it from an HTTPS page. */
    const [liturgical, setLiturgical] = useState({ available: false, days: {} });

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/liturgical', {
                    params: { year: cursor.getFullYear(), month: cursor.getMonth() + 1 }
                });
                if (alive) setLiturgical(res.data || { available: false, days: {} });
            } catch {
                // Never block the calendar on it
                if (alive) setLiturgical({ available: false, days: {} });
            }
        })();
        return () => { alive = false; };
    }, [axios, cursor]);

    /* Group every pending/approved service event by calendar day */
    const eventsByDay = useMemo(() => {
        const map = {};
        (data?.events || []).forEach(ev => {
            const d = new Date(ev.date);
            if (Number.isNaN(d.getTime())) return;
            (map[dayKey(d)] ||= []).push(ev);
        });
        Object.values(map).forEach(list => list.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
        return map;
    }, [data]);

    /* 6-week grid starting on the Sunday before the 1st */
    const cells = useMemo(() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const start = new Date(first);
        start.setDate(1 - first.getDay());
        return Array.from({ length: 42 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [cursor]);

    if (loading) return <Loading label="Loading calendar…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;

    const today  = new Date();
    const shift  = n => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));
    const inMonth = d => d.getMonth() === cursor.getMonth();

    /* Measured from midnight, so today is not itself past */
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isPast = d => d < startOfToday;

    const selectedEvents = selected ? (eventsByDay[dayKey(selected)] || []) : [];

    return (
        <div className="ad-grid ad-grid--calendar">
            <section className="ad-card">
                <header className="ad-card__head">
                    <h3>
                        {cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="ad-cal__nav">
                        <button className="ad-icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setCursor(() => {
                            const d = new Date(); d.setDate(1); return d;
                        })}>
                            Today
                        </button>
                        <button className="ad-icon-btn" onClick={() => shift(1)} aria-label="Next month">
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                </header>

                <div className="ad-cal">
                    {WEEKDAYS.map(d => <span className="ad-cal__dow" key={d}>{d}</span>)}

                    {cells.map(d => {
                        /* A day of the month before or after keeps its box so the
                           grid stays square, and carries nothing: it is not this
                           month's to show, and a number you can click would open a
                           day the grid is not displaying. */
                        if (!inMonth(d)) {
                            return <span className="ad-cal__day ad-cal__day--blank" key={d.toISOString()} aria-hidden="true" />;
                        }

                        const events = eventsByDay[dayKey(d)] || [];
                        const isToday = dayKey(d) === dayKey(today);
                        const isSel   = selected && dayKey(d) === dayKey(selected);
                        const lit     = liturgical.days[isoKey(d)];
                        return (
                            <button
                                key={d.toISOString()}
                                className={[
                                    'ad-cal__day',
                                    isPast(d) ? 'ad-cal__day--past' : '',
                                    isToday ? 'ad-cal__day--today' : '',
                                    isSel ? 'ad-cal__day--selected' : '',
                                ].join(' ')}
                                onClick={() => setSelected(d)}
                            >
                                <span className="ad-cal__num">
                                    {d.getDate()}
                                    {lit?.colour && (
                                        <i
                                            className="ad-cal__lit-dot"
                                            style={{ background: LITURGICAL_COLOUR[lit.colour] || lit.colour }}
                                            title={`${lit.title || lit.season} — ${lit.colour}`}
                                        />
                                    )}
                                </span>

                                {lit?.title && SHOW_IN_GRID.has(lit.rank) && (
                                    <span
                                        className={`ad-cal__lit ad-cal__lit--${(lit.rank || '').replace(/s+/g, '-').toLowerCase()}`}
                                        title={lit.title}
                                    >
                                        {lit.title}
                                    </span>
                                )}
                                {events.slice(0, 2).map((ev, i) => (
                                    <span className={`ad-cal__chip ad-cal__chip--${ev.kind}`} key={i}>
                                        {ev.time ? `${fmtTime(ev.time)} ` : ''}{ev.type}
                                    </span>
                                ))}
                                {events.length > 2 && (
                                    <span className="ad-cal__more">+{events.length - 2} more</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="ad-cal-side">
                <section className="ad-card">
                    <header className="ad-card__head">
                        <h3>{selected ? fmtDate(selected) : 'Pick a day'}</h3>
                    </header>

                    {/* What the Church is keeping that day, above the bookings */}
                    {selected && liturgical.days[isoKey(selected)] && (() => {
                        const lit = liturgical.days[isoKey(selected)];
                        return (
                            <div className="ad-lit">
                                <div className="ad-lit__head">
                                    <span
                                        className="ad-lit__swatch"
                                        style={{ background: LITURGICAL_COLOUR[lit.colour] || lit.colour }}
                                    />
                                    <span className="ad-lit__season">
                                        {lit.season}{lit.seasonWeek ? ` · week ${lit.seasonWeek}` : ''}
                                    </span>
                                </div>

                                {lit.title
                                    ? <p className="ad-lit__title">{lit.title}</p>
                                    : <p className="ad-lit__title ad-lit__title--plain">Ferial day</p>}
                                {lit.rank && <span className="ad-lit__rank">{lit.rank}</span>}

                                {lit.other.length > 0 && (
                                    <ul className="ad-lit__other">
                                        {lit.other.map((c, i) => (
                                            <li key={i}>
                                                <span
                                                    className="ad-lit__swatch ad-lit__swatch--sm"
                                                    style={{ background: LITURGICAL_COLOUR[c.colour] || c.colour }}
                                                />
                                                {c.title} <em>{c.rank}</em>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })()}
                    {!selected ? <Empty>Select a date to see its bookings.</Empty> :
                     selectedEvents.length === 0 ? <Empty>Nothing booked on this day.</Empty> : (
                        <ul className="ad-daylist">
                            {selectedEvents.map((ev, i) => (
                                <li key={i}>
                                    <span className="ad-daylist__time">{ev.time ? fmtTime(ev.time) : '—'}</span>
                                    <div className="ad-cell-stack">
                                        <b>{ev.type}</b>
                                        <span>{ev.name}</span>
                                    </div>
                                    <StatusBadge status={ev.status} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="ad-card">
                    <header className="ad-card__head"><h3>Mass schedule</h3></header>
                    {['weekdays', 'saturdays', 'sundays'].map(key => {
                        const times = data?.massSchedule?.[key] || [];
                        return (
                            <div className="ad-mass-block" key={key}>
                                <p className="ad-mass-block__title">{key}</p>
                                {times.length === 0 ? (
                                    <p className="ad-mass-block__empty">No times configured.</p>
                                ) : (
                                    <ul className="ad-mass-times">
                                        {times.map(t => (
                                            <li key={t.time}>
                                                <b>{fmtTime(t.time)}</b>
                                                {t.label && <span>{t.label}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </section>
            </div>
        </div>
    );
}
