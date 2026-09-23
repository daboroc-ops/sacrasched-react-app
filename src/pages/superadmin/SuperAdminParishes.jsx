import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrash, faRotate, faMagnifyingGlass, faGlobe,
    faCircleCheck, faCircleXmark, faSpinner, faPen, faPalette, faSackDollar, faImage, faUserSlash,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import {
    Pagination, Modal, ConfirmDialog, Banner, Loading, ErrorText, Empty,
} from '../../components/admin/AdminUI';
import { fmtDate, fmtPeso } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import FadeImg from '../../components/FadeImg';
import CredentialsNotice from '../../components/admin/CredentialsNotice';

const SITE_STATUS = ['none', 'pending', 'live', 'suspended'];

const STATUS_TONE = {
    live:      'ok',
    pending:   'warn',
    suspended: 'bad',
    none:      'muted',
};

const EMPTY = { items: [], page: 1, totalPages: 1, total: 0, baseDomain: '', statusCounts: {} };

export default function SuperAdminParishes() {
    const axios = useAxiosPrivate();

    const [data,    setData]    = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [nonce,   setNonce]   = useState(0);

    const [page,   setPage]   = useState(1);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [query,  setQuery]  = useState('');

    const [showNew,  setShowNew]  = useState(false);
    const [editing,  setEditing]  = useState(null);   // parish being edited
    const [siteFor,  setSiteFor]  = useState(null);   // parish whose website is being managed
    const [toDelete, setToDelete] = useState(null);
    const [busyId,   setBusyId]   = useState(null);
    const [notice,   setNotice]   = useState(null);
    const [issued,   setIssued]   = useState(null);   // freshly created admin credentials

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/superadmin-api/parishes', {
                    params: {
                        page,
                        ...(status !== 'all' ? { siteStatus: status } : {}),
                        ...(search ? { search } : {}),
                    }
                });
                if (!alive) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!alive) return;
                setError(err?.response?.data?.message || 'Failed to load parishes.');
                setData(EMPTY);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, page, status, search, nonce]);

    const reload = () => { setLoading(true); setNonce(n => n + 1); };

    const done = message => {
        setShowNew(false);
        setEditing(null);
        setSiteFor(null);
        setNotice({ tone: 'ok', message });
        reload();
    };

    const remove = async () => {
        setBusyId(toDelete._id);
        try {
            await axios.delete(`/superadmin-api/parishes/${toDelete._id}`);
            setToDelete(null);
            done(`${toDelete.name} deleted.`);
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to delete the parish.' });
            setToDelete(null);
        } finally {
            setBusyId(null);
        }
    };

    /* Quick status flip straight from the table — no dialog for live/suspend */
    const setSiteStatus = async (parish, siteStatus) => {
        setBusyId(parish._id);
        setNotice(null);
        try {
            await axios.patch(`/superadmin-api/parishes/${parish._id}/site`, { siteStatus });
            setNotice({ tone: 'ok', message: `${parish.name}'s site is now ${siteStatus}.` });
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update the site.' });
        } finally {
            setBusyId(null);
        }
    };

    const counts = data.statusCounts || {};

    return (
        <>
            <div className="ad-toolbar">
                <div className="ad-filters">
                    {['all', ...SITE_STATUS].map(s => (
                        <button
                            key={s}
                            className={`ad-filter ${status === s ? 'ad-filter--active' : ''}`}
                            onClick={() => { setLoading(true); setStatus(s); setPage(1); }}
                        >
                            {s === 'all' ? 'All' : s === 'none' ? 'no site' : s}
                            {s !== 'all' && counts[s] != null && <span className="ad-filter__count">{counts[s]}</span>}
                        </button>
                    ))}
                </div>

                <div className="ad-toolbar__actions">
                    <form
                        className="ad-search"
                        onSubmit={e => { e.preventDefault(); setLoading(true); setSearch(query.trim()); setPage(1); }}
                    >
                        <span className="ad-search__field">
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="ad-search__icon" />
                            <input
                                className="ad-input ad-input--search"
                                placeholder="Search parish or subdomain"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </span>
                    </form>
                    <button className="ad-btn ad-btn--ghost" onClick={reload} title="Refresh">
                        <FontAwesomeIcon icon={faRotate} />
                    </button>
                    <button className="ad-btn ad-btn--filled" onClick={() => setShowNew(true)}>
                        <FontAwesomeIcon icon={faPlus} /> New parish
                    </button>
                </div>
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {loading ? <Loading label="Loading parishes…" /> :
             error   ? <ErrorText>{error}</ErrorText> :
             data.items.length === 0 ? <Empty>No parishes match this filter.</Empty> : (
                <div className="sa-parish-grid">
                    {data.items.map(parish => {
                        const linked = Object.values(parish.usage || {}).reduce((a, b) => a + b, 0);
                        return (
                            <article className={`ad-card sa-parish ${busyId === parish._id ? 'ad-row--busy' : ''}`} key={parish._id}>
                                <div className="sa-parish__cover">
                                    {parish.cover
                                        ? <FadeImg src={mediaUrl(parish.cover.url)} alt={parish.cover.alt} />
                                        : <span className="sa-parish__cover-empty">
                                              <FontAwesomeIcon icon={faImage} />
                                              No picture published
                                          </span>}
                                </div>

                                <header className="sa-parish__head">
                                    <div>
                                        <h3>{parish.name}</h3>
                                        <p className="sa-parish__meta">
                                            {parish.code || '—'} · added {fmtDate(parish.createdAt)}
                                            {!parish.active && <span className="ad-tag">inactive</span>}
                                        </p>
                                    </div>
                                    <span className={`ad-badge ad-badge--${STATUS_TONE[parish.siteStatus] || 'muted'}`}>
                                        {parish.siteStatus === 'none' ? 'no site' : parish.siteStatus}
                                    </span>
                                </header>

                                <div className="sa-parish__site">
                                    <FontAwesomeIcon icon={faGlobe} className="sa-parish__globe" />
                                    {parish.siteHost ? (
                                        <span className="sa-parish__host">{parish.siteHost}</span>
                                    ) : (
                                        <span className="sa-parish__host sa-parish__host--empty">No subdomain issued</span>
                                    )}
                                </div>
                                <div className="sa-parish__staff">
                                    {parish.staff?.length ? (
                                        <>
                                            {parish.staff.slice(0, 3).map(u => (
                                                <span className="sa-staff" key={u._id} title={`${u.username} · ${u.email}`}>
                                                    <span className="sa-staff__avatar">
                                                        {(u.name[0] || '?').toUpperCase()}
                                                    </span>
                                                    <span className="sa-staff__text">
                                                        <b>{u.name}</b>
                                                        <em>{u.role}</em>
                                                    </span>
                                                </span>
                                            ))}
                                            {parish.staff.length > 3 && (
                                                <span className="sa-staff sa-staff--more">
                                                    +{parish.staff.length - 3} more
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="sa-parish__staff-empty">
                                            <FontAwesomeIcon icon={faUserSlash} /> No admin assigned
                                        </span>
                                    )}
                                </div>

                                <div className="sa-parish__money">
                                    <span className="sa-parish__amount">
                                        {fmtPeso(parish.offerings?.total || 0)}
                                    </span>
                                    <span className="sa-parish__amount-sub">
                                        {parish.offerings?.count
                                            ? `collected · ${parish.offerings.count} payment${parish.offerings.count === 1 ? '' : 's'}`
                                            : 'nothing collected yet'}
                                    </span>
                                </div>

                                <p className="sa-parish__usage">
                                    {linked === 0
                                        ? 'No records yet'
                                        : `${linked} linked record${linked === 1 ? '' : 's'}`}
                                    {parish.contactEmail && ` · ${parish.contactEmail}`}
                                </p>

                                <footer className="sa-parish__actions">
                                    <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSiteFor(parish)}>
                                        <FontAwesomeIcon icon={faGlobe} /> Website
                                    </button>
                                    <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setEditing(parish)}>
                                        <FontAwesomeIcon icon={faPen} /> Edit
                                    </button>
                                    <Link
                                        className="ad-btn ad-btn--ghost ad-btn--sm"
                                        to={`/superadmin/appearance?parish=${parish._id}`}
                                    >
                                        <FontAwesomeIcon icon={faPalette} /> Appearance
                                    </Link>
                                    <Link
                                        className="ad-btn ad-btn--ghost ad-btn--sm"
                                        to={`/superadmin/offerings?parish=${parish._id}`}
                                    >
                                        <FontAwesomeIcon icon={faSackDollar} /> Offerings
                                    </Link>

                                    {parish.siteStatus === 'live' && (
                                        <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSiteStatus(parish, 'suspended')}>
                                            Suspend
                                        </button>
                                    )}
                                    {['pending', 'suspended'].includes(parish.siteStatus) && (
                                        <button className="ad-btn ad-btn--filled ad-btn--sm" onClick={() => setSiteStatus(parish, 'live')}>
                                            Publish
                                        </button>
                                    )}

                                    <button
                                        className="ad-icon-btn ad-icon-btn--danger sa-parish__delete"
                                        title={linked ? 'Parish has linked records' : 'Delete parish'}
                                        onClick={() => setToDelete(parish)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </footer>
                            </article>
                        );
                    })}
                </div>
             )}

            {issued && (
                <Modal title="Parish admin created" onClose={() => setIssued(null)}>
                    <CredentialsNotice
                        username={issued.username}
                        email={issued.email}
                        password={issued.password}
                        context={issued.parishName}
                        onClose={() => setIssued(null)}
                    />
                </Modal>
            )}

            <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                onChange={p => { setLoading(true); setPage(p); }}
            />

            {showNew && (
                <Modal title="New parish" wide onClose={() => setShowNew(false)}>
                    <ParishForm
                        onProvisioned={(admin, parishName) => setIssued({ ...admin, parishName })}
                        baseDomain={data.baseDomain}
                        onCancel={() => setShowNew(false)}
                        onSaved={() => done('Parish created.')}
                    />
                </Modal>
            )}

            {editing && (
                <Modal title={`Edit ${editing.name}`} wide onClose={() => setEditing(null)}>
                    <ParishForm
                        onProvisioned={(admin, parishName) => setIssued({ ...admin, parishName })}
                        parish={editing}
                        baseDomain={data.baseDomain}
                        onCancel={() => setEditing(null)}
                        onSaved={() => done('Parish updated.')}
                    />
                </Modal>
            )}

            {siteFor && (
                <Modal title={`${siteFor.name} — website`} onClose={() => setSiteFor(null)}>
                    <SiteForm
                        parish={siteFor}
                        baseDomain={data.baseDomain}
                        onCancel={() => setSiteFor(null)}
                        onSaved={() => done('Website settings saved.')}
                    />
                </Modal>
            )}

            {toDelete && (
                <ConfirmDialog
                    title={`Delete ${toDelete.name}?`}
                    message="The parish is removed permanently, along with its subdomain. Parishes that still have bookings or requests cannot be deleted — deactivate them instead."
                    busy={busyId === toDelete._id}
                    onCancel={() => setToDelete(null)}
                    onConfirm={remove}
                />
            )}
        </>
    );
}

