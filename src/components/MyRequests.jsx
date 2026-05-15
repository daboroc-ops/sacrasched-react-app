import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faInbox } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import PayButton from './PayButton';

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function StatusBadge({ status }) {
    const map = {
        pending:   'badge--pending',
        approved:  'badge--approved',
        rejected:  'badge--rejected',
        completed: 'badge--completed',
        cancelled: 'badge--rejected'
    };
    return <span className={`badge ${map[status] || 'badge--pending'}`}>{status}</span>;
}

function RequestCard({ item }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="req-card">
            <div className="req-card__header" onClick={() => setOpen(o => !o)}>
                <div className="req-card__info">
                    <span className="req-card__type">{item.type}</span>
                    <span className="req-card__sub">{item.label}</span>
                </div>
                <div className="req-card__right">
                    <StatusBadge status={item.status} />
                    <span className="req-card__date">{fmtDate(item.date)}</span>
                    <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="req-card__chevron" />
                </div>
            </div>

            {open && (
                <div className="req-card__body">
                    {item.details.map(([k, v]) => v ? (
                        <div key={k} className="req-card__detail">
                            <span className="req-card__key">{k}</span>
                            <span className="req-card__val">{v}</span>
                        </div>
                    ) : null)}
                </div>
            )}

            {/* ── Fee row ── */}
            {item.fee > 0 && (
                <div className="req-card__fee-row">
                    <span className="req-card__fee-label">Service Fee</span>
                    <span className="req-card__fee-amount">
                        ₱{Number(item.fee).toLocaleString()}
                    </span>
                    {item.isPaid
                        ? <span className="badge badge--paid">Paid</span>
                        : (
                            <PayButton
                                compact
                                amount={item.fee}
                                description={`${item.type}: ${item.label}`}
                                serviceType={item.serviceType}
                                referenceId={item._id}
                            />
                        )
                    }
                </div>
            )}
        </div>
    );
}

export default function MyRequests() {
    const axios = useAxiosPrivate();
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [filter,  setFilter]  = useState('all');

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [blessRes, intentRes, sacRes, docRes, payRes] = await Promise.all([
                    axios.get('/blessing/my').catch(() => ({ data: [] })),
                    axios.get('/mass-intention/my').catch(() => ({ data: [] })),
                    axios.get('/sacrament/my').catch(() => ({ data: [] })),
                    axios.get('/document-request/my').catch(() => ({ data: [] })),
                    axios.get('/payment/my').catch(() => ({ data: [] }))
                ]);

                // Build a set of reference IDs that have a completed payment
                const paidRefs = new Set(
                    (payRes.data || [])
                        .filter(p => p.status === 'completed')
                        .map(p => p.referenceId?.toString())
                        .filter(Boolean)
                );

                const all = [
                    ...(blessRes.data || []).map(b => ({
                        _id:         b._id,
                        type:        'Blessing',
                        label:       `${b.blessingType} — ${b.blessingFor}`,
                        status:      b.status,
                        date:        b.preferredDate,
                        fee:         b.fee || 0,
                        serviceType: 'blessing',
                        isPaid:      paidRefs.has(b._id.toString()),
                        details: [
                            ['Blessing Type', b.blessingType],
                            ['Blessing For',  b.blessingFor],
                            ['Location',      b.venue],
                            ['Date',  fmtDate(b.preferredDate)],
                            ['Time',  fmtTime(b.preferredTime)],
                            ['Notes', b.additionalNotes]
                        ]
                    })),
                    ...(intentRes.data || []).map(m => ({
                        _id:         m._id,
                        type:        'Mass Intention',
                        label:       `${m.intentionType} — ${m.intentionFor}`,
                        status:      m.status,
                        date:        m.preferredDate,
                        fee:         m.fee || 0,
                        serviceType: 'massIntention',
                        isPaid:      paidRefs.has(m._id.toString()),
                        details: [
                            ['Intention Type', m.intentionType],
                            ['Intention For',  m.intentionFor],
                            ['Date', fmtDate(m.preferredDate)],
                            ['Time', fmtTime(m.preferredTime)],
                            ['Notes', m.additionalNotes]
                        ]
                    })),
                    ...(sacRes.data || []).map(s => ({
                        _id:         s._id,
                        type:        s.sacramentType,
                        label:       `Recipient: ${s.recipientName}`,
                        status:      s.status,
                        date:        s.preferredDate,
                        fee:         s.fee || 0,
                        serviceType: 'sacrament',
                        isPaid:      paidRefs.has(s._id.toString()),
                        details: [
                            ['Sacrament',  s.sacramentType],
                            ['Recipient',  s.recipientName],
                            ['Date', fmtDate(s.preferredDate)],
                            ['Time', fmtTime(s.preferredTime)],
                            ['Notes', s.additionalNotes]
                        ]
                    })),
                    ...(docRes.data || []).map(d => ({
                        _id:         d._id,
                        type:        'Document Request',
                        label:       `${d.documentType} (${d.copies} ${d.copies === 1 ? 'copy' : 'copies'})`,
                        status:      d.status,
                        date:        d.createdAt,
                        fee:         d.fee || 0,
                        serviceType: 'documentRequest',
                        isPaid:      paidRefs.has(d._id.toString()),
                        details: [
                            ['Document Type', d.documentType],
                            ['Copies',  d.copies],
                            ['Purpose', d.purpose],
                            ['Notes',   d.additionalNotes]
                        ]
                    }))
                ];

                // Sort newest first
                all.sort((a, b) => new Date(b.date) - new Date(a.date));
                setItems(all);
            } catch {
                setError('Could not load your requests.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []); // eslint-disable-line

    const FILTERS = ['all', 'pending', 'approved', 'rejected', 'completed'];
    const shown = filter === 'all' ? items : items.filter(i => i.status === filter);

    if (loading) return <p className="loading-text">Loading your requests…</p>;
    if (error)   return <p className="error-text">{error}</p>;

    return (
        <div>
            <p className="page-intro">
                All your submitted requests. Click any row to see details.
            </p>

            {/* Filter tabs */}
            <div className="filter-tabs">
                {FILTERS.map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
                        onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="filter-tab__count">
                            {f === 'all' ? items.length : items.filter(i => i.status === f).length}
                        </span>
                    </button>
                ))}
            </div>

            {shown.length === 0 ? (
                <div className="empty-state">
                    <FontAwesomeIcon icon={faInbox} className="empty-state__icon" />
                    <p className="empty-state__title">No {filter === 'all' ? '' : filter} requests yet.</p>
                    <p className="empty-state__sub">Use "Book Services" to submit your first request.</p>
                </div>
            ) : (
                <div className="req-list">
                    {shown.map(item => <RequestCard key={item._id} item={item} />)}
                </div>
            )}
        </div>
    );
}
