import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faMugHot } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { StatusBadge, Loading, ErrorText, Empty } from '../../components/admin/AdminUI';
import { fmtTime, fmtDate } from '../../utils/format';
import { LITURGICAL_COLOUR, SHOW_IN_GRID, isoKey } from '../../utils/liturgical';

const WEEKDAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KIND_LABEL = { mass: 'Mass', sacrament: 'Sacrament', occasional: 'Occasional Mass', blessing: 'Blessing' };

/* A list shows this many at first; "View More" shows the rest */
const FIRST = 5;

/** The button under a list cut at FIRST: shows the rest, or folds them away again. */
function MoreButton({ total, open, onToggle }) {
    if (total <= FIRST) return null;
    return (
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm pr-more" onClick={onToggle} aria-expanded={open}>
            {open ? 'View Less' : `View More (${total - FIRST})`}
        </button>
    );
}

const pad = n => String(n).padStart(2, '0');
/* A grid cell is a local day; an event's day is stored at UTC midnight */
const localKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const eventKey = date => new Date(date).toISOString().slice(0, 10);
const parseDay = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

/**
 * The priest's month: every Mass he presides at on the weekly schedule, the
 * specific Masses given to him, and the sacraments, occasional Masses and
 * blessings that are his — with his days off marked. Read-only.
 */
