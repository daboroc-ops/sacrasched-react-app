import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckDouble, faRotate, faUserCheck, faUserMinus, faCalendarPlus, faCircleCheck,
    faBan, faCalendarWeek, faMugHot, faBell, faTrash, faCalendarDay, faFlagCheckered,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Loading, ErrorText, Empty, FilterBar } from '../../components/admin/AdminUI';
import { fmtStamp } from '../../utils/format';

const ICON = {
    assigned:   faUserCheck,
    unassigned: faUserMinus,
    booked:     faCalendarPlus,
    confirmed:  faCircleCheck,
    cancelled:  faBan,
    schedule:   faCalendarWeek,
    dayoff:     faMugHot,
    completed:  faFlagCheckered,
};

/* 'YYYY-MM-DD' of a booking day, which is stored at UTC midnight */
const dayParam = date => {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

/**
 * What the parish has told him: a booking given to him or taken away, a
 * booking confirmed or cancelled, a change to his weekly Masses or his
 * days off. Pressing one marks it read and shows what can be done with it:
 * see its day on the calendar, or delete it.
 */
export default function PriestNotifications() {
    const axios    = useAxiosPrivate();
    const navigate = useNavigate();
    const { setUnread } = useOutletContext();

    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [filter,  setFilter]  = useState('all');
    const [nonce,   setNonce]   = useState(0);
    const [picked,  setPicked]  = useState(null);   // the notification whose options are showing
    const [busyId,  setBusyId]  = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/priest-api/notifications', {
                    params: { limit: 100, ...(filter === 'unread' ? { unread: 1 } : {}) }
                });
                if (!alive) return;
                setItems(res.data.items || []);
                setUnread(res.data.unread || 0);
                setError('');
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Could not load your notifications.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, filter, nonce, setUnread]);

    const markRead = async n => {
        if (n.readAt) return;
        setItems(list => list.map(x => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
        try {
            const res = await axios.patch(`/priest-api/notifications/${n._id}/read`);
            setUnread(res.data.unread || 0);
        } catch { /* it stays unread on the server; the next load shows so */ }
    };

    const markAll = async () => {
        try {
            await axios.post('/priest-api/notifications/read-all');
            setUnread(0);
            setNonce(x => x + 1);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not mark them read.');
        }
    };

    /* Pressing one shows its options — pressing it again hides them */
    const press = n => {
        markRead(n);
        setPicked(p => (p === n._id ? null : n._id));
    };

    const remove = async n => {
        setBusyId(n._id);
        try {
            const res = await axios.delete(`/priest-api/notifications/${n._id}`);
            setItems(list => list.filter(x => x._id !== n._id));
            setUnread(res.data.unread || 0);
            setPicked(null);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not delete that notification.');
        } finally {
            setBusyId(null);
        }
    };

    const unreadHere = items.filter(n => !n.readAt).length;

    return (
        <section className="ad-card">
            <div className="ad-toolbar">
                <FilterBar options={['all', 'unread']} value={filter} onChange={setFilter} />
                <div className="ad-toolbar__actions">
                    <button className="ad-btn ad-btn--ghost ad-btn--icon" onClick={() => setNonce(x => x + 1)} title="Refresh">
                        <FontAwesomeIcon icon={faRotate} />
                    </button>
                    <button className="ad-btn ad-btn--ghost" onClick={markAll} disabled={!unreadHere}>
                        <FontAwesomeIcon icon={faCheckDouble} /> Mark all as read
                    </button>
                </div>
            </div>

            {loading ? <Loading label="Loading notifications…" /> :
             error   ? <ErrorText>{error}</ErrorText> :
             items.length === 0 ? (
                <Empty>{filter === 'unread' ? 'Nothing unread.' : 'No notifications yet. You will hear here when the parish gives you a Mass or a booking.'}</Empty>
             ) : (
                <ul className="pr-notes">
                    {items.map(n => (
                        <li key={n._id} className={`pr-note pr-note--${n.kind}${n.readAt ? '' : ' pr-note--unread'}${picked === n._id ? ' pr-note--picked' : ''}`}>
                            <button type="button" className="pr-note__main" onClick={() => press(n)} aria-expanded={picked === n._id}>
                                <span className="pr-note__icon"><FontAwesomeIcon icon={ICON[n.kind] || faBell} /></span>
                                <span className="pr-note__text">
                                    <b>{n.title}</b>
                                    {n.body && <span>{n.body}</span>}
                                    <em>{fmtStamp(n.createdAt)}</em>
                                </span>
                            </button>
                            {!n.readAt && (
                                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => markRead(n)}>
                                    Mark as Read
                                </button>
                            )}
                            {picked === n._id && (
                                <div className="pr-note__actions">
                                    {n.date && (
                                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                                                onClick={() => navigate(`/priest?date=${dayParam(n.date)}`)}>
                                            <FontAwesomeIcon icon={faCalendarDay} /> View on calendar
                                        </button>
                                    )}
                                    <button type="button" className="ad-btn ad-btn--danger ad-btn--sm"
                                            onClick={() => remove(n)} disabled={busyId === n._id}>
                                        <FontAwesomeIcon icon={faTrash} /> {busyId === n._id ? 'Deleting…' : 'Delete'}
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
             )}
        </section>
    );
}
