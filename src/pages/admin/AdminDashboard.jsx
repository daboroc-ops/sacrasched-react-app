import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers, faDove, faHandsPraying, faChurch, faFileLines, faSackDollar,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import {
    StatusBadge, Loading, ErrorText, Empty,
    GroupedBars, LineChart, Segmented, PALETTE,
} from '../../components/admin/AdminUI';
import { ChartSkeleton } from '../../components/Skeleton';
import CollectionLedger from '../../components/admin/CollectionLedger';
import { fmtDate, fmtPeso } from '../../utils/format';

const sum = obj => Object.values(obj || {}).reduce((a, b) => a + b, 0);

export default function AdminDashboard() {
    const axios = useAxiosPrivate();
    const { auth, isAdmin } = useAuth();

    const [stats,   setStats]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/stats');
                if (alive) setStats(res.data);
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Failed to load dashboard statistics.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    if (loading) return <Loading label="Loading dashboard…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;
    if (!stats)  return null;

    const {
        totalUsers, blessingStats, massStats, sacramentStats, documentStats,
        paymentRevenue, recent, analytics,
    } = stats;

    const totalPending =
        (sacramentStats.pending || 0) + (blessingStats.pending || 0) +
        (massStats.pending || 0) + (documentStats.pending || 0);

    const cards = [
        { to: '/admin/users',             label: 'Users',      icon: faUsers,        value: totalUsers,            sub: 'Registered accounts', adminOnly: true },
        { to: '/admin/sacraments',        label: 'Sacraments', icon: faDove,         value: sum(sacramentStats),   pending: sacramentStats.pending },
        { to: '/admin/blessings',         label: 'Blessings',  icon: faHandsPraying, value: sum(blessingStats),    pending: blessingStats.pending },
        { to: '/admin/mass-intentions',   label: 'Intentions', icon: faChurch,       value: sum(massStats),        pending: massStats.pending },
        { to: '/admin/document-requests', label: 'Documents',  icon: faFileLines,    value: sum(documentStats),    pending: documentStats.pending },
    ].filter(c => !c.adminOnly || isAdmin);

    const paidRevenue = paymentRevenue?.paid?.total || 0;

    const today = new Date().toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <>
            {/* ── Welcome ── */}
            <section className="ad-welcome">
                <div>
                    <p className="ad-welcome__greeting">Welcome back, {auth?.user?.firstname || 'there'}!</p>
                    <p className="ad-welcome__date">{today}</p>
                </div>
                {stats.scope && (
                    <span className="ad-welcome__scope">{stats.scope.name || 'This parish'} only</span>
                )}
                {totalPending > 0
                    ? <span className="ad-welcome__alert">{totalPending} pending approval{totalPending === 1 ? '' : 's'}</span>
                    : <span className="ad-welcome__clear">All caught up!</span>}
            </section>

            {/* ── Stat cards ── */}
            <section className="ad-stat-grid">
                {cards.map(card => (
                    <Link to={card.to} className="ad-stat" key={card.label}>
                        <div className="ad-stat__head">
                            <span className="ad-stat__label">{card.label}</span>
                            <span className="ad-stat__icon"><FontAwesomeIcon icon={card.icon} /></span>
                        </div>
                        <p className="ad-stat__value">{(card.value || 0).toLocaleString()}</p>
                        <p className={`ad-stat__sub ${card.pending ? 'ad-stat__sub--alert' : ''}`}>
                            {card.sub ?? `${card.pending || 0} pending`}
                        </p>
                    </Link>
                ))}

                {isAdmin && (
                    <Link to="/admin/payments" className="ad-stat">
                        <div className="ad-stat__head">
                            <span className="ad-stat__label">Revenue</span>
                            <span className="ad-stat__icon"><FontAwesomeIcon icon={faSackDollar} /></span>
                        </div>
                        <p className="ad-stat__value">{fmtPeso(paidRevenue)}</p>
                        <p className="ad-stat__sub">
                            {paymentRevenue?.paid?.count || 0} paid · {paymentRevenue?.pending?.count || 0} pending
                        </p>
                    </Link>
                )}
            </section>

            {/* ── Analytics summary: the trend of bookings over a period the
                office picks, and how many of each service and kind */}
            <AnalyticsSummary />

            {/* ── The Sunday collection ──
                In place of the analytics the office never used: what came
                in on Sunday, entered by the staff who counted it. */}
            <div className="ad-section-hd">
                <h2>Financial records</h2>
                <span>Sunday collection, week by week</span>
            </div>

            <CollectionLedger />

            {isAdmin && (
                <section className="ad-card">
                    <header className="ad-card__head">
                        <h3>Paid online, by month</h3>
                        <span className="ad-card__meta">{fmtPeso(paidRevenue)} all-time</span>
                    </header>
                    <GroupedBars
                        labels={analytics.monthLabels}
                        series={[{ label: 'Revenue', data: analytics.revenueByMonth, color: PALETTE[0] }]}
                        formatValue={fmtPeso}
                    />
                </section>
            )}

            {/* ── Recent activity ── */}
            <div className="ad-section-hd"><h2>Recent activity</h2></div>

            <div className="ad-grid ad-grid--3">
                <RecentCard
                    title="Blessings" to="/admin/blessings"
                    rows={recent.blessings} typeKey="blessingType"
                />
                <RecentCard
                    title="Mass Intentions" to="/admin/mass-intentions"
                    rows={recent.massIntentions} typeKey="intentionType"
                />
                <RecentCard
                    title="Sacraments" to="/admin/sacraments"
                    rows={recent.sacraments} typeKey="sacramentType"
                />
            </div>
        </>
    );
}

