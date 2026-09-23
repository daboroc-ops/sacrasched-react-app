import { useState, useEffect } from 'react';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import PayButton from './PayButton';
import ReceiptButton from './ReceiptButton';
import { RequestsSkeleton } from './Skeleton';

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function isPastDate(iso) {
    if (!iso) return false;
    const d = new Date(iso); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return d < today;
}

// Document Request has no service date — its `date` is createdAt, so exclude it.
function deriveStatus(type, status, date) {
    if (type === 'Document Request') return status;
    if (status === 'rejected' || status === 'cancelled') return status;
    return isPastDate(date) ? 'completed' : status;
}

function StatusText({ status }) {
    return <span className={`req-status req-status--${status}`}>{status}</span>;
}

function RequestCard({ item }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="req-card">
            <div className="req-card__header" onClick={() => setOpen(o => !o)}>
                <div className="req-card__info">
                    <span className="req-card__type">{item.type}</span>
                    <span className="req-card__sub">{item.label}</span>
                    <span className="req-card__submitted">Submitted {fmtDate(item.createdAt)}</span>
                </div>
                <div className="req-card__right">
                    <StatusText status={item.status} />
                    <span className="req-card__date">{fmtDate(item.date)}</span>
                    <span className="req-card__chevron">{open ? '−' : '+'}</span>
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
                    <span className="req-card__fee-label">Payment</span>
                    <span className="req-card__fee-amount">
                        ₱{Number(item.fee).toLocaleString()}
                    </span>
                    {item.isPaid
                        ? <span className="req-status req-status--approved">Paid</span>
                        : <span className="req-status req-status--pending">Unpaid</span>
                    }
                    {item.isPaid && item.paymentId && (
                        <ReceiptButton compact paymentId={item.paymentId} />
                    )}
                    {!item.isPaid && (
                        <PayButton
                            compact
                            amount={item.fee}
                            description={`${item.type}: ${item.label}`}
                            serviceType={item.serviceType}
                            referenceId={item._id}
                            onsiteChosen={Boolean(item.onsiteChosen)}
                        />
                    )}
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
                const [blessRes, intentRes, sacRes, docRes, occRes, payRes] = await Promise.all([
                    axios.get('/blessing/my').catch(() => ({ data: [] })),
                    axios.get('/mass-intention/my').catch(() => ({ data: [] })),
                    axios.get('/sacrament/my').catch(() => ({ data: [] })),
                    axios.get('/document-request/my').catch(() => ({ data: [] })),
                    axios.get('/occasional-mass/my').catch(() => ({ data: [] })),
                    axios.get('/payment/my').catch(() => ({ data: [] }))
                ]);

                // Auto-verify any pending checkout payments so the badge updates
                // even if the user never waited on the success page.
                const pendingCheckouts = (payRes.data || []).filter(
                    p => p.status === 'pending' && p.paymongoCheckoutId
                );
                let payments = payRes.data || [];
                if (pendingCheckouts.length > 0) {
                    await Promise.allSettled(
                        pendingCheckouts.map(p => axios.get(`/payment/${p._id}/verify`))
                    );
                    // Re-fetch with the now-updated statuses
                    const fresh = await axios.get('/payment/my').catch(() => ({ data: [] }));
                    payments = fresh.data || [];
                }

                // Build a set of reference IDs that have a paid payment
                // Which paid payment settled which request — the receipt hangs off it
                const paidBy = {};
                payments
                    .filter(p => p.status === 'paid' && p.referenceId)
                    .forEach(p => { paidBy[p.referenceId.toString()] = p._id; });
                const paidRefs = new Set(Object.keys(paidBy));

                const all = [
                    ...(blessRes.data || []).map(b => ({
                        _id:         b._id,
                        type:        'Blessing',
                        label:       `${b.blessingType} — ${b.blessingFor}`,
                        status:      deriveStatus('Blessing', b.status, b.preferredDate),
                        date:        b.preferredDate,
                        createdAt:   b.createdAt,
                        fee:         b.fee || 0,
                        serviceType: 'blessing',
                        onsiteChosen: b.paymentChoice === 'onsite',
                        isPaid:      paidRefs.has(b._id.toString()),
                        paymentId:   paidBy[b._id.toString()] || null,
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
                        status:      deriveStatus('Mass Intention', m.status, m.preferredDate),
                        date:        m.preferredDate,
                        createdAt:   m.createdAt,
                        fee:         m.fee || 0,
                        serviceType: 'massIntention',
                        isPaid:      paidRefs.has(m._id.toString()),
                        paymentId:   paidBy[m._id.toString()] || null,
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
                        status:      deriveStatus(s.sacramentType, s.status, s.preferredDate),
                        date:        s.preferredDate,
                        createdAt:   s.createdAt,
                        fee:         s.fee || 0,
                        serviceType: 'sacrament',
                        onsiteChosen: s.paymentChoice === 'onsite',
                        isPaid:      paidRefs.has(s._id.toString()),
                        paymentId:   paidBy[s._id.toString()] || null,
                        details: [
                            ['Sacrament',  s.sacramentType],
                            ['Recipient',  s.recipientName],
                            ['Date', fmtDate(s.preferredDate)],
                            ['Time', fmtTime(s.preferredTime)],
                            ['Notes', s.additionalNotes]
                        ]
                    })),
                    ...(occRes.data || []).map(o => ({
                        _id:         o._id,
                        type:        o.massType,
                        label:       o.details?.deceased || o.details?.organisation || 'Reservation',
                        status:      o.status,
                        date:        o.preferredDate,
                        createdAt:   o.createdAt,
                        fee:         o.fee || 0,
                        serviceType: 'occasionalMass',
                        onsiteChosen: o.paymentChoice === 'onsite',
                        isPaid:      paidRefs.has(o._id.toString()),
                        paymentId:   paidBy[o._id.toString()] || null,
                        details: [
                            ['Mass',  o.massType],
                            ['For',   o.details?.deceased || o.details?.organisation],
                            ['Venue', o.venue || 'Church'],
                            ['Date',  fmtDate(o.preferredDate)],
                            ['Time',  fmtTime(o.preferredTime)],
                            ['Notes', o.additionalNotes]
                        ]
                    })),
                    ...(docRes.data || []).map(d => ({
                        _id:         d._id,
                        type:        'Document Request',
                        label:       `${d.documentType} (${d.copies} ${d.copies === 1 ? 'copy' : 'copies'})`,
                        status:      d.status,
                        date:        d.createdAt,
                        createdAt:   d.createdAt,
                        fee:         d.fee || 0,
                        serviceType: 'documentRequest',
                        isPaid:      paidRefs.has(d._id.toString()),
                        paymentId:   paidBy[d._id.toString()] || null,
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

    if (loading) return <RequestsSkeleton />;
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
