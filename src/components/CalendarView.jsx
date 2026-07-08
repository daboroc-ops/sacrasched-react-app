import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

/* ── Colour map for event chips ─────────────────────────────── */
const COLORS = {
    'Mass':           { bg: '#fef3c7', text: '#92400e' },
    'Blessing':       { bg: '#fff1f2', text: '#9f1239' },
    'Wedding':        { bg: '#f5f3ff', text: '#4c1d95' },
    'Baptism':        { bg: '#eff6ff', text: '#1e3a8a' },
    'Confirmation':   { bg: '#fff7ed', text: '#9a3412' },
    'Funeral':        { bg: '#fafaf9', text: '#44403c' },
    'Mass Intention': { bg: '#f0fdfa', text: '#134e4a' },
    'Other':          { bg: '#f5f5f4', text: '#57534e' },
};
const colorFor = t => COLORS[t] || COLORS['Other'];

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function utcKey(isoOrDate) {
    const d = new Date(isoOrDate);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function cellKey(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function isPastKey(dateKey) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return dateKey < todayKey;
}

/* ── Day cell — shows total event count only ────────────────── */
function CalCell({ dayNum, isCurrentMonth, isToday, totalEvents, onClick }) {
    return (
        <div
            className={[
                'cal-cell',
                !isCurrentMonth && 'cal-cell--dim',
                isToday         && 'cal-cell--today',
                isCurrentMonth  && 'cal-cell--clickable'
            ].filter(Boolean).join(' ')}
            onClick={isCurrentMonth ? onClick : undefined}
        >
            <div className="cal-cell__num">{dayNum}</div>
            {totalEvents > 0 && (
                <div className="cal-cell__count">
                    <span className="cal-cell__count-num">{totalEvents}</span>
                    <span className="cal-cell__count-label">event{totalEvents !== 1 ? 's' : ''}</span>
                </div>
            )}
        </div>
    );
}

/* ── Day detail modal — 5 AM to 8 PM hourly slot grid ───────── */
function DayModal({ day, massSlots, blessEvents, intentionEvents, sacEvents, myEvents, onClose }) {
    /* Combine every event into one list with normalised shape */
    const allEvents = [
        ...massSlots.map(m => ({
            time:  m.time,
            type:  'Mass',
            label: m.label || 'Regular Mass',
            kind:  'mass'
        })),
        ...sacEvents.map(ev => ({
            time:  ev.preferredTime || '',
            type:  ev.sacramentType,
            label: ev.sacramentType,
            kind:  'service'
        })),
        ...blessEvents.map(ev => ({
            time:  ev.preferredTime || '',
            type:  'Blessing',
            label: ev.blessingType,
            kind:  'service'
        })),
        ...intentionEvents.map(ev => ({
            time:  ev.preferredTime || '',
            type:  'Mass Intention',
            label: ev.intentionType,
            kind:  'service'
        })),
        ...myEvents.map(ev => ({
            time:   ev.time,
            type:   ev.type,
            label:  ev.name,
            status: ev.status,
            kind:   'mine'
        }))
    ];

    /* Group by starting hour (5 AM – 8 PM = 5..20) */
    const slotMap = {};
    allEvents.forEach(ev => {
        if (!ev.time) return;
        const hour = parseInt(ev.time.split(':')[0], 10);
        if (hour < 5 || hour > 20) return;
        if (!slotMap[hour]) slotMap[hour] = [];
        slotMap[hour].push(ev);
    });

    const hours = [];
    for (let h = 5; h <= 20; h++) hours.push(h);

    return (
        <div className="modal is-open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal__box modal__box--lg">
                <div className="cal-day-header">
                    <h3 className="t-modal-title" style={{ margin: 0 }}>{day.label}</h3>
                    <button className="cal-day-header__close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="time-slots">
                    {hours.map(h => {
                        const slot = (slotMap[h] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                        const hourLabel = `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
                        return (
                            <div key={h} className={`time-slot${slot.length ? ' time-slot--filled' : ''}`}>
                                <div className="time-slot__hour">{hourLabel}</div>
                                <div className="time-slot__events">
                                    {slot.length === 0 ? (
                                        <span className="time-slot__empty">—</span>
                                    ) : slot.map((ev, i) => {
                                        const c = colorFor(ev.type);
                                        let badge = null;
                                        if (ev.kind === 'mass') {
                                            badge = <span className="badge badge--recurring">Recurring</span>;
                                        } else if (ev.kind === 'mine') {
                                            if (ev.status === 'approved')       badge = <span className="badge badge--approved">Approved</span>;
                                            else if (ev.status === 'completed') badge = <span className="badge badge--completed">Completed</span>;
                                            else                                badge = <span className="badge badge--pending">Pending</span>;
                                        }
                                        return (
                                            <div key={i} className="time-slot__event">
                                                <span className="time-slot__event-time">{fmtTime(ev.time)}</span>
                                                <span className="slot-row__type" style={{ background: c.bg, color: c.text }}>{ev.type}</span>
                                                <span className="time-slot__event-label">{ev.label}</span>
                                                {badge}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Main component ─────────────────────────────────────────── */
export default function CalendarView() {
    const axios = useAxiosPrivate();

    /* ── Inject JotForm AI agent chat widget ─────────────────── */
    useEffect(() => {
        const SRC = 'https://cdn.jotfor.ms/agent/embedjs/019dfcd2d4fc73cab42fc9d7f051841af52a/embed.js?autoOpenChatIn=1';
        if (document.querySelector(`script[src="${SRC}"]`)) return;

        const script = document.createElement('script');
        script.src   = SRC;
        script.async = true;
        document.body.appendChild(script);

        return () => {
            const existing = document.querySelector(`script[src="${SRC}"]`);
            if (existing) document.body.removeChild(existing);
            document.querySelectorAll('[id^="JotFormAgent"], [class*="jotform-agent"]')
                .forEach(el => el.remove());
        };
    }, []);

    const now   = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(null);

    const [massSchedule,     setMassSchedule]     = useState({ weekdays: [], saturdays: [], sundays: [] });
    const [sacEvents,        setSacEvents]         = useState([]); // approved/completed sacraments
    const [blessEvents,      setBlessEvents]       = useState([]); // approved/completed blessings
    const [intentionEvents,  setIntentionEvents]   = useState([]); // approved/completed mass intentions
    const [myEvents,         setMyEvents]          = useState([]); // user's own events
    const [loading,          setLoading]           = useState(true);

    /* Build lookup maps keyed by "YYYY-MM-DD" */
    const makeMap = (arr, getKey) => {
        const map = {};
        arr.forEach(ev => {
            const k = getKey(ev);
            if (!map[k]) map[k] = [];
            map[k].push(ev);
        });
        return map;
    };

    const sacMap       = makeMap(sacEvents,       ev => utcKey(ev.preferredDate));
    const blessMap     = makeMap(blessEvents,     ev => utcKey(ev.preferredDate));
    const intentionMap = makeMap(intentionEvents, ev => utcKey(ev.preferredDate));
    const myMap        = makeMap(myEvents,        ev => ev.dateKey);

    const getMassSlots = dow => {
        if (dow === 0) return massSchedule.sundays;
        if (dow === 6) return massSchedule.saturdays;
        return massSchedule.weekdays;
    };

    /* Fetch all data once on mount */
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const empty = () => ({ data: [] });
                const [msRes, sacRes, blessRes, intentionRes, myBlessRes, mySacRes] = await Promise.all([
                    axios.get('/user/mass-schedule').catch(() => ({ data: { weekdays: [], saturdays: [], sundays: [] } })),
                    axios.get('/sacrament/calendar').catch(empty),
                    axios.get('/blessing/calendar').catch(empty),
                    axios.get('/mass-intention/calendar').catch(empty),
                    axios.get('/blessing/my').catch(empty),
                    axios.get('/sacrament/my').catch(empty)
                ]);

                setMassSchedule(msRes.data);
                setSacEvents(sacRes.data       || []);
                setBlessEvents(blessRes.data   || []);
                setIntentionEvents(intentionRes.data || []);

                /* User's own events for "My Requests" section in the modal */
                const rollStatus = (status, dateKey) => {
                    if (status === 'rejected' || status === 'cancelled') return status;
                    return isPastKey(dateKey) ? 'completed' : status;
                };
                const own = [
                    ...(myBlessRes.data || []).map(b => {
                        const dk = utcKey(b.preferredDate);
                        return {
                            dateKey: dk,
                            time:    b.preferredTime || '',
                            type:    'Blessing',
                            name:    b.blessingFor || b.blessingType,
                            status:  rollStatus(b.status, dk)
                        };
                    }),
                    ...(mySacRes.data || []).map(s => {
                        const dk = utcKey(s.preferredDate);
                        return {
                            dateKey: dk,
                            time:    s.preferredTime || '',
                            type:    s.sacramentType,
                            name:    s.recipientName,
                            status:  rollStatus(s.status, dk)
                        };
                    })
                ];
                setMyEvents(own);
            } catch (err) {
                console.error('Calendar fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);  // eslint-disable-line

    /* Build the 42-cell grid */
    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays    = new Date(year, month, 0).getDate();
    const todayKey    = cellKey(now.getFullYear(), now.getMonth(), now.getDate());

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

        const key      = cellKey(cy, cm2, dn);
        const dow      = new Date(cy, cm2, dn).getDay();
        const masses   = getMassSlots(dow);
        const sacs     = sacMap[key]       || [];
        const bless    = blessMap[key]     || [];
        const intents  = intentionMap[key] || [];
        const mine     = myMap[key]        || [];

        const totalEvents = masses.length + sacs.length + bless.length + intents.length + mine.length;

        cells.push({ key, dn, cm, cy, cm2, dow, isToday: key === todayKey,
                     totalEvents, masses, sacs, bless, intents, mine });
    }

    const openDay = cell => {
        setSelectedDay({
            ...cell,
            label: `${DAY_NAMES[cell.dow]}, ${MONTH_NAMES[cell.cm2]} ${cell.dn}, ${cell.cy}`
        });
    };

    return (
        <div>
            {loading && <p className="loading-text">Loading calendar…</p>}

            <p className="cal-hint">
                <FontAwesomeIcon icon={faCircleInfo} className="cal-hint__icon" />
                Click a date to view the day's schedules.
            </p>

            <div className="cal-card">
                {/* Navigation */}
                <div className="cal-nav">
                    <div className="cal-nav__controls">
                        <button className="cal-nav__arrow" onClick={() => {
                            let m = month - 1, y = year;
                            if (m < 0) { m = 11; y--; }
                            setMonth(m); setYear(y);
                        }}><FontAwesomeIcon icon={faChevronLeft} /></button>
                        <button className="cal-nav__today" onClick={() => {
                            setYear(now.getFullYear()); setMonth(now.getMonth());
                        }}>Today</button>
                        <button className="cal-nav__arrow" onClick={() => {
                            let m = month + 1, y = year;
                            if (m > 11) { m = 0; y++; }
                            setMonth(m); setYear(y);
                        }}><FontAwesomeIcon icon={faChevronRight} /></button>
                    </div>
                    <span className="cal-nav__title">{MONTH_NAMES[month]} {year}</span>
                </div>

                {/* Weekday headers */}
                <div className="cal-weekdays">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d,i) => (
                        <div key={d} className={`cal-weekdays__cell${i===0||i===6?' cal-weekdays__cell--weekend':''}`}>{d}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className="cal-grid">
                    {cells.map(cell => (
                        <CalCell
                            key={cell.key}
                            dayNum={cell.dn}
                            isCurrentMonth={cell.cm}
                            isToday={cell.isToday}
                            totalEvents={cell.totalEvents}
                            onClick={() => openDay(cell)}
                        />
                    ))}
                </div>
            </div>

            {selectedDay && (
                <DayModal
                    day={selectedDay}
                    massSlots={selectedDay.masses}
                    sacEvents={selectedDay.sacs}
                    blessEvents={selectedDay.bless}
                    intentionEvents={selectedDay.intents}
                    myEvents={selectedDay.mine}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </div>
    );
}