/* ── Analytics summary ───────────────────────────────────────
   One line per service over the chosen period — by day (the last two
   weeks), week (twelve weeks), month (a year) or year (five years) —
   and, for the same span, the count of each service and of each kind
   under it: so many baptisms, weddings, thanksgivings… */

const PERIODS = [
    { value: 'day',   label: 'Day',   span: 'the last 14 days'   },
    { value: 'week',  label: 'Week',  span: 'the last 12 weeks'  },
    { value: 'month', label: 'Month', span: 'the last 12 months' },
    { value: 'year',  label: 'Year',  span: 'the last 5 years'   },
];

function AnalyticsSummary() {
    const axios = useAxiosPrivate();
    const [period, setPeriod] = useState('month');
    const [data,   setData]   = useState(null);
    const [error,  setError]  = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/analytics', { params: { period } });
                if (alive) { setData(res.data); setError(''); }
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Could not load the analytics.');
            }
        })();
        return () => { alive = false; };
    }, [axios, period]);

    const span   = PERIODS.find(p => p.value === period)?.span;
    // The series in a steady order and colour, whichever period is up
    const series = (data?.services || []).map((sv, i) => ({ label: sv.label, data: sv.data, total: sv.total, color: PALETTE[i % PALETTE.length] }));
    const stale  = data && data.period !== period;   // the old period, while the new one loads

    return (
        <section className="ad-card ad-analytics">
            <div className="ad-analytics__head">
                <div>
                    <h2>Analytics summary</h2>
                    <p>Bookings over {span}, by the day they were made</p>
                </div>
                <Segmented options={PERIODS} value={period} onChange={setPeriod} label="Period" />
            </div>

            {error ? <ErrorText>{error}</ErrorText>
             : !data || stale ? <ChartSkeleton />
             : (
                <>
                    <p className="ad-analytics__total"><b>{data.total.toLocaleString()}</b> booking{data.total === 1 ? '' : 's'} in {span}</p>
                    <LineChart labels={data.labels} series={series} />

                    <div className="ad-summary" style={{ marginTop: 18, marginBottom: 0 }}>
                        {data.services.map((sv, i) => (
                            <div key={sv.key} className="ad-summary__card">
                                <div className="ad-summary__head">
                                    <b><span className="ad-legend__dot" style={{ background: PALETTE[i % PALETTE.length], marginRight: 7 }} />{sv.label}</b>
                                    <span className="ad-summary__n">{sv.total}</span>
                                </div>
                                {sv.kinds.length ? (
                                    <ul className="ad-summary__kinds">
                                        {sv.kinds.slice(0, 8).map(k => <li key={k.name}><span>{k.name}</span><b>{k.count}</b></li>)}
                                        {sv.kinds.length > 8 && <li><span>…and {sv.kinds.length - 8} more</span></li>}
                                    </ul>
                                ) : <span className="ad-summary__none">None in this period</span>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

function RecentCard({ title, to, rows = [], typeKey }) {
    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>{title}</h3>
                <Link to={to} className="ad-card__link">View all</Link>
            </header>

            {rows.length === 0 ? <Empty>No requests yet.</Empty> : (
                <ul className="ad-recent">
                    {rows.map(r => (
                        <li key={r._id}>
                            <div className="ad-recent__body">
                                <b>{r.requestorName}</b>
                                <span>{r[typeKey] || '—'} · {fmtDate(r.preferredDate)}</span>
                            </div>
                            <StatusBadge status={r.status} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
