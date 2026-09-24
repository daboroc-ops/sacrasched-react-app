import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import useAuth from '../../hooks/useAuth';
import { Pagination, ConfirmDialog, Banner, Loading, ErrorText, Empty, Segmented } from '../../components/admin/AdminUI';
import GuestContacts from './GuestContacts';
import { fmtDate, fullName } from '../../utils/format';
import { ROLES } from '../../utils/roles';

/** Highest role a user document holds — the API stores roles as an object. */
const roleOf = user => {
    const codes = Object.values(user.roles || {}).filter(Boolean);
    if (codes.includes(ROLES.Admin))  return 'Admin';
    if (codes.includes(ROLES.Editor)) return 'Editor';
    return 'User';
};

/* Accounts and guests are both "users" to the office, but only one of
   them has a role to grant, so they are listed side by side rather than
   merged into one table. */
const VIEWS = [
    { value: 'accounts', label: 'Accounts' },
    { value: 'guests',   label: 'Guest contacts' }
];

export default function AdminUsers() {
    const axios = useAxiosPrivate();
    const [view, setView] = useState('accounts');
    const { auth } = useAuth();
    const list = useAdminList('/admin-api/users');

    const [query,    setQuery]    = useState('');
    const [toDelete, setToDelete] = useState(null);
    const [busyId,   setBusyId]   = useState(null);
    const [notice,   setNotice]   = useState(null);

    const myId = auth?.user?.id;

    const changeRole = async (user, role) => {
        setBusyId(user._id);
        setNotice(null);
        try {
            await axios.patch(`/admin-api/users/${user._id}/role`, { role });
            setNotice({ tone: 'ok', message: `${fullName(user)} is now ${role}.` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update role.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        setBusyId(toDelete._id);
        try {
            await axios.delete(`/admin-api/users/${toDelete._id}`);
            setNotice({ tone: 'ok', message: 'User deleted.' });
            setToDelete(null);
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to delete user.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <div className="ad-toolbar ad-toolbar--views">
                <Segmented options={VIEWS} value={view} onChange={setView} label="Which people to show" />
            </div>

            {view === 'guests' ? <GuestContacts /> : (
            <>
            <div className="ad-toolbar">
                <form
                    className="ad-search"
                    onSubmit={e => { e.preventDefault(); list.setSearch(query.trim()); }}
                >
                    <span className="ad-search__field">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="ad-search__icon" />
                        <input
                            className="ad-input ad-input--search"
                            placeholder="Search name, username or email"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </span>
                    <button className="ad-btn ad-btn--filled" type="submit">Search</button>
                    {list.search && (
                        <button
                            type="button"
                            className="ad-btn ad-btn--ghost"
                            onClick={() => { setQuery(''); list.setSearch(''); }}
                        >
                            Clear
                        </button>
                    )}
                </form>
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? <Empty>No users match this search.</Empty> : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Parish</th>
                                <th>Joined</th>
                                <th className="ad-table__actions-hd">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(user => {
                                const isSelf = user._id === myId;
                                return (
                                    <tr key={user._id} className={busyId === user._id ? 'ad-row--busy' : ''}>
                                        <td>
                                            <div className="ad-cell-stack">
                                                <b>{fullName(user)}</b>
                                                {isSelf && <span className="ad-tag">you</span>}
                                            </div>
                                        </td>
                                        <td className="ad-mono">{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <select
                                                className="ad-select ad-select--sm"
                                                value={roleOf(user)}
                                                disabled={busyId === user._id || isSelf}
                                                title={isSelf ? 'You cannot change your own role' : undefined}
                                                onChange={e => changeRole(user, e.target.value)}
                                            >
                                                <option value="User">User</option>
                                                <option value="Editor">Editor</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            {user.parishId?.name || <span className="ad-mono">—</span>}
                                        </td>
                                        <td>{fmtDate(user.createdAt)}</td>
                                        <td>
                                            <button
                                                className="ad-icon-btn ad-icon-btn--danger"
                                                disabled={isSelf}
                                                title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                                                onClick={() => setToDelete(user)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onChange={list.setPage} />
            </>
            )}

            {toDelete && (
                <ConfirmDialog
                    title="Delete user?"
                    message={`${fullName(toDelete)} (${toDelete.email}) will be removed permanently. Their submitted requests stay in the system.`}
                    busy={busyId === toDelete._id}
                    onCancel={() => setToDelete(null)}
                    onConfirm={remove}
                />
            )}
        </>
    );
}
