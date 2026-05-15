import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faMoon, faChurch } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function ScheduleSection({ title, icon, slots }) {
    return (
        <div className="schedule-card">
            <div className="schedule-card__header">
                <FontAwesomeIcon icon={icon} className="schedule-card__icon" />
                <h3 className="schedule-card__title">{title}</h3>
                <span className="schedule-card__count">{slots.length} {slots.length === 1 ? 'Mass' : 'Masses'}</span>
            </div>
            {slots.length === 0 ? (
                <p className="schedule-empty">No masses scheduled.</p>
            ) : (
                <ul className="schedule-list">
                    {slots.map((s, i) => (
                        <li key={i} className="schedule-item">
                            <span className="schedule-item__time">{fmtTime(s.time)}</span>
                            {s.label && <span className="schedule-item__label">{s.label}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function MassScheduleView() {
    const axios = useAxiosPrivate();
    const [schedule, setSchedule] = useState({ weekdays: [], saturdays: [], sundays: [] });
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');

    useEffect(() => {
        axios.get('/user/mass-schedule')
            .then(res => setSchedule(res.data))
            .catch(() => setError('Could not load mass schedule.'))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line

    if (loading) return <p className="loading-text">Loading mass schedule…</p>;
    if (error)   return <p className="error-text">{error}</p>;

    return (
        <div>
            <p className="page-intro">
                Regular mass times at the parish. Times are subject to change on special occasions.
            </p>
            <div className="schedule-grid">
                <ScheduleSection title="Weekdays"  icon={faCalendarDays} slots={schedule.weekdays}  />
                <ScheduleSection title="Saturdays" icon={faMoon}         slots={schedule.saturdays} />
                <ScheduleSection title="Sundays"   icon={faChurch}       slots={schedule.sundays}   />
            </div>
        </div>
    );
}
