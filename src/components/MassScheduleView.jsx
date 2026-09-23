import { useState, useEffect } from 'react';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { ScheduleSkeleton } from './Skeleton';
import WeekSchedule from './WeekSchedule';

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function MassScheduleView() {
    const axios = useAxiosPrivate();
    const [schedule, setSchedule] = useState({ days: {}, scheduled: [] });
    const [activities, setActivities] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');

    useEffect(() => {
        Promise.all([
            axios.get('/user/mass-schedule'),
            axios.get('/user/config').catch(() => ({ data: {} }))
        ])
            .then(([sched, cfg]) => { setSchedule(sched.data); setActivities(cfg.data?.activities || []); })
            .catch(() => setError('Could not load mass schedule.'))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line

    if (loading) return <ScheduleSkeleton />;
    if (error)   return <p className="error-text">{error}</p>;

    return (
        <div>
            <p className="page-intro">
                Regular mass times at the parish. Times are subject to change on special occasions.
            </p>
            {/* Day by day — Wednesday's Masses are not Monday's at every parish */}
            <WeekSchedule days={schedule.days || {}} />

            {/* The parish's own activities — as the office writes them on the board */}
            {activities.length > 0 && (
                <section className="sched-special">
                    <h3 className="sched-special__title">Parish activities</h3>
                    <ul className="sched-special__list">
                        {activities.map((a, i) => (
                            <li key={i} className="sched-special__item">
                                <span className="sched-special__date">
                                    <b>{a.date ? new Date(a.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</b>
                                    <span>{a.time ? fmtTime(a.time) : ''}</span>
                                </span>
                                <span className="sched-special__body">
                                    <b>{a.name}</b>
                                    {a.schedule && <span>{a.schedule}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Masses outside the weekly pattern — feasts, fiestas, anniversaries.
                Set by the parish office under Configuration → Mass Schedule. */}
            {schedule.scheduled?.length > 0 && (
                <section className="sched-special">
                    <h3 className="sched-special__title">Coming up</h3>
                    <ul className="sched-special__list">
                        {schedule.scheduled.map(m => (
                            <li key={m._id} className="sched-special__item">
                                <span className="sched-special__date">
                                    <b>{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b>
                                    <span>{fmtTime(m.time)}</span>
                                </span>
                                <span className="sched-special__body">
                                    <b>{m.title}</b>
                                    <span>
                                        {[m.priest, m.venue].filter(Boolean).join(' · ')}
                                        {m.parish && ` · ${m.parish.name}`}
                                    </span>
                                    {m.note && <em>{m.note}</em>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
