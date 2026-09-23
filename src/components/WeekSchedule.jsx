import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

const DAYS = [
    ['sun', 'Sunday'], ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'],
    ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'],
];

/* "05:30" → "5:30" — the line it is on says AM or PM */
const clock = t => {
    const [h, m] = String(t || '').split(':').map(Number);
    if (Number.isNaN(h)) return t;
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')}`;
};
const isAM = t => parseInt(String(t).split(':')[0], 10) < 12;

const sorted = list => [...(list || [])].sort((a, b) => String(a.time).localeCompare(String(b.time)));

/**
 * The parish's week of Masses, one row per day — the day on the left and
 * the times across, the morning Masses on one line and the afternoon's on
 * the next, each time in a tile of the same width so the columns line up
 * down the week. `days` is { sun…sat: [{ time, label }] }. Today's row
 * is marked.
 */
export default function WeekSchedule({ days = {}, compact = false }) {
    const todayKey = DAYS[new Date().getDay()][0];
    const any = DAYS.some(([k]) => (days[k] || []).length);

    if (!any) return <p className="ws__empty">The parish has not published its Mass times yet.</p>;

    return (
        <div className={`ws${compact ? ' ws--compact' : ''}`}>
            {DAYS.map(([key, label]) => {
                const list  = sorted(days[key]);
                const today = key === todayKey;
                return (
                    <div key={key} className={`ws__row${today ? ' ws__row--today' : ''}`}>
                        <span className="ws__day">
                            <FontAwesomeIcon icon={faClock} /> {label}
                            {today && <em>Today</em>}
                        </span>
                        <span className="ws__times">
                            {list.length === 0 ? (
                                <span className="ws__none">No Mass</span>
                            ) : [['AM', list.filter(t => isAM(t.time))], ['PM', list.filter(t => !isAM(t.time))]]
                                .filter(([, l]) => l.length)
                                .map(([tag, l]) => (
                                    <span key={tag} className="ws__line">
                                        <i className="ws__ampm">{tag}</i>
                                        {l.map((t, i) => (
                                            <span key={i} className="ws__time" title={t.label || undefined}>
                                                <b>{clock(t.time)}</b>
                                                {t.label && <small>{t.label}</small>}
                                            </span>
                                        ))}
                                    </span>
                                ))}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
