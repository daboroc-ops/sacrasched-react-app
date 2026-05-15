import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
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

/* ── Day cell ───────────────────────────────────────────────── */
function CalCell({ dayNum, isCurrentMonth, isToday, chips, onClick }) {
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
            {chips.length > 0 && (
                <div className="cal-cell__events">
                    {chips.slice(0, 2).map((c, i) => {
                        const col = colorFor(c.type);
                        return (
                            <div key={i} className="cal-cell__event"
                                style={{ background: col.bg, color: col.text }}>
                                {c.label}
                            </div>
                        );
                    })}
                    {chips.length > 2 && (
                        <div className="cal-cell__more">+{chips.length - 2} more</div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Day detail modal ───────────────────────────────────────── */
function DayModal({ day, massSlots, myEvents, sacEvents, onClose }) {
    return (
        <div className="modal is-open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal__box modal__box--lg">
                <div className="cal-day-header">
                    <h3 className="t-modal-title" style={{ margin: 0 }}>{day.label}</h3>
                </div>

                {/* Mass schedule */}
                {massSlots.length > 0 && (
                    <>
                        <p className="section-label">Mass Schedule</p>
                        <div className="slot-list" style={{ marginBottom: '1rem' }}>
                            {massSlots.map((m, i) => {
                                const c = colorFor('Mass');
                                return (
                                    <div key={i} className="slot-row">
                                        <span className="slot-row__time">{fmtTime(m.time)}</span>
                                        <span className="slot-row__type" style={{ background: c.bg, color: c.text }}>Mass</span>
                                        <span className="slot-row__label">{m.label || 'Regular Mass'}</span>
                                        <span className="badge badge--recurring">Recurring</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Booked sacraments (anonymised) */}
                {sacEvents.length > 0 && (
                    <>
                        <p className="section-label">Booked Sacraments</p>
                        <div className="slot-list" style={{ marginBottom: '1rem' }}>
                            {[...sacEvents].sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map((ev, i) => {
                                const c = colorFor(ev.sacramentType);
                                return (
                                    <div key={i} className="slot-row">
                                        <span className="slot-row__time">{fmtTime(ev.preferredTime)}</span>
                                        <span className="slot-row__type" style={{ background: c.bg, color: c.text }}>{ev.sacramentType}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* User's own events */}
                {myEvents.length > 0 && (
                    <>
                        <p className="section-label">My Requests</p>
                        <div className="slot-list" style={{ marginBottom: '1rem' }}>
                            {[...myEvents].sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map((ev, i) => {
                                const c = colorFor(ev.type);
                                const bdg = ev.status === 'approved'
                                    ? <span className="badge badge--approved">Approved</span>
                                    : <span className="badge badge--pending">Pending</span>;
                                return (
                                    <div key={i} className="slot-row">
                                        <span className="slot-row__time">{fmtTime(ev.time)}</span>
                                        <span className="slot-row__type" style={{ background: c.bg, color: c.text }}>{ev.type}</span>
                                        <span className="slot-row__label" style={{ flex: 1 }}>{ev.name}</span>
                                        <div className="slot-row__actions">{bdg}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {massSlots.length === 0 && sacEvents.length === 0 && myEvents.length === 0 && (
                    <div className="slot-list--empty"><p>Nothing scheduled for this day.</p></div>
                )}

                <div className="modal__actions">
                    <button className="btn btn--ghost" onClick={onClose}>Close</button>
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
        const script = document.createElement('script');
        script.src   = 'https://cdn.jotfor.ms/agent/embedjs/019dfcd2d4fc73cab42fc9d7f051841af52a/embed.js?autoOpenChatIn=1';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            // Remove the script tag when leaving the Calendar tab
            document.body.removeChild(script);
            // Also remove the widget iframe/container that JotForm injects
            document.querySelectorAll('[id^="JotFormAgent"], [class*="jotform-agent"]')
                .forEach(el => el.remove());
        };
    }, []);

    const now   = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(null);

    const [massSchedule, setMassSchedule] = useState({ weekdays: [], saturdays: [], sundays: [] });
    const [sacEvents,    setSacEvents]    = useState([]); // { preferredDate, preferredTime, sacramentType }
    const [myEvents,     setMyEvents]     = useState([]); // user's own events { dateKey, time, type, name, status }
    const [loading,      setLoading]      = useState(true);

    /* Build service-event map keyed by "YYYY-MM-DD" */
    const sacMap = {};
    sacEvents.forEach(ev => {
        const k = utcKey(ev.preferredDate);
        if (!sacMap[k]) sacMap[k] = [];
        sacMap[k].push(ev);
    });
    const myMap = {};
    myEvents.forEach(ev => {
        const k = ev.dateKey;
        if (!myMap[k]) myMap[k] = [];
        myMap[k].push(ev);
    });

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
                const [msRes, sacRes, blessRes, sacrRes] = await Promise.all([
                    axios.get('/user/mass-schedule'),
                    axios.get('/sacrament/calendar'),          // anonymised sacraments
                    axios.get('/blessing/my').catch(() => ({ data: [] })),
                    axios.get('/sacrament/my').catch(() => ({ data: [] }))
                ]);

                setMassSchedule(msRes.data);
                setSacEvents(sacRes.data || []);

                /* Combine user's own blessings + sacraments into myEvents */
                const own = [
                    ...(blessRes.data || []).map(b => ({
                        dateKey: utcKey(b.preferredDate),
                        time:    b.preferredTime || '',
                        type:    'Blessing',
                        name:    b.blessingFor || b.blessingType,
                        status:  b.status
                    })),
                    ...(sacrRes.data || []).map(s => ({
                        dateKey: utcKey(s.preferredDate),
                        time:    s.preferredTime || '',
                        type:    s.sacramentType,
                        name:    s.recipientName,
                        status:  s.status
                    }))
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

        const key     = cellKey(cy, cm2, dn);
        const dow     = new Date(cy, cm2, dn).getDay();
        const masses  = getMassSlots(dow);
        const sacs    = sacMap[key] || [];
        const mine    = myMap[key]  || [];

        const chips = [
            ...masses.map(() => ({ type: 'Mass', label: 'Mass' })),
            ...sacs.map(s  => ({ type: s.sacramentType, label: s.sacramentType })),
            ...mine.map(m  => ({ type: m.type,          label: m.type }))
        ];

        cells.push({ key, dn, cm, cy, cm2, dow, isToday: key === todayKey, chips, masses, sacs, mine });
    }

    const openDay = cell => {
        const d = new Date(cell.cy, cell.cm2, cell.dn);
        setSelectedDay({
            ...cell,
            label: `${DAY_NAMES[cell.dow]}, ${MONTH_NAMES[cell.cm2]} ${cell.dn}, ${cell.cy}`
        });
    };

    return (
        <div>
            {loading && <p className="loading-text">Loading calendar…</p>}

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
                    <div className="cal-legend">
                        {[['#c9a96e','Mass'],['#fb7185','Blessing'],['#7c3aed','Wedding'],['#3b82f6','Baptism'],['#78716c','Funeral']].map(([c,l])=>(
                            <span key={l} className="cal-legend__item">
                                <span className="cal-legend__dot" style={{ background: c }} />{l}
                            </span>
                        ))}
                    </div>
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
                            chips={cell.chips}
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
                    myEvents={selectedDay.mine}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </div>
    );
}
