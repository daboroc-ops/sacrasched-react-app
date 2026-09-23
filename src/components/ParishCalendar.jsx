import { useState, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCircleInfo, faCalendarPlus, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import { isoKey, colourOf, colourName, seasonLabel, celebrationLabel } from '../utils/liturgical';
import { CalendarSkeleton } from './Skeleton';
import ServiceCard from './ServiceCard';
import { SERVICES } from '../utils/services';
import useSiteContent from '../hooks/useSiteContent';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return t;
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** ScheduledMass dates are stored at UTC midnight; read them back the same way. */
function utcKey(isoOrDate) {
    const d = new Date(isoOrDate);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function cellKey(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function todayKey() {
    const t = new Date();
    return cellKey(t.getFullYear(), t.getMonth(), t.getDate());
}

const isPastKey = key => key < todayKey();

const fmtShort = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return t;
    return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'a' : 'p'}`;
};

/* How many events a cell shows before folding the rest into "+N" */
const CELL_SHOW = 2;

/* ── Day cell — the date and what is on: a scheduled Mass, a booked
   sacrament (what, never who), a parish activity. The full list, on the
   half-hour grid, is one click away.
   A cell outside this month keeps its box so the grid stays square, but
   loses its number: it belongs to a month this page is not showing, and
   a date you cannot click only invites the attempt. */
function CalCell({ dayNum, isCurrentMonth, isToday, isPast, events = [], onClick }) {
    const shown = events.slice(0, CELL_SHOW);
    const more  = events.length - shown.length;
    return (
        <div
            className={[
                'cal-cell',
                !isCurrentMonth && 'cal-cell--dim',
                isPast          && 'cal-cell--past',
                isToday         && 'cal-cell--today',
                isCurrentMonth  && 'cal-cell--clickable'
            ].filter(Boolean).join(' ')}
            onClick={isCurrentMonth ? onClick : undefined}
            title={isToday ? 'Today' : undefined}
        >
            {isCurrentMonth && (
                <div className="cal-cell__top">
                    <div className="cal-cell__num">{dayNum}</div>
                    {isToday && <span className="cal-cell__today">Today</span>}
                </div>
            )}
            {isCurrentMonth && events.length > 0 && (
                <>
                    <ul className="cal-cell__evs" aria-label="Scheduled">
                        {shown.map((e, i) => (
                            <li key={i} className={`cal-cell__ev pc-ev--${e.kind}`} title={`${e.time ? fmtShort(e.time) + ' ' : ''}${e.title}`}>
                                {e.time && <b>{fmtShort(e.time)}</b>}<span>{e.title}</span>
                            </li>
                        ))}
                        {more > 0 && <li className="cal-cell__more">+{more} more</li>}
                    </ul>
                    {/* On a phone the chips give way to dots, one per kind */}
                    <span className="cal-cell__dots" aria-hidden="true">
                        {[...new Set(events.map(e => e.kind))].map(k => <i key={k} className={`cal-cell__dot pc-dot--${k}`} />)}
                    </span>
                </>
            )}
        </div>
    );
}

/* ── Pick a service for the day already chosen ─────────────────
   All four can be asked for without an account. The email address is
   confirmed before anything is filed, and that address plus the reference
   is what opens the request again later — so the parish still has a person
   it can reach and a record it can tie together over time. */
function ServicePick({ slots, onPick }) {
    return (
        <div className="pc-pick">
            <p className="pc-pick__lede">Which of these do you need?</p>

            <div className="bk-picker pc-pick__grid">
                {SERVICES.map((s, i) => (
                    <ServiceCard
                        key={s.id}
                        service={s}
                        art={slots[s.slot]}
                        as="button"
                        type="button"
                        onClick={() => onPick(s.id)}
                        style={{ animationDelay: `${i * 55}ms` }}
                    />
                ))}
            </div>

            <p className="pc-pick__note">No account needed — your reference comes by text.</p>
        </div>
    );
}

/* ── The chosen day, every half hour ────────────────────────────
   What is booked in the church that day — the weddings, baptisms and
   confirmations, the funeral and wake Masses — on a half-hour grid, as the
   office asked. The regular Mass times are not repeated here: the parish
   asked for a calendar of celebrations, and the schedule above lists the
   week. Nothing here names anybody.

   Takes the calendar's place in the section rather than floating over a
   dimmed page: it is the next step of the same task, not an interruption
   of it. */
function DayPanel({ day, events, lit, slots, onClose, onBook }) {
    const [picking, setPicking] = useState(false);

    /* Half-hour rows from 5:00 AM to 8:00 PM. An event lands in the row its
       time falls in; one with no time is listed above the grid. */
    const rows = [];
    for (let h = 5; h <= 20; h++) for (const m of [0, 30]) rows.push(`${String(h).padStart(2, '0')}:${m ? '30' : '00'}`);
    const untimed = events.filter(e => !e.time);
    const inRow = row => events.filter(e => {
        if (!e.time) return false;
        const [h, m] = String(e.time).split(':').map(Number);
        const [rh, rm] = row.split(':').map(Number);
        const t = h * 60 + (m || 0), r = rh * 60 + rm;
        return t >= r && t < r + 30;
    });

    /* Only the part of the day with anything in it, so an empty morning
       does not push the one wedding below the fold. */
    const busyRows = rows.filter(r => inRow(r).length);
    const first = busyRows[0], last = busyRows[busyRows.length - 1];
    const shown = first ? rows.slice(Math.max(0, rows.indexOf(first) - 1), rows.indexOf(last) + 2) : [];

    /* ── Jump to what is off screen ────────────────────────────
       The grid scrolls inside the card, so the page stays put. It can run
       from the first Mass to the last, and a wedding at one o'clock is
       easily below its fold; every timed thing not in view right now gets
       a small button that scrolls the grid — never the page — to its row,
       pointing down or up to where it is. */
    const gridRef = useRef(null);
    const rowRefs = useRef({});
    const [offscreen, setOffscreen] = useState([]);
    const [flash, setFlash] = useState('');

    useEffect(() => {
        if (picking) return undefined;
        const grid = gridRef.current;
        const measure = () => {
            if (!grid) return;
            const c = grid.getBoundingClientRect();
            if (!c.height) return;          // not laid out yet — nothing to say
            const list = [];
            for (const row of busyRows) {
                const el = rowRefs.current[row];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                // Off the grid's own window, not the browser's
                const dir = r.bottom < c.top + 8 ? 'up' : r.top > c.bottom - 8 ? 'down' : '';
                if (dir) inRow(row).forEach(e => list.push({ row, dir, time: e.time, title: e.title }));
            }
            setOffscreen(prev => (prev.map(x => x.row + x.dir + x.time).join() === list.map(x => x.row + x.dir + x.time).join() ? prev : list));
        };
        // First reading once layout has settled. After that the buttons are
        // only redrawn once the scrolling has come to rest — a list that
        // changes under the thumb mid-scroll is noise — and each new one
        // fades in (see .pc-jump__btn).
        let t = setTimeout(measure, 0);
        const settled = () => { clearTimeout(t); t = setTimeout(measure, 160); };
        grid?.addEventListener('scroll', settled, { passive: true });
        window.addEventListener('resize', settled);
        return () => {
            clearTimeout(t);
            grid?.removeEventListener('scroll', settled);
            window.removeEventListener('resize', settled);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- busyRows/inRow are derived from `events` each render
    }, [events, picking]);

    const jumpTo = row => {
        const el = rowRefs.current[row], grid = gridRef.current;
        if (!el || !grid) return;
        // Scroll the grid itself, centring the row — scrollIntoView would
        // also drag the page, and the page is to stay where it is.
        grid.scrollTo({ top: el.offsetTop - grid.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
        setFlash(row);
        setTimeout(() => setFlash(f => (f === row ? '' : f)), 1600);
    };

    return (
        <div className="pc-day">
            <div className="pc-day__bar">
                <button type="button" className="pb__back" onClick={picking ? () => setPicking(false) : onClose}>
                    <FontAwesomeIcon icon={faChevronLeft} /> {picking ? 'Back to the day' : 'Back to the calendar'}
                </button>

                {/* A past day cannot be booked, so it offers nothing. On a
                    day with nothing on, the button stands under the notice
                    in the middle of the card instead of up here. */}
                {!isPastKey(day.key) && !picking && events.length > 0 && (
                    <button type="button" className="cal-day-header__book" onClick={() => setPicking(true)}>
                        <FontAwesomeIcon icon={faCalendarPlus} />
                        Book Now
                    </button>
                )}
            </div>

            <div className="pc-day__card">
                <h3 className="pc-day__title">{day.label}</h3>

                {picking ? (
                    <ServicePick
                        slots={slots}
                        onPick={service => onBook(day.key, service)}
                    />
                ) : (
                    <>
                        {lit && (
                            <div className="pc-lit">
                                <i className="pc-lit__swatch" style={{ background: colourOf(lit.colour) }} />
                                <b>{celebrationLabel(lit)}</b>
                                <em>{seasonLabel(lit)}{lit.colour ? ` · ${colourName(lit.colour)}` : ''}</em>
                            </div>
                        )}

                        {untimed.map((e, i) => (
                            <p key={i} className="pc-day__untimed">
                                <b>{e.title}</b>{e.note ? <em> — {e.note}</em> : null}
                            </p>
                        ))}

                        {events.length === 0 ? (
                            <div className="pc-day__free">
                                <p className="pc-day__empty">Nothing is scheduled in the church this day.</p>
                                {!isPastKey(day.key) && (
                                    <button type="button" className="cal-day-header__book" onClick={() => setPicking(true)}>
                                        <FontAwesomeIcon icon={faCalendarPlus} />
                                        Book Now
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="time-slots pc-day__grid" ref={gridRef}>
                                {shown.map(row => {
                                    const here = inRow(row);
                                    return (
                                        <div key={row}
                                             ref={el => { rowRefs.current[row] = el; }}
                                             className={`time-slot${here.length ? ' time-slot--filled' : ''}${flash === row ? ' time-slot--flash' : ''}`}>
                                            <div className="time-slot__hour">{fmtTime(row)}</div>
                                            <div className="time-slot__events">
                                                {here.length === 0 ? (
                                                    <span className="time-slot__empty">—</span>
                                                ) : here.map((e, i) => (
                                                    <div key={i} className={`time-slot__event time-slot__event--${e.kind}`}>
                                                        <span className="time-slot__event-time">{fmtTime(e.time)}</span>
                                                        <span className="time-slot__event-label">
                                                            {e.title}{e.venue ? ` — ${e.venue}` : ''}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Its own row under the grid: what is scrolled out of view */}
                        {offscreen.length > 0 && (
                            <div className="pc-jump" aria-label="Scroll to">
                                {offscreen.slice(0, 3).map((e, i) => (
                                    /* Keyed by what and where, so a button that
                                       changes is a new one and fades in afresh */
                                    <button key={`${e.row}-${e.dir}-${e.title}`} type="button" className="pc-jump__btn"
                                            style={{ animationDelay: `${i * 60}ms` }} onClick={() => jumpTo(e.row)}>
                                        <FontAwesomeIcon icon={e.dir === 'up' ? faArrowUp : faArrowDown} className="pc-jump__arrow" />
                                        <span>{e.title}</span>
                                    </button>
                                ))}
                                {offscreen.length > 3 && <span className="pc-jump__more">+{offscreen.length - 3} more</span>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * The parish's Mass calendar, on its public website.
 *
 * Built to be the same calendar a signed-in devotee sees on their dashboard —
 * same card, same month grid, same hour-by-hour day — so the site and the dashboard
 * read as one product.
 *
 * It is also the way in to booking: pick the day first, then the service, and
 * the date carries into the form rather than being asked for twice.
 *
 * What it does NOT carry is bookings. Blessings, sacraments, document requests
 * and Mass intentions all name somebody, and the API behind this deliberately
 * does not serve them. A visitor sees the Mass times and the Church calendar;
 * their own requests appear once they sign in.
 */
export default function ParishCalendar({ onBook, onUnavailable, subdomain }) {
    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(null);

    const [data,    setData]    = useState(null);
    const [lit,     setLit]     = useState({ days: {} });
    const [loading, setLoading] = useState(true);
    const [failed,  setFailed]  = useState(false);

    /* Photos a parish published to the service slots, shared with the
       devotee's own picker so the two never drift apart. */
    const { slots } = useSiteContent();

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await axiosPublic.get('/site/events', { params: { year, month: month + 1, subdomain } });
                if (alive) { setData(res.data); setFailed(false); }
            } catch {
                if (alive) { setData(null); setFailed(true); onUnavailable?.(); }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [year, month, subdomain, onUnavailable]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.get('/site/liturgical', { params: { year, month: month + 1 } });
                if (alive) setLit(res.data || { days: {} });
            } catch {
                // Decoration — the calendar is complete without it
                if (alive) setLit({ days: {} });
            }
        })();
        return () => { alive = false; };
    }, [year, month]);

    /* What the parish has on, keyed by the day it falls on. Dates are
       stored at UTC midnight, so they are read back the same way. */
    const eventsByDay = useMemo(() => {
        const map = {};
        (data?.events || []).forEach(e => { (map[utcKey(e.date)] ||= []).push(e); });
        Object.values(map).forEach(list => list.sort((a, b) => String(a.time).localeCompare(String(b.time))));
        return map;
    }, [data]);

    /* No parish on this host, or the feed is down — the section that owns
       this takes itself off the page rather than heading an empty space. */
    if (failed) return null;
    if (loading) return <CalendarSkeleton />;

    /* 42-cell grid, six weeks from the Sunday on or before the 1st */
    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays    = new Date(year, month, 0).getDate();
    const today       = todayKey();

    const cells = [];
    for (let i = 0; i < 42; i++) {
        let dn, cm, cy, cm2;
        if (i < firstDow) {
            dn = prevDays - firstDow + i + 1; cm = false;
            const pd = new Date(year, month - 1, dn);
            cy = pd.getFullYear(); cm2 = pd.getMonth();
        } else if (i < firstDow + daysInMonth) {
            dn = i - firstDow + 1; cm = true; cy = year; cm2 = month;
        } else {
            dn = i - firstDow - daysInMonth + 1; cm = false;
            const nd = new Date(year, month + 1, dn);
            cy = nd.getFullYear(); cm2 = nd.getMonth();
        }

        const key    = cellKey(cy, cm2, dn);
        const dow    = new Date(cy, cm2, dn).getDay();
        const events = eventsByDay[key] || [];

        cells.push({ key, dn, cm, cy, cm2, dow, isToday: key === today, isPast: key < today, events });
    }

    /* Six weeks always covers a month, but most months do not need the sixth.
       Now that the days outside the month are blank, keeping it would leave a
       whole empty row hanging under the grid. */
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const shown = weeks.filter(w => w.some(c => c.cm)).flat();

    const openDay = cell => setSelectedDay({
        ...cell,
        label: `${DAY_NAMES[cell.dow]}, ${MONTH_NAMES[cell.cm2]} ${cell.dn}, ${cell.cy}`
    });

    const todayLit = lit.days?.[isoKey(now)];

    /* The day takes the section over rather than floating above it. */
    if (selectedDay) return (
        <DayPanel
            day={selectedDay}
            events={selectedDay.events}
            lit={lit.days?.[selectedDay.key]}
            slots={slots}
            onClose={() => setSelectedDay(null)}
            onBook={(date, service) => { setSelectedDay(null); onBook?.(date, service); }}
        />
    );

    return (
        <div className="pc-month">
            {todayLit && (
                <div className="lit-strip">
                    <span className="lit-strip__season">{seasonLabel(todayLit)}</span>
                    <span className="lit-strip__title">{celebrationLabel(todayLit)}</span>
                    <span className="lit-strip__colour">
                        {colourName(todayLit.colour)}
                        <i className="lit-strip__swatch" style={{ background: colourOf(todayLit.colour) }} />
                    </span>
                </div>
            )}

            <p className="cal-hint">
                <FontAwesomeIcon icon={faCircleInfo} className="cal-hint__icon" />
                Click a date to see what is on — or to book that day.
            </p>

            <div className="cal-card">
                <div className="cal-nav">
                    <div className="cal-nav__controls">
                        <button className="cal-nav__arrow" aria-label="Previous month" onClick={() => {
                            let m = month - 1, y = year;
                            if (m < 0) { m = 11; y--; }
                            setMonth(m); setYear(y);
                        }}><FontAwesomeIcon icon={faChevronLeft} /></button>
                        <button className="cal-nav__today" onClick={() => {
                            setYear(now.getFullYear()); setMonth(now.getMonth());
                        }}>Today</button>
                        <button className="cal-nav__arrow" aria-label="Next month" onClick={() => {
                            let m = month + 1, y = year;
                            if (m > 11) { m = 0; y++; }
                            setMonth(m); setYear(y);
                        }}><FontAwesomeIcon icon={faChevronRight} /></button>
                    </div>
                    <span className="cal-nav__title">{MONTH_NAMES[month]} {year}</span>
                </div>

                <div className="cal-weekdays">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
                        <div key={d} className={`cal-weekdays__cell${i === 0 || i === 6 ? ' cal-weekdays__cell--weekend' : ''}`}>{d}</div>
                    ))}
                </div>

                <div className="cal-grid">
                    {shown.map(cell => (
                        <CalCell
                            key={cell.key}
                            dayNum={cell.dn}
                            isCurrentMonth={cell.cm}
                            isToday={cell.isToday}
                            isPast={cell.isPast}
                            events={cell.events}
                            onClick={() => openDay(cell)}
                        />
                    ))}
                </div>
            </div>

        </div>
    );
}
