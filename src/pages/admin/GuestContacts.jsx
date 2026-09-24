import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import useAdminList from '../../hooks/useAdminList';
import { Pagination, StatusBadge, Loading, ErrorText, Empty } from '../../components/admin/AdminUI';
import { fmtDate } from '../../utils/format';

/**
 * The people who booked without an account, as contacts rather than as
 * bookings.
 *
 * The same person turns up under several spellings of their name — the API
 * matches them on the email or the number they proved, so they are one row
 * here — and the row opens to show everything they have booked. Reading a
 * reference off this list is the common reason the office comes here: a
 * visitor rings up about "my baptism" and cannot recall the code.
 */
export default function GuestContacts() {
    const list = useAdminList('/admin-api/guests');
    const [query, setQuery] = useState('');
    const [open,  setOpen]  = useState(() => new Set());

    const toggle = key => setOpen(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    return (
        <>
            <div className="ad-toolbar">
                <form className="ad-search"
                      onSubmit={e => { e.preventDefault(); list.setSearch(query.trim()); }}>
                    <span className="ad-search__field">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="ad-search__icon" />
                        <input className="ad-input ad-input--search"
                               placeholder="Search name, email, number or reference"
                               value={query} onChange={e => setQuery(e.target.value)} />
                    </span>
                    <button className="ad-btn ad-btn--filled" type="submit">Search</button>
                    {list.search && (
                        <button type="button" className="ad-btn ad-btn--ghost"
                                onClick={() => { setQuery(''); list.setSearch(''); }}>
                            Clear
                        </button>
                    )}
                </form>
            </div>

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? (
                <Empty>{list.search ? 'No guest matches this search.' : 'Nobody has booked as a guest yet.'}</Empty>
             ) : (
                <div className="ad-table-wrap">
                    <table className="ad-table gc-table">
                        <thead>
                            <tr>
                                <th className="gc-th-toggle" aria-label="Expand" />
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Bookings</th>
                                <th>Last booked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(c => {
                                const isOpen = open.has(c.key);
                                return [
                                    <tr key={c.key}
                                        className={`gc-row${isOpen ? ' gc-row--open' : ''}`}
                                        onClick={() => toggle(c.key)}
                                        aria-expanded={isOpen}
                                        tabIndex={0}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.key); }
                                        }}>
                                        <td className="gc-toggle">
                                            <FontAwesomeIcon
                                                icon={faChevronRight}
                                                className={`gc-chevron${isOpen ? ' gc-chevron--open' : ''}`}
                                            />
                                        </td>
                                        <td>
                                            <div className="ad-cell-stack">
                                                <b>{c.name || <span className="ad-mono">—</span>}</b>
                                                {/* The other names they gave: the office should see it is one person */}
                                                {c.aliases?.length > 0 && (
                                                    <span className="gc-aliases">also: {c.aliases.join(', ')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{c.emails?.length ? c.emails.join(', ') : <span className="ad-mono">—</span>}</td>
                                        <td className="ad-mono">{c.phones?.length ? c.phones.join(', ') : '—'}</td>
                                        <td><span className="gc-count">{c.count}</span></td>
                                        <td>{c.lastAt ? fmtDate(c.lastAt) : '—'}</td>
                                    </tr>,

                                    isOpen && (
                                        <tr key={c.key + ':open'} className="gc-detail">
                                            <td />
                                            <td colSpan={5}>
                                                <ul className="gc-bookings">
                                                    {c.bookings.map(b => (
                                                        <li key={b.reference} className="gc-booking">
                                                            <span className="gc-booking__ref ad-mono">{b.reference}</span>
                                                            <span className="gc-booking__what">
                                                                <b>{b.service}</b>
                                                                {b.kind && <> · {b.kind}</>}
                                                            </span>
                                                            <span className="gc-booking__when">
                                                                {b.date ? fmtDate(b.date) : fmtDate(b.bookedAt)}
                                                            </span>
                                                            <StatusBadge status={b.status} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    )
                                ];
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onChange={list.setPage} />
        </>
    );
}