export default function PriestCalendar() {
    const axios = useAxiosPrivate();
    const [params, setParams] = useSearchParams();

    // A notification opens its day: /priest?date=2026-10-03
    const linked = parseDay(params.get('date'));
    const [cursor,   setCursor]   = useState(() => { const d = linked ? new Date(linked) : new Date(); d.setDate(1); return d; });
    const [selected, setSelected] = useState(() => linked || new Date());

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [upcoming, setUpcoming] = useState([]);
    const [liturgical, setLiturgical] = useState({ available: false, days: {} });
    const [weekOpen, setWeekOpen] = useState(false);
    const [dayOpen,  setDayOpen]  = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/priest-api/calendar', {
                    params: { year: cursor.getFullYear(), month: cursor.getMonth() + 1 }
                });
                if (alive) { setData(res.data); setError(''); }
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Could not load your calendar.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, cursor]);

    useEffect(() => {
        let alive = true;
        axios.get('/priest-api/upcoming', { params: { days: 7 } })
            .then(res => { if (alive) setUpcoming(res.data.events || []); })
            .catch(() => { if (alive) setUpcoming([]); });
        return () => { alive = false; };
    }, [axios]);

    useEffect(() => {
        let alive = true;
        axios.get('/priest-api/liturgical', { params: { year: cursor.getFullYear(), month: cursor.getMonth() + 1 } })
            .then(res => { if (alive) setLiturgical(res.data || { available: false, days: {} }); })
            .catch(() => { if (alive) setLiturgical({ available: false, days: {} }); });
        return () => { alive = false; };
    }, [axios, cursor]);

    const byDay = useMemo(() => {
        const map = {};
        (data?.events || []).forEach(ev => { (map[eventKey(ev.date)] ||= []).push(ev); });
        return map;
    }, [data]);

    const cells = useMemo(() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const start = new Date(first);
        start.setDate(1 - first.getDay());
        return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }, [cursor]);

    if (loading) return <Loading label="Loading your calendar…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;

    const daysOff = data?.daysOff || [];
    const today   = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const shift = n => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));
    const pick  = d => { setSelected(d); setDayOpen(false); if (params.get('date')) setParams({}, { replace: true }); };

    const monthCount = (data?.events || []).length;
    const selectedEvents = selected ? (byDay[localKey(selected)] || []) : [];
    const selectedLit = selected && liturgical.days[isoKey(selected)];

    return (
        <>
            {/* The week ahead, first — what a priest opens this for */}
            <section className="ad-card pr-week">
                <header className="ad-card__head">
                    <h3>This week</h3>
                    <span className="ad-card__meta">
                        {daysOff.length
                            ? <><FontAwesomeIcon icon={faMugHot} /> Off on {daysOff.map(d => `${DAY_NAMES[d]}s`).join(', ')}</>
                            : 'No regular day off'}
                    </span>
                </header>
                {upcoming.length === 0 ? <Empty>Nothing assigned to you in the next seven days.</Empty> : (
                    <>
                    <ul className="pr-agenda">
                        {(weekOpen ? upcoming : upcoming.slice(0, FIRST)).map((ev, i) => (
                            <li key={`${ev.id || ev.time}-${i}`} className={`pr-agenda__item pr-agenda__item--${ev.kind}`}>
                                <span className="pr-agenda__when">
                                    <b>{new Date(ev.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}</b>
                                    <span>{ev.time ? fmtTime(ev.time) : '—'}</span>
                                </span>
                                <span className="ad-cell-stack">
                                    <b>{ev.type}</b>
                                    <span>{[ev.name, ev.venue].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span className={`pr-kind pr-kind--${ev.kind}`}>{KIND_LABEL[ev.kind]}</span>
                            </li>
                        ))}
                    </ul>
                    <MoreButton total={upcoming.length} open={weekOpen} onToggle={() => setWeekOpen(o => !o)} />
                    </>
                )}
            </section>

            <div className="ad-grid ad-grid--calendar">
                <section className="ad-card">
                    <header className="ad-card__head">
                        <h3>{cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</h3>
                        <span className="ad-card__meta">{monthCount} celebration{monthCount === 1 ? '' : 's'}</span>
                        <div className="ad-cal__nav">
                            <button className="ad-icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => {
                                const d = new Date(); d.setDate(1); setCursor(d); pick(new Date());
                            }}>
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
                            if (d.getMonth() !== cursor.getMonth()) {
                                return <span className="ad-cal__day ad-cal__day--blank" key={d.toISOString()} aria-hidden="true" />;
                            }
                            const events = byDay[localKey(d)] || [];
                            const off    = daysOff.includes(d.getDay());
                            const lit    = liturgical.days[isoKey(d)];
                            return (
                                <button
                                    key={d.toISOString()}
                                    className={[
                                        'ad-cal__day',
                                        d < startOfToday ? 'ad-cal__day--past' : '',
                                        localKey(d) === localKey(today) ? 'ad-cal__day--today' : '',
                                        selected && localKey(d) === localKey(selected) ? 'ad-cal__day--selected' : '',
                                        off ? 'pr-cal__day--off' : '',
                                    ].join(' ')}
                                    onClick={() => pick(d)}
                                    title={off ? 'Your day off' : undefined}
                                >
                                    <span className="ad-cal__num">
                                        {d.getDate()}
                                        {lit?.colour && (
                                            <i className="ad-cal__lit-dot"
                                               style={{ background: LITURGICAL_COLOUR[lit.colour] || lit.colour }}
                                               title={`${lit.title || lit.season} — ${lit.colour}`} />
                                        )}
                                    </span>
                                    {off && <span className="pr-cal__off">Day off</span>}
                                    {lit?.title && SHOW_IN_GRID.has(lit.rank) && (
                                        <span className="ad-cal__lit" title={lit.title}>{lit.title}</span>
                                    )}
                                    {events.slice(0, 2).map((ev, i) => (
                                        <span className={`ad-cal__chip ad-cal__chip--${ev.kind}`} key={i}>
                                            {ev.time ? `${fmtTime(ev.time)} ` : ''}{ev.type}
                                        </span>
                                    ))}
                                    {events.length > 2 && <span className="ad-cal__more">+{events.length - 2} more</span>}
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

                        {selectedLit && (
                            <div className="ad-lit">
                                <div className="ad-lit__head">
                                    <span className="ad-lit__swatch" style={{ background: LITURGICAL_COLOUR[selectedLit.colour] || selectedLit.colour }} />
                                    <span className="ad-lit__season">
                                        {selectedLit.season}{selectedLit.seasonWeek ? ` · week ${selectedLit.seasonWeek}` : ''}
                                    </span>
                                </div>
                                {selectedLit.title
                                    ? <p className="ad-lit__title">{selectedLit.title}</p>
                                    : <p className="ad-lit__title ad-lit__title--plain">Ferial day</p>}
                            </div>
                        )}

                        {selected && daysOff.includes(selected.getDay()) && (
                            <p className="pr-offnote"><FontAwesomeIcon icon={faMugHot} /> Your day off.</p>
                        )}

                        {!selected ? <Empty>Select a date to see what you preside at.</Empty> :
                         selectedEvents.length === 0 ? <Empty>Nothing assigned to you on this day.</Empty> : (
                            <>
                            <ul className="ad-daylist">
                                {(dayOpen ? selectedEvents : selectedEvents.slice(0, FIRST)).map((ev, i) => (
                                    <li key={i}>
                                        <span className="ad-daylist__time">{ev.time ? fmtTime(ev.time) : '—'}</span>
                                        <div className="ad-cell-stack">
                                            <b>{ev.type}</b>
                                            <span>{[ev.name, ev.venue].filter(Boolean).join(' · ')}</span>
                                            <span className={`pr-kind pr-kind--${ev.kind}`}>{KIND_LABEL[ev.kind]}</span>
                                        </div>
                                        {ev.kind !== 'mass' && <StatusBadge status={ev.status} />}
                                    </li>
                                ))}
                            </ul>
                            <MoreButton total={selectedEvents.length} open={dayOpen} onToggle={() => setDayOpen(o => !o)} />
                            </>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
