import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChurch, faUserShield, faScroll, faSackDollar } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { fmtPeso } from '../../utils/format';
import SuperAdminParishes from './SuperAdminParishes';

/**
 * The platform's front page.
 *
 * The numbers are a strip rather than a wall of cards and charts: the useful
 * thing on opening this console is the list of parishes and what each one's
 * site is doing, so that gets the room. The charts moved out of the way
 * entirely — they were read once and scrolled past every time after.
 */
export default function SuperAdminOverview() {
    const axios = useAxiosPrivate();

    const [data,  setData]  = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/superadmin-api/overview');
                if (alive) setData(res.data);
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || '');
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    /* The strip is a summary, not the page. If it fails to load the parish
       list below is still perfectly usable, so nothing blocks on it. */
    const stats = data && [
        { label: 'Parishes',   icon: faChurch,      value: (data.parishes.total || 0).toLocaleString(),
          sub: `${data.parishes.withSite || 0} with a site` },
        { label: 'Live sites', icon: faGlobe,       value: (data.parishes.byStatus?.live || 0).toLocaleString(),
          sub: `${data.parishes.byStatus?.pending || 0} pending · ${data.parishes.byStatus?.suspended || 0} suspended` },
        { label: 'Accounts',   icon: faUserShield,  value: (data.users.total || 0).toLocaleString(),
          sub: `${data.users.admins || 0} admin · ${data.users.editors || 0} editor`, to: '/superadmin/accounts' },
        { label: 'Offerings',  icon: faSackDollar,  value: fmtPeso(data.payments?.paid?.total || 0),
          sub: `${data.payments?.paid?.count || 0} transactions`, to: '/superadmin/offerings' },
        { label: 'Log entries', icon: faScroll,     value: (data.logs.total || 0).toLocaleString(),
          sub: 'Last 365 days', to: '/superadmin/logs' },
    ];

    return (
        <>
            <section className="sa-strip">
                {!stats
                    ? <p className="sa-strip__loading">{error || 'Loading platform figures…'}</p>
                    : stats.map(s => {
                        const body = (
                            <>
                                <span className="sa-strip__icon"><FontAwesomeIcon icon={s.icon} /></span>
                                <span className="sa-strip__text">
                                    <span className="sa-strip__value">{s.value}</span>
                                    <span className="sa-strip__label">{s.label}</span>
                                    <span className="sa-strip__sub">{s.sub}</span>
                                </span>
                            </>
                        );
                        return s.to
                            ? <Link key={s.label} to={s.to} className="sa-strip__item sa-strip__item--link">{body}</Link>
                            : <div key={s.label} className="sa-strip__item">{body}</div>;
                    })}
            </section>

            {/* The parishes and their subdomains, in full — search, add, and
                every per-parish control, rather than a link to another page. */}
            <SuperAdminParishes />
        </>
    );
}
