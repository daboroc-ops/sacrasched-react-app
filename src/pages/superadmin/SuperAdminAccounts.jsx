import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faTrash, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import useAuth from '../../hooks/useAuth';
import { Pagination, Banner, Loading, ErrorText, Empty, ConfirmDialog, Modal } from '../../components/admin/AdminUI';
import CredentialsNotice from '../../components/admin/CredentialsNotice';
import { fmtDate, fullName } from '../../utils/format';
import { ROLES } from '../../utils/roles';

const ROLE_ORDER = ['User', 'Editor', 'Admin', 'SuperAdmin'];

const roleOf = user => {
    const codes = Object.values(user.roles || {}).filter(Boolean);
    if (codes.includes(ROLES.SuperAdmin)) return 'SuperAdmin';
    if (codes.includes(ROLES.Admin))      return 'Admin';
    if (codes.includes(ROLES.Editor))     return 'Editor';
    return 'User';
};

const TONE = { SuperAdmin: 'bad', Admin: 'ok', Editor: 'info', User: 'muted' };

/**
 * Role management across the whole platform. This is the only place the
 * SuperAdmin role can be granted — the parish admin dashboard tops out at Admin.
 */
export default function SuperAdminAccounts() {
    const axios = useAxiosPrivate();
    const { auth } = useAuth();
    const list = useAdminList('/superadmin-api/users');

    const [query,    setQuery]    = useState('');
    const [busyId,   setBusyId]   = useState(null);
    const [notice,   setNotice]   = useState(null);
    const [parishes, setParishes] = useState([]);
    const [pendingDelete, setPendingDelete] = useState(null);   // the account awaiting confirmation
    const [showNew,  setShowNew]  = useState(false);
    const [issued,   setIssued]   = useState(null);   // credentials to show once

    // Parish list for the assignment dropdown
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/superadmin-api/parishes', { params: { limit: 100 } });
                if (alive) setParishes(res.data.items || []);
            } catch {
                if (alive) setParishes([]);
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    const myId = auth?.user?.id;

    const changeRole = async (user, role) => {
        setBusyId(user._id);
        setNotice(null);
        try {
            await axios.patch(`/superadmin-api/users/${user._id}/role`, { role });
            setNotice({ tone: 'ok', message: `${fullName(user)} is now ${role}.` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update the role.' });
        } finally {
            setBusyId(null);
        }
    };

    const changeParish = async (user, parishId) => {
        setBusyId(user._id);
        setNotice(null);
        try {
            await axios.patch(`/superadmin-api/users/${user._id}/parish`, { parishId });
            const name = parishes.find(p => p._id === parishId)?.name;
            setNotice({
                tone: 'ok',
                message: name
                    ? `${fullName(user)} now administers ${name}.`
                    : `${fullName(user)} is no longer tied to a parish.`
            });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to assign the parish.' });
        } finally {
            setBusyId(null);
        }
    };

    const deleteAccount = async () => {
        const user = pendingDelete;
        setBusyId(user._id);
        setNotice(null);
        try {
            await axios.delete(`/superadmin-api/users/${user._id}`);
            setNotice({ tone: 'ok', message: `${fullName(user)}'s account was deleted.` });
            setPendingDelete(null);
            list.reload();
        } catch (err) {
            // The API refuses accounts that still own bookings or payments,
            // and the last superadmin — show its reason rather than a generic one.
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to delete the account.' });
            setPendingDelete(null);
        } finally {
            setBusyId(null);
        }
    };

    return (
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

                <button className="ad-btn ad-btn--filled ad-toolbar__end" onClick={() => setShowNew(true)}>
                    <FontAwesomeIcon icon={faUserPlus} /> New account
                </button>
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? <Empty>No accounts match this search.</Empty> : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Current role</th>
                                <th>Parish</th>
                                <th>Joined</th>
                                <th className="ad-table__actions-hd">Change role</th>
                                <th className="ad-table__actions-hd">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(user => {
                                const role   = roleOf(user);
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
                                        <td><span className={`ad-badge ad-badge--${TONE[role]}`}>{role}</span></td>
                                        <td>
                                            <select
                                                className="ad-select ad-select--sm"
                                                value={user.parishId?._id || user.parishId || ''}
                                                disabled={busyId === user._id || role === 'User'}
                                                title={role === 'User' ? 'Devotees may book at any parish' : 'Parish this staff account administers'}
                                                onChange={e => changeParish(user, e.target.value)}
                                            >
                                                <option value="">{role === 'User' ? 'Any parish' : 'All parishes'}</option>
                                                {parishes.map(p => (
                                                    <option key={p._id} value={p._id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>{fmtDate(user.createdAt)}</td>
                                        <td>
                                            <select
                                                className="ad-select ad-select--sm"
                                                value={role}
                                                disabled={busyId === user._id || isSelf}
                                                title={isSelf ? 'You cannot change your own role' : undefined}
                                                onChange={e => changeRole(user, e.target.value)}
                                            >
                                                {ROLE_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="ad-btn ad-btn--danger ad-btn--sm"
                                                disabled={busyId === user._id || isSelf}
                                                title={isSelf ? 'You cannot delete your own account' : `Delete ${fullName(user)}`}
                                                onClick={() => setPendingDelete(user)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                                <span>Delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
             )}

            {pendingDelete && (
                <ConfirmDialog
                    title={`Delete ${fullName(pendingDelete)}?`}
                    message={
                        `This removes the account permanently — ${pendingDelete.username} will no longer be able to sign in. ` +
                        'Accounts that still have bookings or payments cannot be deleted; change their role to User instead.'
                    }
                    confirmLabel="Delete account"
                    busy={busyId === pendingDelete._id}
                    onConfirm={deleteAccount}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
            {showNew && (
                <Modal title="New account" onClose={() => setShowNew(false)}>
                    <NewAccountForm
                        parishes={parishes}
                        onCancel={() => setShowNew(false)}
                        onCreated={(user, password) => {
                            setShowNew(false);
                            setIssued({ ...user, password });
                            list.reload?.();
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


            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onChange={list.setPage} />

            <p className="sa-hint">
                Granting SuperAdmin gives full platform access, including this page.
                A parish assignment limits an Admin or Editor to that parish's requests,
                payments and users. Both take effect the next time that person signs in.
            </p>
        </>
    );
}

/* ── Creating an account by hand ──────────────────────────────
   The password is not asked for: the server generates one and returns it
   once. An operator typing a password they invented is how "Parish123"
   ends up on five parishes at a time. */
function NewAccountForm({ parishes, onCancel, onCreated }) {
    const axios = useAxiosPrivate();

    const [form, setForm] = useState({
        firstname: '', lastname: '', email: '', username: '',
        role: 'Admin', parishId: '', contactNumber: '',
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const set = f => e => { setForm(p => ({ ...p, [f]: e.target.value })); setError(''); };

    const submit = async e => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await axios.post('/superadmin-api/users', form);
            onCreated(res.data.user, res.data.password);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not create the account.');
        } finally {
            setSaving(false);
        }
    };

    /* Only parish staff are scoped to a parish; a superadmin belongs to the
       platform and a devotee books wherever they like. */
    const needsParish = form.role === 'Admin' || form.role === 'Editor';

    return (
        <form className="ad-form" onSubmit={submit}>
            {error && <div className="form-alert form-alert--error">{error}</div>}

            <div className="ad-form__grid">
                <label className="ad-field">
                    <span>First name <b>*</b></span>
                    <input className="ad-input" value={form.firstname} onChange={set('firstname')} required />
                </label>
                <label className="ad-field">
                    <span>Last name <b>*</b></span>
                    <input className="ad-input" value={form.lastname} onChange={set('lastname')} required />
                </label>
                <label className="ad-field">
                    <span>Email <b>*</b></span>
                    <input className="ad-input" type="email" value={form.email} onChange={set('email')} required />
                </label>
                <label className="ad-field">
                    <span>Username <em>optional</em></span>
                    <input className="ad-input" value={form.username} onChange={set('username')}
                           placeholder="Taken from the email if left blank" />
                </label>
                <label className="ad-field">
                    <span>Role</span>
                    <select className="ad-input" value={form.role} onChange={set('role')}>
                        {ROLE_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </label>
                <label className="ad-field">
                    <span>Parish {needsParish && <b>*</b>}</span>
                    <select className="ad-input" value={form.parishId} onChange={set('parishId')} required={needsParish}>
                        <option value="">— None —</option>
                        {parishes.map(p => (
                            <option key={p._id} value={p._id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
                        ))}
                    </select>
                </label>
            </div>

            <p className="ad-form__note">
                A password is generated and shown once when the account is created.
            </p>

            <div className="ad-form__actions">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Cancel</button>
                <button className="ad-btn ad-btn--filled" disabled={saving}>
                    {saving ? 'Creating…' : 'Create account'}
                </button>
            </div>
        </form>
    );
}
