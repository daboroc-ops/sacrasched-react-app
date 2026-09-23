import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faBan, faRotateLeft, faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Banner, Loading, Empty, ConfirmDialog } from '../../components/admin/AdminUI';
import { fmtDate, fmtTime } from '../../utils/format';

const BLANK = { date: '', time: '', title: '', priest: '', venue: '', note: '' };

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * One-off Masses, sitting under the recurring weekly schedule.
 *
 * The weekly grid above answers "when is Mass normally?". This answers "what
 * else is happening" — a fiesta, a feast day, an anniversary Mass. Both feed
 * the devotee's Mass Schedules tab.
 */
export default function SpecificMassesPanel() {
    const axios = useAxiosPrivate();

    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice,  setNotice]  = useState(null);
    const [form,    setForm]    = useState(BLANK);
    const [busy,    setBusy]    = useState(false);
    const [range,   setRange]   = useState('upcoming');
    const [pendingDelete, setPendingDelete] = useState(null);

    // Bumped after every change so the list re-reads itself, rather than
    // calling setState straight from an effect body.
    const [nonce, setNonce] = useState(0);
    const reload = () => setNonce(n => n + 1);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/scheduled-masses', {
                    params: range === 'all' ? { range: 'all' } : {}
                });
                if (alive) setItems(res.data.items || []);
            } catch (err) {
                if (alive) setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not load scheduled Masses.' });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, range, nonce]);

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

    const add = async e => {
        e.preventDefault();
        setBusy(true); setNotice(null);
        try {
            await axios.post('/admin-api/scheduled-masses', form);
            setNotice({ tone: 'ok', message: `"${form.title}" was added to the schedule.` });
            setForm(BLANK);
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not add the Mass.' });
        } finally {
            setBusy(false);
        }
    };

    const toggleCancelled = async mass => {
        setBusy(true); setNotice(null);
        try {
            await axios.patch(`/admin-api/scheduled-masses/${mass._id}`, { cancelled: !mass.cancelled });
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not update the Mass.' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true); setNotice(null);
        try {
            await axios.delete(`/admin-api/scheduled-masses/${pendingDelete._id}`);
            setNotice({ tone: 'ok', message: 'Removed from the schedule.' });
            setPendingDelete(null);
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not remove the Mass.' });
            setPendingDelete(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="ad-card sm-panel">
            <header className="ad-card__head">
                <h3><FontAwesomeIcon icon={faCalendarDay} /> Specific Masses</h3>
                <span className="ad-card__meta">
                    One-off Masses on a given date — shown to devotees alongside the weekly schedule
                </span>
            </header>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {/* ── Add ── */}
            <form className="sm-form" onSubmit={add}>
                <div className="sm-form__row">
                    <label className="sm-field sm-field--date">
                        <span>Date</span>
                        <input className="ad-input" type="date" min={todayStr()}
                               value={form.date} onChange={set('date')} required />
                    </label>
                    <label className="sm-field sm-field--time">
                        <span>Time</span>
                        <input className="ad-input" type="time"
                               value={form.time} onChange={set('time')} required />
                    </label>
                    <label className="sm-field sm-field--grow">
                        <span>What is it</span>
                        <input className="ad-input" type="text" placeholder="Enter the title of the Mass"
                               value={form.title} onChange={set('title')} required />
                    </label>
                </div>

                <div className="sm-form__row">
                    <label className="sm-field">
                        <span>Priest <em>optional</em></span>
                        <input className="ad-input" type="text" placeholder="Enter the priest"
                               value={form.priest} onChange={set('priest')} />
                    </label>
                    <label className="sm-field">
                        <span>Venue <em>optional</em></span>
                        <input className="ad-input" type="text" placeholder="Enter the venue"
                               value={form.venue} onChange={set('venue')} />
                    </label>
                    <label className="sm-field sm-field--grow">
                        <span>Note <em>optional</em></span>
                        <input className="ad-input" type="text" placeholder="Enter a note for devotees"
                               value={form.note} onChange={set('note')} />
                    </label>
                    <button className="ad-btn ad-btn--filled sm-form__add" disabled={busy}>
                        <FontAwesomeIcon icon={faPlus} /> Add
                    </button>
                </div>
            </form>

            {/* ── List ── */}
            <div className="sm-list__head">
                <span className="ad-card__meta">
                    {range === 'all' ? 'All scheduled Masses' : 'Upcoming'} · {items.length}
                </span>
                <button
                    type="button"
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                    onClick={() => setRange(r => (r === 'all' ? 'upcoming' : 'all'))}
                >
                    {range === 'all' ? 'Show upcoming only' : 'Include past'}
                </button>
            </div>

            {loading ? <Loading label="Loading scheduled Masses…" /> :
             items.length === 0 ? (
                <Empty>
                    No specific Masses scheduled. Add one above and it appears on the
                    devotee&rsquo;s Mass Schedules tab.
                </Empty>
             ) : (
                <ul className="sm-list">
                    {items.map(m => (
                        <li key={m._id} className={m.cancelled ? 'sm-item sm-item--off' : 'sm-item'}>
                            <span className="sm-item__when">
                                <b>{fmtDate(m.date)}</b>
                                <span>{fmtTime(m.time)}</span>
                            </span>

                            <span className="sm-item__body">
                                <b>{m.title}</b>
                                <span>
                                    {[m.priest, m.venue].filter(Boolean).join(' · ') || '—'}
                                    {m.note && <em> — {m.note}</em>}
                                </span>
                            </span>

                            {m.cancelled && <span className="ad-badge ad-badge--bad">cancelled</span>}

                            <span className="sm-item__actions">
                                <button
                                    type="button"
                                    className="ad-btn ad-btn--ghost ad-btn--sm"
                                    disabled={busy}
                                    title={m.cancelled ? 'Put it back on the schedule' : 'Mark as cancelled'}
                                    onClick={() => toggleCancelled(m)}
                                >
                                    <FontAwesomeIcon icon={m.cancelled ? faRotateLeft : faBan} />
                                </button>
                                <button
                                    type="button"
                                    className="ad-btn ad-btn--danger ad-btn--sm"
                                    disabled={busy}
                                    title="Remove permanently"
                                    onClick={() => setPendingDelete(m)}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </span>
                        </li>
                    ))}
                </ul>
             )}

            {pendingDelete && (
                <ConfirmDialog
                    title={`Remove "${pendingDelete.title}"?`}
                    message="This deletes the scheduled Mass. To keep the record but take it off the schedule, cancel it instead."
                    confirmLabel="Remove"
                    busy={busy}
                    onConfirm={remove}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </section>
    );
}