/* ── Subdomain field with live availability check ────────────── */

function SubdomainField({ value, onChange, baseDomain, excludeId }) {
    const axios = useAxiosPrivate();
    const wanted = value.trim();

    // Tagged with the value it describes, so a stale answer is never shown
    const [check, setCheck] = useState(null);   // { for, available, reason, host }

    useEffect(() => {
        if (!wanted) return undefined;

        // Debounce — one lookup per pause in typing
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get('/superadmin-api/parishes/check-subdomain', {
                    params: { value: wanted, ...(excludeId ? { excludeId } : {}) }
                });
                setCheck({ for: wanted, ...res.data });
            } catch {
                setCheck({ for: wanted, available: false, reason: 'Could not check availability.' });
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [axios, wanted, excludeId]);

    const result   = check?.for === wanted ? check : null;
    const checking = Boolean(wanted) && !result;

    return (
        <label className="ad-field ad-field--full">
            <span className="ad-field__label">Subdomain</span>

            <div className="sa-subdomain">
                <input
                    className="ad-input"
                    placeholder="st-joseph"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
                <span className="sa-subdomain__suffix">.{baseDomain}</span>
            </div>

            <span className="sa-subdomain__status">
                {checking && <><FontAwesomeIcon icon={faSpinner} spin /> Checking…</>}
                {result?.available && (
                    <span className="sa-ok">
                        <FontAwesomeIcon icon={faCircleCheck} /> {result.host} is available
                    </span>
                )}
                {result && !result.available && (
                    <span className="sa-bad">
                        <FontAwesomeIcon icon={faCircleXmark} /> {result.reason}
                    </span>
                )}
                {!wanted && 'Leave blank if this parish does not want a website yet.'}
            </span>
        </label>
    );
}

/* ── Create / edit a parish ──────────────────────────────────── */

function ParishForm({ parish, baseDomain, onCancel, onSaved, onProvisioned }) {
    const axios = useAxiosPrivate();
    const editing = Boolean(parish);

    const [form, setForm] = useState({
        name:         parish?.name         || '',
        code:         parish?.code         || '',
        address:      parish?.address      || '',
        diocese:      parish?.diocese      || '',
        contactEmail: parish?.contactEmail || '',
        contactPhone: parish?.contactPhone || '',
        notes:        parish?.notes        || '',
        active:       parish?.active ?? true,
    });
    const [subdomain, setSubdomain] = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editing) {
                await axios.patch(`/superadmin-api/parishes/${parish._id}`, form);
            } else {
                const res = await axios.post('/superadmin-api/parishes', { ...form, subdomain });
                // The password in here is the only copy; hand it straight up.
                if (res.data?.admin?.password) onProvisioned?.(res.data.admin, res.data.name);
            }
            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save the parish.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ad-form" onSubmit={submit}>
            {error && <Banner tone="bad" message={error} />}

            <div className="ad-form__grid">
                <label className="ad-field">
                    <span className="ad-field__label">Parish name<em> *</em></span>
                    <input className="ad-input" value={form.name} required onChange={e => set('name', e.target.value)} />
                </label>

                <label className="ad-field">
                    <span className="ad-field__label">Short code</span>
                    <input className="ad-input" placeholder="SJP" value={form.code} onChange={e => set('code', e.target.value)} />
                </label>

                <label className="ad-field ad-field--full">
                    <span className="ad-field__label">Address</span>
                    <input className="ad-input" value={form.address} onChange={e => set('address', e.target.value)} />
                </label>

                <label className="ad-field ad-field--full">
                    <span className="ad-field__label">Diocese</span>
                    <input className="ad-input" placeholder="e.g. Diocese of Legazpi" value={form.diocese} onChange={e => set('diocese', e.target.value)} />
                </label>

                <label className="ad-field">
                    <span className="ad-field__label">Contact email</span>
                    <input className="ad-input" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                </label>

                <label className="ad-field">
                    <span className="ad-field__label">Contact number</span>
                    <input className="ad-input" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                </label>

                {!editing && (
                    <SubdomainField value={subdomain} onChange={setSubdomain} baseDomain={baseDomain} />
                )}

                <label className="ad-field ad-field--full">
                    <span className="ad-field__label">Notes</span>
                    <textarea className="ad-input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
                </label>

                {editing && (
                    <label className="ad-field ad-field--full sa-checkbox">
                        <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
                        <span>Active — appears in the parish selector on booking forms</span>
                    </label>
                )}
            </div>

            <div className="ad-form__actions">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn--filled" disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Create parish'}
                </button>
            </div>
        </form>
    );
}

