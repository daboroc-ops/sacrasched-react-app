import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import {
    StatusBadge, FilterBar, Pagination, Banner, Loading, ErrorText, Empty, SearchBox } from '../../components/admin/AdminUI';
import { fmtDate, fmtPeso, fullName, shortId } from '../../utils/format';

const STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const SERVICE_LABEL = {
    massIntention:   'Mass Intention',
    blessing:        'Blessing',
    sacrament:       'Sacrament',
    documentRequest: 'Document Request',
    facilityBooking: 'Facility Booking',
    other:           'Other',
};

export default function AdminPayments() {
    const axios = useAxiosPrivate();
    const list  = useAdminList('/admin-api/payments');

    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const summary = list.summary || {};

    const changeStatus = async (row, status) => {
        setBusyId(row._id);
        setNotice(null);
        try {
            await axios.patch(`/admin-api/payments/${row._id}/status`, { status });
            setNotice({ tone: 'ok', message: `Payment marked "${status}".` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update payment.' });
        } finally {
            setBusyId(null);
        }
    };

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
                           placeholder="Search payments — reference, description, PayMongo ID, method…" />
                {list.search && <span className="ad-muted">{list.total} match{list.total === 1 ? '' : 'es'} for “{list.search}”</span>}
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? <Empty>No payments found for this filter.</Empty> : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Service</th>
                                <th>Method</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="ad-table__actions-hd">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(p => (
                                <tr key={p._id} className={busyId === p._id ? 'ad-row--busy' : ''}>
                                    <td className="ad-mono">{shortId(p._id)}</td>
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
                                    <td>
                                        <select
                                            className="ad-select ad-select--sm"
                                            value={p.status}
                                            disabled={busyId === p._id}
                                            onChange={e => changeStatus(p, e.target.value)}
                                        >
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
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
