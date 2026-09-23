import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faRotate } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import useAuth from '../../hooks/useAuth';
import {
    StatusBadge, FilterBar, Pagination, Modal, ConfirmDialog, Banner,
    Loading, ErrorText, Empty, SearchBox, Tabs } from '../../components/admin/AdminUI';
import { RESOURCES, optionsFor, tabsFor, tabCount } from './resources';
import { getDetailFields, expandDetailFields, groupDetailFields } from '../../utils/sacramentDetails';
import { getOccasionFields } from '../../utils/occasionalDetails';
import IntentionSheet from '../../components/admin/IntentionSheet';
import useAvailability from '../../hooks/useAvailability';
import { fmtTime } from '../../utils/format';

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
import FileLink from '../../components/admin/FileLink';

/**
 * One screen for all five request collections — blessings, mass intentions,
 * sacraments, document requests and facility bookings. The `resource` prop
 * selects an entry from RESOURCES, which supplies the columns and form fields.
 */
export default function AdminRequests({ resource }) {
    const cfg    = RESOURCES[resource];
    const axios  = useAxiosPrivate();
    const { isAdmin } = useAuth();

    const list = useAdminList(cfg.path);

    const [config,  setConfig]  = useState(null);   // parish config for the form dropdowns
    const [showNew, setShowNew] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [busyId,  setBusyId]  = useState(null);
    const [notice,  setNotice]  = useState(null);   // { tone, message }

    // Switching collections remounts this component (see the `key` in App.jsx),
    // so transient dialog/banner state resets on its own.

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/config');
                if (alive) setConfig(res.data);
            } catch {
                if (alive) setConfig({ priests: [], venues: [], serviceCategories: [] });
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    /* The office ticked the papers. With payment in, that is what completes
       a sacrament; the server works the status out and hands the row back. */
    const setRequirements = async (row, complete) => {
        setBusyId(row._id);
        setNotice(null);
        try {
            const res = await axios.patch(`${cfg.path}/${row._id}/requirements`, { complete });
            setNotice({ tone: 'ok', message: `Requirements ${complete ? 'marked complete' : 'reopened'} — status is now "${res.data.status}".` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update requirements.' });
        } finally {
            setBusyId(null);
        }
    };

    /* The document is at the counter — the office's one tick for a document. */
    const setReady = async (row, ready) => {
        setBusyId(row._id);
        try {
            const res = await axios.patch(`${cfg.path}/${row._id}/ready`, { ready });
            setNotice({ tone: 'ok', message: ready ? `Marked ready — status is now "${res.data.status}".` : 'Reopened.' });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not update.' });
        } finally {
            setBusyId(null);
        }
    };

    const changeStatus = async (row, status) => {
        setBusyId(row._id);
        setNotice(null);
        try {
            await axios.patch(`${cfg.path}/${row._id}/status`, { status });
            setNotice({ tone: 'ok', message: `Status updated to "${status}".` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update status.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        setBusyId(toDelete._id);
        try {
            await axios.delete(`${cfg.path}/${toDelete._id}`);
            setNotice({ tone: 'ok', message: `${cfg.singular} deleted.` });
            setToDelete(null);
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to delete record.' });
        } finally {
            setBusyId(null);
        }
    };

    const created = () => {
        setShowNew(false);
        setNotice({ tone: 'ok', message: `New ${cfg.singular} created.` });
        list.reload();
    };

    /* The tabs the list is organised by — Wedding / Baptism / Confirmation,
       or every kind of intention the parish offers — with a count each */
    const tabs      = tabsFor(cfg, config);
    const tabCounts = Object.fromEntries(tabs.map(t => [t.match, tabCount(t, list.typeCounts)]));
    const allCount  = Object.values(list.typeCounts || {}).reduce((a, b) => a + b, 0);

    return (
        <>
            {/* Everything the office steers the list with stays put under
                the header while the rows scroll beneath it. */}
            <div className="ad-sticky">
                {tabs.length > 0 && (
                    <div className="ad-toolbar ad-toolbar--tabs">
                        <Tabs tabs={tabs} value={list.type} onChange={list.setType}
                              counts={tabCounts} total={allCount || list.total} />
                    </div>
                )}

                <div className="ad-toolbar">
                    {cfg.noStatusFilter ? (
                        <span className="ad-muted">{list.total} {cfg.singular}{list.total === 1 ? '' : 's'}</span>
                    ) : (
                        <FilterBar
                            options={['all', ...(cfg.filterStatuses || cfg.statuses)]}
                            value={list.status}
                            onChange={list.setStatus}
                            counts={list.statusCounts}
                            total={Object.values(list.statusCounts || {}).reduce((a, b) => a + b, 0) || list.total}
                        />
                    )}
                    <div className="ad-toolbar__actions">
                        {cfg.exportSheet && <IntentionSheet />}
                        <button className="ad-btn ad-btn--ghost" onClick={list.reload} title="Refresh">
                            <FontAwesomeIcon icon={faRotate} />
                        </button>
                        <button className="ad-btn ad-btn--filled" onClick={() => setShowNew(true)}>
                            <FontAwesomeIcon icon={faPlus} /> New request
                        </button>
                    </div>
                </div>

                <div className="ad-toolbar ad-toolbar--search">
                    <SearchBox value={list.search} onSearch={list.setSearch}
                               placeholder={`Search ${cfg.plural || cfg.singular + 's'} — name, reference, number, kind…`} />
                    {list.search && <span className="ad-muted">{list.total} match{list.total === 1 ? '' : 'es'} for “{list.search}”</span>}
                </div>
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {list.loading ? <Loading /> :
             list.error   ? <ErrorText>{list.error}</ErrorText> :
             list.items.length === 0 ? <Empty>No {cfg.title.toLowerCase()} found for this filter.</Empty> : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                {cfg.columns.map(c => <th key={c.key}>{c.label}</th>)}
                                {cfg.attachments && <th>Papers</th>}
                                <th>Status</th>
                                <th className="ad-table__actions-hd">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(row => (
                                <tr key={row._id} className={busyId === row._id ? 'ad-row--busy' : ''}>
                                    {cfg.columns.map(c => <td key={c.key}>{c.render(row)}</td>)}
                                    {cfg.attachments && (
                                        <td>
                                            {(row.attachments || []).length === 0 ? <span className="ad-muted">—</span> : (
                                                <div className="ad-cell-stack">
                                                    {row.attachments.map(f => (
                                                        <FileLink key={f.key} file={f} />
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td><StatusBadge status={row.status} /></td>
                                    <td>
                                        <div className="ad-row-actions">
                                            {/* A status that follows payment is shown, not set.
                                                For a sacrament, what the office does set is
                                                whether the papers are in. */}
                                            {cfg.requirements ? (
                                                <label className="ad-check" title="Paid and complete = completed">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(row.requirementsComplete)}
                                                        disabled={busyId === row._id}
                                                        onChange={e => setRequirements(row, e.target.checked)}
                                                    />
                                                    Papers complete
                                                </label>
                                            ) : cfg.ready ? (
                                                <label className="ad-check" title="Paid and ready = completed; the requester is texted">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(row.readyForPickup)}
                                                        disabled={busyId === row._id}
                                                        onChange={e => setReady(row, e.target.checked)}
                                                    />
                                                    Ready for pickup
                                                </label>
                                            ) : cfg.statusAutomatic ? (
                                                null
                                            ) : (
                                                <select
                                                    className="ad-select ad-select--sm"
                                                    value={row.status}
                                                    disabled={busyId === row._id}
                                                    onChange={e => changeStatus(row, e.target.value)}
                                                >
                                                    {cfg.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            )}

                                            {isAdmin && (
                                                <button
                                                    className="ad-icon-btn ad-icon-btn--danger"
                                                    onClick={() => setToDelete(row)}
                                                    title="Delete"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onChange={list.setPage}
            />

            {showNew && (
                <Modal title={`New ${cfg.singular}`} wide onClose={() => setShowNew(false)}>
                    <RequestForm
                        cfg={cfg}
                        config={config}
                        onCancel={() => setShowNew(false)}
                        onCreated={created}
                    />
                </Modal>
            )}

            {toDelete && (
                <ConfirmDialog
                    title={`Delete ${cfg.singular}?`}
                    message="This permanently removes the record. This cannot be undone."
                    busy={busyId === toDelete._id}
                    onCancel={() => setToDelete(null)}
                    onConfirm={remove}
                />
            )}
        </>
    );
}

/* ── Create form ─────────────────────────────────────────────── */

function RequestForm({ cfg, config, onCancel, onCreated }) {
    const axios = useAxiosPrivate();

    const initial = useMemo(() => {
        const base = { status: 'pending' };
        cfg.fields.forEach(f => { base[f.name] = f.defaultValue ?? ''; });
        return base;
    }, [cfg]);

    const [form,    setForm]    = useState(initial);
    const [details, setDetails] = useState({});
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const set = (name, value) => setForm(f => ({ ...f, [name]: value }));

    // Sacraments show extra fields once a type is picked (baptism, wedding, …);
    // an occasional Mass the details of its occasion
    const detailFields = cfg.hasDetails    ? expandDetailFields(getDetailFields(form.sacramentType), details)
                       : cfg.hasOccasion   ? getOccasionFields(form.massType)
                       : [];

    /* The times the parish offers on the chosen day — the same rules the
       landing page books by: that day's Masses for an intention, a
       sacrament's own slots, minus what is taken or already past. */
    const avail = useAvailability({
        service: cfg.service, type: cfg.typeKey ? form[cfg.typeKey] || '' : '', date: form.preferredDate
    });

    /* A new day or a new type changes which times are offered, so the old
       pick does not carry over. */
    const setDate = value => setForm(f => ({ ...f, preferredDate: value, preferredTime: '' }));
    const setType = (name, value) => setForm(f => ({
        ...f, [name]: value, ...(name === cfg.typeKey && 'preferredTime' in f ? { preferredTime: '' } : {})
    }));

    const whenPicker = field => {
        if (field.name === 'preferredDate') return (
            <input className="ad-input" type="date" min={todayStr()} max={avail.window?.to || undefined}
                   value={form.preferredDate} required={field.required}
                   onChange={e => setDate(e.target.value)} />
        );
        if (!form.preferredDate) return <small>Choose the date first to see the times offered.</small>;
        if (avail.loading)       return <small>Loading the times…</small>;
        if (!avail.ok)           return <small className="ad-field__problem">{avail.reason}</small>;
        return (
            <select className="ad-select" value={form.preferredTime} required={field.required}
                    onChange={e => set('preferredTime', e.target.value)}>
                <option value="">— Select —</option>
                {avail.times.map(t => (
                    <option key={t.time} value={t.time}>{fmtTime(t.time)}{t.label ? ` — ${t.label}` : ''}</option>
                ))}
            </select>
        );
    };

    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await axios.post(cfg.path, {
                ...form,
                ...(cfg.hasDetails || cfg.hasOccasion ? { details } : {}),
            });
            onCreated();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to create the record.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ad-form" onSubmit={submit}>
            {error && <Banner tone="bad" message={error} />}

            <div className="ad-form__grid">
                {cfg.fields.map(field => {
                    const options = optionsFor(field.options || field.source, config);
                    return (
                        <label
                            key={field.name}
                            className={`ad-field ${field.type === 'textarea' ? 'ad-field--full' : ''}`}
                        >
                            <span className="ad-field__label">
                                {field.label}{field.required && <em> *</em>}
                            </span>

                            {cfg.service && (field.name === 'preferredDate' || field.name === 'preferredTime') ? (
                                whenPicker(field)
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    className="ad-input"
                                    rows={3}
                                    value={form[field.name]}
                                    onChange={e => set(field.name, e.target.value)}
                                />
                            ) : options.length > 0 ? (
                                <select
                                    className="ad-select"
                                    value={form[field.name]}
                                    required={field.required}
                                    onChange={e => setType(field.name, e.target.value)}
                                >
                                    <option value="">— Select —</option>
                                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input
                                    className="ad-input"
                                    type={field.type || 'text'}
                                    min={field.min}
                                    placeholder={field.placeholder}
                                    value={form[field.name]}
                                    required={field.required}
                                    onChange={e => set(field.name, e.target.value)}
                                />
                            )}
                        </label>
                    );
                })}

                {!cfg.statusAutomatic && (
                    <label className="ad-field">
                        <span className="ad-field__label">Status</span>
                        <select className="ad-select" value={form.status} onChange={e => set('status', e.target.value)}>
                            {cfg.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                )}
            </div>

            {detailFields.length > 0 && (
                <>
                    <p className="ad-form__section">{form.sacramentType || form.massType} details</p>
                    <div className="ad-form__grid">
                        {groupDetailFields(detailFields).map(({ section, fields }) => [
                            section && <p key={`sec-${section}`} className="ad-form__subsection">{section}</p>,
                            ...fields.map(f => (
                            <label key={f.key} className="ad-field">
                                <span className="ad-field__label">{f.label}</span>
                                {(
                                    f.type === 'select' ? (
                                        <select className="ad-select" value={details[f.key] || ''}
                                                onChange={e => setDetails(d => ({ ...d, [f.key]: e.target.value }))}>
                                            <option value="">— Select —</option>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                    <input
                                        className="ad-input"
                                        type={f.type || 'text'}
                                        value={details[f.key] || ''}
                                        placeholder={f.placeholder}
                                        onChange={e => setDetails(d => ({ ...d, [f.key]: e.target.value }))}
                                    />
                                    )
                                )}
                            </label>
                            ))
                        ])}
                    </div>
                </>
            )}

            <div className="ad-form__actions">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={saving}>
                    Cancel
                </button>
                <button type="submit" className="ad-btn ad-btn--filled" disabled={saving}>
                    {saving ? 'Saving…' : 'Create request'}
                </button>
            </div>
        </form>
    );
}
