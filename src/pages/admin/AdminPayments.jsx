import useAdminList from '../../hooks/useAdminList';
import {
    StatusBadge, FilterBar, Pagination, Loading, ErrorText, Empty, SearchBox, Tabs } from '../../components/admin/AdminUI';
import { fmtDate, fmtPeso, fullName, refOf } from '../../utils/format';

const STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const SERVICE_LABEL = {
    massIntention:   'Mass Intention',
    blessing:        'Blessing',
    sacrament:       'Sacrament',
    occasionalMass:  'Occasional Mass',
    documentRequest: 'Document Request',
    facilityBooking: 'Facility Booking',
    other:           'Other',
};

/* One tab per service, in the order the sidebar lists them */
const SERVICE_TABS = [
    { label: 'Blessings',         match: 'blessing' },
    { label: 'Mass Intentions',   match: 'massIntention' },
    { label: 'Occasional Masses', match: 'occasionalMass' },
    { label: 'Sacraments',        match: 'sacrament' },
    { label: 'Document Requests', match: 'documentRequest' },
];

/**
 * Every payment, read-only. A payment's status is not changed here: the
 * office marks a booking paid on the booking itself (the "Paid" tick).
 */
export default function AdminPayments() {
    const list = useAdminList('/admin-api/payments');

    const summary = list.summary || {};
    const typeCounts = list.typeCounts || {};

    return (
        <>
            {/* ── Revenue summary ── */}
            <section className="ad-stat-grid ad-stat-grid--4">
                {STATUSES.map(s => (
                    <div className="ad-stat ad-stat--static" key={s}>
                        <div className="ad-stat__head">
                            <span className="ad-stat__label">{s}</span>
                            <StatusBadge status={s} />
                        </div>
                        <p className="ad-stat__value">{fmtPeso(summary[s]?.total || 0)}</p>
                        <p className="ad-stat__sub">
                            {summary[s]?.count || 0} transaction{summary[s]?.count === 1 ? '' : 's'}
                        </p>
                    </div>
                ))}
            </section>

            {/* Which service's payments — the totals above follow it */}
            <div className="ad-toolbar ad-toolbar--tabs">
                <Tabs
                    tabs={SERVICE_TABS}
                    value={list.type}
                    onChange={list.setType}
                    counts={typeCounts}
                    total={Object.values(typeCounts).reduce((a, b) => a + b, 0)}
                />
            </div>

            <div className="ad-toolbar">
                <FilterBar
                    options={['all', ...STATUSES]}
                    value={list.status}
                    onChange={list.setStatus}
                    counts={Object.fromEntries(STATUSES.map(s => [s, summary[s]?.count]))}
                    total={STATUSES.reduce((a, s) => a + (summary[s]?.count || 0), 0)}
                />
            </div>

            <div className="ad-toolbar ad-toolbar--search">
                <SearchBox value={list.search} onSearch={list.setSearch}
                           placeholder="Enter a reference, description, PayMongo ID or method" />
                {list.search && <span className="ad-muted">{list.total} match{list.total === 1 ? '' : 'es'} for “{list.search}”</span>}
            </div>

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? <Empty>No payments found for this filter.</Empty> : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Service</th>
                                <th>Method</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(p => (
                                <tr key={p._id}>
                                    <td className="ad-mono">{refOf(p)}</td>
                                    <td>
                                        {/* A guest payment has no account behind it —
                                            the address they booked with is who it is. */}
                                        <div className="ad-cell-stack">
                                            <b>{p.userId ? fullName(p.userId) : 'Guest'}</b>
                                            <span>{p.userId?.email || p.guest?.email || '—'}</span>
                                        </div>
                                    </td>
                                    <td><b>{fmtPeso(p.amount)}</b></td>
                                    <td>
                                        <div className="ad-cell-stack">
                                            <span>{SERVICE_LABEL[p.serviceType] || p.serviceType || '—'}</span>
                                            {p.description && <span>{p.description}</span>}
                                        </div>
                                    </td>
                                    <td className="ad-mono">{p.paymentMethod || '—'}</td>
                                    <td>{fmtDate(p.transactionDate || p.createdAt)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onChange={list.setPage} />
        </>
    );
}
