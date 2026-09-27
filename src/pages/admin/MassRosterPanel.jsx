import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faShuffle } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import { Banner, Loading, Empty } from '../../components/admin/AdminUI';
import PriestSelect from '../../components/admin/PriestSelect';
import { fmtDate, fmtTime } from '../../utils/format';

const pad = n => String(n).padStart(2, '0');
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const shiftMonth = (m, n) => {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthLabel = m => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
};
/* A roster day is stored at UTC midnight */
const utcDay = date => new Date(date).toISOString().slice(0, 10);
const utcDow = date => new Date(date).getUTCDay();
/* The Sunday a day's week starts on, "YYYY-MM-DD" */
const weekOf = date => {
    const d = new Date(date);
    return new Date(d.getTime() - d.getUTCDay() * 86400000).toISOString().slice(0, 10);
};
const shortDay = (date, opts) => new Date(date).toLocaleDateString('en-PH', { timeZone: 'UTC', ...opts });

/**
 * Who presides at each Mass of the weekly schedule, date by date.
 *
 * Nobody fills this in: on the last day of each month the next month is
 * drawn by lot — fairly, never on a priest's day off, never two places in
 * one hour. When two priests exchange, the admin changes a Mass here and
 * both are notified.
 */
export default function MassRosterPanel({ priests = [] }) {
    const axios = useAxiosPrivate();
    const { isAdmin } = useAuth();

    const [month,   setMonth]   = useState(thisMonth);
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [busyId,  setBusyId]  = useState(null);
    const [notice,  setNotice]  = useState(null);
    const [weekPick, setWeekPick] = useState({});   // month → the week on screen

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/roster', { params: { month } });
                if (alive) setData(res.data);
            } catch (err) {
                if (alive) setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not load the roster.' });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, month]);

    const change = async (item, priestId) => {
        setBusyId(item._id);
        setNotice(null);
        try {
            const res = await axios.patch(`/admin-api/roster/${item._id}`, { priestId: priestId || null });
            setData(d => ({ ...d, items: d.items.map(x => (x._id === item._id ? res.data : x)) }));
            const who = priests.find(p => p._id === priestId);
            setNotice({
                tone: 'ok',
                message: who ? `${who.label} now presides at the ${fmtTime(item.time)} Mass on ${fmtDate(item.date)}. Both priests were notified.`
                             : `No priest is set for the ${fmtTime(item.time)} Mass on ${fmtDate(item.date)}.`
            });
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not change the priest.' });
        } finally {
            setBusyId(null);
        }
    };

    // One block per date
    const days = [];
    (data?.items || []).forEach(item => {
        const key = utcDay(item.date);
        const last = days[days.length - 1];
        if (last && last.key === key) last.items.push(item);
        else days.push({ key, date: item.date, items: [item] });
    });

    /* A month of Masses is too long to read at once: one week at a time,
       opening on this week when the month on screen is this month */
    const weeks = [];
    days.forEach(d => {
        const key = weekOf(d.date);
        const last = weeks[weeks.length - 1];
        if (last && last.key === key) last.days.push(d);
        else weeks.push({ key, days: [d] });
    });
    const now = new Date();
    const todayKey = weekOf(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00Z`);
    const weekIdx = Math.min(weeks.length - 1, Math.max(0,
        weekPick[month] ?? weeks.findIndex(w => w.key === todayKey)));
    const shownWeek = weeks[weekIdx];

    // Masses per priest this month, to see the draw is even
    const load = {};
    (data?.items || []).forEach(i => { if (i.priestId) load[i.priestId] = (load[i.priestId] || 0) + 1; });

    return (
        <section className="ad-card mr-panel">
            <header className="ad-card__head">
                <h3><FontAwesomeIcon icon={faShuffle} /> Mass roster</h3>
                <div className="ad-cal__nav">
                    <button className="ad-icon-btn" onClick={() => { setLoading(true); setMonth(m => shiftMonth(m, -1)); }} aria-label="Previous month">
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <span className="mr-panel__month">{monthLabel(month)}</span>
                    <button className="ad-icon-btn" onClick={() => { setLoading(true); setMonth(m => shiftMonth(m, 1)); }} aria-label="Next month">
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>
            </header>

            <p className="ad-card__meta mr-panel__intro">
                Drawn at random on the last day of the month before. Change a Mass when priests exchange —
                both are notified.
            </p>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {loading ? <Loading label="Loading the roster…" /> : !data?.generated ? (
                <Empty>
                    {monthLabel(month)} has not been drawn yet. It is drawn automatically on {fmtDate(data?.drawsOn)}
                    {priests.length ? '.' : ' — once priests are assigned to this parish.'}
                </Empty>
            ) : days.length === 0 ? (
                <Empty>No weekly Masses fall in {monthLabel(month)}.</Empty>
            ) : (
                <>
                    <div className="mr-bar">
                        {/* The month's weeks, one on screen at a time */}
                        <div className="mr-weeks" role="tablist" aria-label="Week">
                            {weeks.map((w, i) => {
                                const first = w.days[0].date, last = w.days[w.days.length - 1].date;
                                return (
                                    <button
                                        key={w.key}
                                        role="tab"
                                        aria-selected={i === weekIdx}
                                        className={`mr-week${i === weekIdx ? ' mr-week--on' : ''}`}
                                        onClick={() => setWeekPick(p => ({ ...p, [month]: i }))}
                                    >
                                        {shortDay(first, { month: 'short', day: 'numeric' })}
                                        {utcDay(first) !== utcDay(last) && `–${shortDay(last, { day: 'numeric' })}`}
                                    </button>
                                );
                            })}
                        </div>
                        {priests.length > 0 && (
                            <ul className="mr-load" title="Masses this month">
                                {priests.map(p => (
                                    <li key={p._id}><b>{load[p._id] || 0}</b> {p.label}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <ul className="mr-days">
                        {shownWeek.days.map(d => (
                            <li key={d.key} className="mr-day">
                                <span className="mr-day__date">
                                    {shortDay(d.date, { weekday: 'short' })} <b>{shortDay(d.date, { month: 'short', day: 'numeric' })}</b>
                                </span>
                                <ul className="mr-day__masses">
                                    {d.items.map(item => (
                                        <li key={item._id} className={busyId === item._id ? 'ad-row--busy' : ''}>
                                            <span className="mr-day__time">
                                                {fmtTime(item.time)}
                                                {item.label && <em>{item.label}</em>}
                                            </span>
                                            {isAdmin ? (
                                                <PriestSelect
                                                    className="ad-select ad-select--sm"
                                                    priests={priests}
                                                    dow={utcDow(item.date)}
                                                    value={item.priestId}
                                                    disabled={busyId === item._id}
                                                    emptyLabel="No priest"
                                                    onChange={v => change(item, v)}
                                                />
                                            ) : <span>{item.priest || '—'}</span>}
                                            {!item.auto && <span className="ad-tag" title="Changed by the office">exchanged</span>}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