/* ── Website / subdomain management ──────────────────────────── */

function SiteForm({ parish, baseDomain, onCancel, onSaved }) {
    const axios = useAxiosPrivate();

    const [subdomain,  setSubdomain]  = useState(parish.subdomain || '');
    const [siteStatus, setSiteStatus] = useState(parish.siteStatus || 'none');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await axios.patch(`/superadmin-api/parishes/${parish._id}/site`, {
                subdomain,
                siteStatus: subdomain.trim() ? siteStatus : 'none',
            });
            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update the website.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ad-form" onSubmit={submit}>
            {error && <Banner tone="bad" message={error} />}

            <div className="ad-form__grid">
                <SubdomainField
                    value={subdomain}
                    onChange={setSubdomain}
                    baseDomain={baseDomain}
                    excludeId={parish._id}
                />

                <label className="ad-field ad-field--full">
                    <span className="ad-field__label">Status</span>
                    <select
                        className="ad-select"
                        value={siteStatus}
                        disabled={!subdomain.trim()}
                        onChange={e => setSiteStatus(e.target.value)}
                    >
                        <option value="pending">Pending — reserved, not serving yet</option>
                        <option value="live">Live — the site answers on this host</option>
                        <option value="suspended">Suspended — host returns "unavailable"</option>
                    </select>
                </label>
            </div>

            <p className="sa-hint">
                Clearing the subdomain retires the website. Point a DNS record for
                <code> *.{baseDomain}</code> at this server and the app resolves the parish
                from the host it was reached on.
            </p>

            <div className="ad-form__actions">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={saving}>Cancel</button>
                <button type="submit" className="ad-btn ad-btn--filled" disabled={saving}>
                    {saving ? 'Saving…' : 'Save website'}
                </button>
            </div>
        </form>
    );
}
