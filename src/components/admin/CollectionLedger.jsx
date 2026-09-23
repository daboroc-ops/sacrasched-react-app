import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import { fmtPeso } from '../../utils/format';
import { Banner } from './AdminUI';

/** The most recent Sunday, as 'YYYY-MM-DD' — the date a new entry starts on. */
const lastSunday = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDay = iso => new Date(iso).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * The Sunday collection, week by week — the figure a parish actually
 * watches. Staff enter what was counted; the dashboard adds it up.
 */
export default function CollectionLedger() {
    const axios = useAxiosPrivate();
    const { isAdmin } = useAuth();

    const [data,   setData]   = useState({ items: [], totals: { month: 0, year: 0, count: 0 } });
    const [form,   setForm]   = useState({ date: lastSunday(), amount: '', note: '' });
    const [busy,   setBusy]   = useState(false);
    const [notice, setNotice] = useState(null);

    const load = async () => {
        try {
            const res = await axios.get('/admin-api/collections', { params: { limit: 12 } });
            setData(res.data);
        } catch {
            setNotice({ tone: 'bad', message: 'Could not load the collection records.' });
        }
    };
    useEffect(() => { load(); }, []); // eslint-disable-line

    const save = async e => {
        e.preventDefault();
        setBusy(true); setNotice(null);
        try {
            await axios.post('/admin-api/collections', form);
            setForm(f => ({ ...f, amount: '', note: '' }));
            setNotice({ tone: 'ok', message: 'Collection recorded.' });
            load();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not record the collection.' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async id => {
        try {
            await axios.delete(`/admin-api/collections/${id}`);
            load();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not remove that entry.' });
        }
    };

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Sunday collection</h3>
                <span className="ad-card__meta">
                    {fmtPeso(data.totals.month)} this month · {fmtPeso(data.totals.year)} this year
                </span>
            </header>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            <form className="ad-ledger__form" onSubmit={save}>
                <input className="ad-input ad-input--short" type="date" value={form.date} required
                       onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                <input className="ad-input ad-input--short" type="number" min="0" step="0.01" placeholder="Amount (₱)" required
                       value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                <input className="ad-input" placeholder="Note (optional) — fiesta, second collection…"
                       value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                <button className="ad-btn ad-btn--filled" disabled={busy}>
                    <FontAwesomeIcon icon={faPlus} /> {busy ? 'Saving…' : 'Record'}
                </button>
            </form>

            {data.items.length === 0 ? (
                <p className="ad-config-col__empty">No collections recorded yet. Enter last Sunday's to start.</p>
            ) : (
                <div className="ad-table-wrap">
                    <table className="ad-table ad-table--compact">
                        <thead>
                            <tr><th>Sunday</th><th>Amount</th><th>Note</th><th>Recorded by</th>{isAdmin && <th />}</tr>
                        </thead>
                        <tbody>
                            {data.items.map(row => (
                                <tr key={row._id}>
                                    <td>{fmtDay(row.date)}</td>
                                    <td><b>{fmtPeso(row.amount)}</b></td>
                                    <td>{row.note || <span className="ad-muted">—</span>}</td>
                                    <td>{row.recordedByName || '—'}</td>
                                    {isAdmin && (
                                        <td>
                                            <button className="ad-icon-btn ad-icon-btn--danger" onClick={() => remove(row._id)} title="Remove">
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
