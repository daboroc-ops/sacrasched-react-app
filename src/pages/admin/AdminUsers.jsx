import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMagnifyingGlass, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import useAuth from '../../hooks/useAuth';
import { Pagination, ConfirmDialog, Banner, Loading, ErrorText, Empty, Segmented, Modal } from '../../components/admin/AdminUI';
import CredentialsNotice from '../../components/admin/CredentialsNotice';
import GuestContacts from './GuestContacts';
import { fmtDate, fullName } from '../../utils/format';
import { ROLES } from '../../utils/roles';

/** Highest role a user document holds — the API stores roles as an object. */
const roleOf = user => {
    const codes = Object.values(user.roles || {}).filter(Boolean);
    if (codes.includes(ROLES.Admin))  return 'Admin';
    if (codes.includes(ROLES.Editor)) return 'Editor';
    if (codes.includes(ROLES.Priest)) return 'Priest';
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
    const [showNew,  setShowNew]  = useState(false);
    const [issued,   setIssued]   = useState(null);    // the new account and its one-time password

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
                            placeholder="Enter a name, username or email"
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

                {/* Only an Admin reaches this page; the account is for this parish */}
                <button className="ad-btn ad-btn--filled ad-toolbar__end" onClick={() => setShowNew(true)}>
                    <FontAwesomeIcon icon={faUserPlus} /> Create New Account
                </button>
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
                                            {/* Priests are the platform owner's to manage */}
                                            {roleOf(user) === 'Priest' ? (
                                                <span className="ad-badge ad-badge--info" title="Managed by the platform owner">Priest</span>
                                            ) : (
                                            <select
                                                className="ad-select ad-select--sm"
                                                value={roleOf(user)}
                                                disabled={busyId === user._id || isSelf}
                                                title={isSelf ? 'You cannot change your own role' : undefined}
                                                onChange={e => changeRole(user, e.target.value)}
                                            >
                                                {/* No "User": accounts here are parish staff */}
                                                {roleOf(user) === 'User' && <option value="User" disabled>User</option>}
                                                <option value="Editor">Editor</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                            )}
                                        </td>
                                        <td>
                                            {user.parishId?.name || <span className="ad-mono">—</span>}
                                        </td>
                                        <td>{fmtDate(user.createdAt)}</td>
                                        <td>
                                            <button
                                                className="ad-icon-btn ad-icon-btn--danger"
                                                disabled={isSelf || roleOf(user) === 'Priest'}
                                                title={isSelf ? 'You cannot delete your own account'
                                                     : roleOf(user) === 'Priest' ? 'Priest accounts are managed by the platform owner' : 'Delete user'}
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

            {showNew && (
                <Modal title="Create New Account" onClose={() => setShowNew(false)}>
                    <NewStaffForm
                        onCancel={() => setShowNew(false)}
                        onCreated={(user, password) => {
                            setShowNew(false);
                            setIssued({ ...user, password });
                            list.reload();
                        }}
                    />
                </Modal>
            )}

            {issued && (
                <Modal title="Account created" onClose={() => setIssued(null)}>
                    <CredentialsNotice
                        username={issued.username}
                        email={issued.email}
                        password={issued.password}
                        context={fullName(issued)}
                        onClose={() => setIssued(null)}
                    />
                </Modal>
            )}
        </>
    );
}

/**
 * A staff account for this parish: an Editor or an Admin. The password is
 * made by the server and shown once, on the next screen.
 */
function NewStaffForm({ onCancel, onCreated }) {
    const axios = useAxiosPrivate();
    const [form, setForm] = useState({ firstname: '', lastname: '', email: '', username: '', contactNumber: '', role: 'Editor' });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async e => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await axios.post('/admin-api/users', form);
            onCreated(res.data.user, res.data.password);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not create the account.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ad-form" onSubmit={submit}>
            {error && <div className="form-alert form-alert--error">{error}</div>}
            <div className="ad-form__grid">
                <label className="ad-field">
                    <span>First name <b>*</b></span>
                    <input className="ad-input" value={form.firstname} onChange={set('firstname')} placeholder="Enter the first name" required />
                </label>
                <label className="ad-field">
                    <span>Last name <b>*</b></span>
                    <input className="ad-input" value={form.lastname} onChange={set('lastname')} placeholder="Enter the last name" required />
                </label>
                <label className="ad-field">
                    <span>Email <b>*</b></span>
                    <input className="ad-input" type="email" value={form.email} onChange={set('email')} placeholder="Enter the email address" required />
                </label>
                <label className="ad-field">
                    <span>Username <em>optional</em></span>
                    <input className="ad-input" value={form.username} onChange={set('username')}
                           placeholder="Enter a username (taken from the email if left blank)" />
                </label>
                <label className="ad-field">
                    <span>Contact number <em>optional</em></span>
                    <input className="ad-input" value={form.contactNumber} onChange={set('contactNumber')} placeholder="Enter the contact number" />
                </label>
                <label className="ad-field">
                    <span>Role</span>
                    <select className="ad-input" value={form.role} onChange={set('role')}>
                        <option value="Editor">Editor</option>
                        <option value="Admin">Admin</option>
                    </select>
                </label>
            </div>
            <div className="ad-form__actions">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn--filled" disabled={saving}>
                    {saving ? 'Creating…' : 'Create account'}
                </button>
            </div>
        </form>
    );
}
