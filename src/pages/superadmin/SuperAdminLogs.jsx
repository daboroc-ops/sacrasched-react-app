import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faMagnifyingGlass, faFilterCircleXmark } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Pagination, Loading, ErrorText, Empty } from '../../components/admin/AdminUI';
import { LogRow } from './LogRow';

const CATEGORIES = ['all', 'auth', 'request', 'payment', 'user', 'parish', 'config', 'system'];
const OUTCOMES   = ['all', 'success', 'failure'];

const EMPTY = { items: [], page: 1, totalPages: 1, total: 0 };

/**
 * The audit trail. Read-only on purpose — entries are written by middleware
 * and expire on their own after a year, so nothing here can rewrite history.
 */
export default function SuperAdminLogs() {
    const axios = useAxiosPrivate();

    const [data,    setData]    = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [nonce,   setNonce]   = useState(0);

    const [page,     setPage]     = useState(1);
    const [category, setCategory] = useState('all');
    const [outcome,  setOutcome]  = useState('all');
    const [search,   setSearch]   = useState('');
    const [from,     setFrom]     = useState('');
    const [to,       setTo]       = useState('');
    const [query,    setQuery]    = useState('');   // the text in the box, before Enter

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await axios.get('/superadmin-api/logs', {
                    params: {
                        page,
                        ...(category !== 'all' ? { category } : {}),
                        ...(outcome  !== 'all' ? { outcome }  : {}),
                        ...(search ? { search } : {}),
                        ...(from ? { from } : {}),
                        ...(to   ? { to }   : {}),
                    }
                });
                if (!alive) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!alive) return;
                setError(err?.response?.data?.message || 'Failed to load the audit log.');
                setData(EMPTY);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [axios, page, category, outcome, search, from, to, nonce]);

    /* Any filter change restarts at page 1 and raises the spinner here, so the
       effect above never has to call setState synchronously. */
    const apply = fn => value => { setLoading(true); fn(value); setPage(1); };
    const reload = () => { setLoading(true); setNonce(n => n + 1); };

    const clearFilters = () => {
        setLoading(true);
        setCategory('all'); setOutcome('all');
        setSearch(''); setQuery(''); setFrom(''); setTo('');
        setPage(1);
    };

    const filtered = category !== 'all' || outcome !== 'all' || search || from || to;

    return (
        <>
            <div className="ad-toolbar sa-toolbar">
                <div className="ad-filters">
                    {CATEGORIES.map(c => (
                        <button
                            key={c}
                            className={`ad-filter ${category === c ? 'ad-filter--active' : ''}`}
                            onClick={() => apply(setCategory)(c)}
                        >
                            {c === 'all' ? 'All' : c}
                        </button>
                    ))}
                </div>

                <div className="ad-toolbar__actions">
                    <button className="ad-btn ad-btn--ghost" onClick={reload} title="Refresh">
                        <FontAwesomeIcon icon={faRotate} />
                    </button>
                </div>
            </div>

            <div className="sa-filterbar">
                <form
                    className="ad-search"
                    onSubmit={e => { e.preventDefault(); apply(setSearch)(query.trim()); }}
                >
                    <span className="ad-search__field">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="ad-search__icon" />
                        <input
                            className="ad-input ad-input--search"
                            placeholder="Search actor, action, path or target"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </span>
                </form>

                <label className="sa-filterbar__field">
                    <span>Outcome</span>
                    <select className="ad-select" value={outcome} onChange={e => apply(setOutcome)(e.target.value)}>
                        {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </label>

                <label className="sa-filterbar__field">
                    <span>From</span>
                    <input className="ad-input" type="date" value={from} onChange={e => apply(setFrom)(e.target.value)} />
                </label>

                <label className="sa-filterbar__field">
                    <span>To</span>
                    <input className="ad-input" type="date" value={to} onChange={e => apply(setTo)(e.target.value)} />
                </label>

                {filtered && (
                    <button className="ad-btn ad-btn--ghost" onClick={clearFilters}>
                        <FontAwesomeIcon icon={faFilterCircleXmark} /> Clear
                    </button>
                )}
            </div>

            {loading ? <Loading label="Loading audit log…" /> :
             error   ? <ErrorText>{error}</ErrorText> :
             data.items.length === 0 ? (
                <Empty>{filtered ? 'No entries match these filters.' : 'Nothing has been logged yet.'}</Empty>
             ) : (
                <section className="ad-card">
                    <ul className="sa-loglist">
                        {data.items.map(entry => <LogRow key={entry._id} entry={entry} />)}
                    </ul>
                </section>
             )}

            <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                onChange={p => { setLoading(true); setPage(p); }}
            />
        </>
    );
}
