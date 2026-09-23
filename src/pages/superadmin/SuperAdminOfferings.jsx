import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSackDollar, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Loading, ErrorText } from '../../components/admin/AdminUI';
import { fmtPeso } from '../../utils/format';

/**
 * What every parish has collected.
 *
 * The parish admin only ever sees its own figures, so this is the one place
 * the platform owner can compare them side by side.
 */
export default function SuperAdminOfferings() {
    const axios = useAxiosPrivate();
    const [params] = useSearchParams();
    const focus = params.get('parish');

    const [data,    setData]    = useState(null);
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/superadmin-api/offerings');
                if (alive) setData(res.data);
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Could not load offerings.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    if (loading) return <Loading label="Loading offerings…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;
    if (!data)   return null;

    const { rows, unassigned, totals } = data;
    const biggest = Math.max(...rows.map(r => r.paid.total), 1);

    return (
        <>
            <Link to="/superadmin" className="sa-back">&larr; All parishes</Link>

            <section className="sa-offer__summary">
                <div className="ad-stat sa-stat">
                    <div className="ad-stat__head">
                        <span className="ad-stat__label">Total offerings</span>
                        <span className="ad-stat__icon sa-stat__icon">
                            <FontAwesomeIcon icon={faSackDollar} />
                        </span>
                    </div>
                    <p className="ad-stat__value">{fmtPeso(totals.paid)}</p>
                    <p className="ad-stat__sub">{totals.count} paid transaction{totals.count === 1 ? '' : 's'}</p>
                </div>

                <div className="ad-stat sa-stat">
                    <div className="ad-stat__head">
                        <span className="ad-stat__label">Awaiting payment</span>
                    </div>
                    <p className="ad-stat__value">{fmtPeso(totals.pending)}</p>
                    <p className="ad-stat__sub">Not collected yet</p>
                </div>

                <div className="ad-stat sa-stat">
                    <div className="ad-stat__head">
                        <span className="ad-stat__label">Parishes</span>
                    </div>
                    <p className="ad-stat__value">{rows.length}</p>
                    <p className="ad-stat__sub">
                        {rows.filter(r => r.paid.total > 0).length} have collected offerings
                    </p>
                </div>
            </section>

            <div className="ad-table-wrap">
                <table className="ad-table">
                    <thead>
                        <tr>
                            <th>Parish</th>
                            <th>Site</th>
                            <th className="sa-offer__num">Offerings collected</th>
                            <th className="sa-offer__num">Awaiting payment</th>
                            <th>Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r._id} className={r._id === focus ? 'sa-offer__focus' : undefined}>
                                <td>
                                    <div className="ad-cell-stack">
                                        <b>{r.name}</b>
                                        {r.code && <span className="ad-tag">{r.code}</span>}
                                    </div>
                                </td>
                                <td>
                                    {r.subdomain
                                        ? <span className="sa-parish__host">{r.subdomain}</span>
                                        : <span className="sa-parish__host sa-parish__host--empty">No subdomain</span>}
                                </td>
                                <td className="sa-offer__num"><b>{fmtPeso(r.paid.total)}</b>
                                    <span className="sa-offer__count">{r.paid.count} paid</span>
                                </td>
                                <td className="sa-offer__num sa-offer__muted">{fmtPeso(r.pending.total)}</td>
                                <td>
                                    <span className="sa-offer__bar">
                                        <i style={{ width: `${Math.round((r.paid.total / biggest) * 100)}%` }} />
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {/* Payments made before parishes were scoped belong to no
                            parish, and would silently disappear if left out. */}
                        {unassigned && (
                            <tr className="sa-offer__orphan">
                                <td colSpan={2}>
                                    <div className="ad-cell-stack">
                                        <b><FontAwesomeIcon icon={faTriangleExclamation} /> {unassigned.name}</b>
                                        <span>Made before parish scoping — run scripts/backfill-parish.js to assign them</span>
                                    </div>
                                </td>
                                <td className="sa-offer__num"><b>{fmtPeso(unassigned.paid.total)}</b>
                                    <span className="sa-offer__count">{unassigned.paid.count} paid</span>
                                </td>
                                <td className="sa-offer__num sa-offer__muted">{fmtPeso(unassigned.pending.total)}</td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2}><b>All parishes</b></td>
                            <td className="sa-offer__num"><b>{fmtPeso(totals.paid)}</b></td>
                            <td className="sa-offer__num sa-offer__muted">{fmtPeso(totals.pending)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </>
    );
}
