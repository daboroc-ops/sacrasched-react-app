import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faRotate, faEye } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAdminList from '../../hooks/useAdminList';
import useAuth from '../../hooks/useAuth';
import {
    StatusBadge, FilterBar, Pagination, Modal, ConfirmDialog, Banner,
    Loading, ErrorText, Empty, SearchBox, Tabs } from '../../components/admin/AdminUI';
import { RESOURCES, optionsFor, tabsFor, tabCount } from './resources';
import { getDetailFields, expandDetailFields, groupDetailFields } from '../../utils/sacramentDetails';
import { getOccasionFields, asksWhere, wherePlaceholder } from '../../utils/occasionalDetails';
import IntentionFields from '../../components/forms/IntentionFields';
import { summariseIntentions, missingIntentionNames, isNamedSouls, soulsProblem } from '../../utils/intentions';
import { getDocumentFields } from '../../utils/documentDetails';
import IntentionSheet from '../../components/admin/IntentionSheet';
import useAvailability from '../../hooks/useAvailability';
import { fmtTime, enterPlaceholder } from '../../utils/format';

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
import FileLink from '../../components/admin/FileLink';
import PriestSelect from '../../components/admin/PriestSelect';
import BookingDetails from '../../components/admin/BookingDetails';

/* Bookings are kept at UTC midnight of their day */
const dowOfBooking = date => {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
};

/**
 * One screen for all five request collections — blessings, mass intentions,
 * sacraments, document requests and facility bookings. The `resource` prop
 * selects an entry from RESOURCES, which supplies the columns and form fields.
 */
export default function AdminRequests({ resource }) {
    const cfg    = RESOURCES[resource];
    const axios  = useAxiosPrivate();
    const { isAdmin, isStaff } = useAuth();

    const list = useAdminList(cfg.path);

    const [config,  setConfig]  = useState(null);   // parish config for the form dropdowns
    const [showNew, setShowNew] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [viewing,  setViewing]  = useState(null);   // the booking whose details are open
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

    /* The office verified the payment. With the papers, that completes a
       sacrament; either one alone leaves it approved. */
    const setPaid = async (row, paid) => {
        setBusyId(row._id);
        setNotice(null);
        try {
            const res = await axios.patch(`${cfg.path}/${row._id}/paid`, { paid });
            setNotice({ tone: 'ok', message: `Payment ${paid ? 'marked as paid' : 'unmarked'} — status is now "${res.data.status}".` });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to update the payment.' });
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

    /* Give the booking to another of the parish's priests; he is notified. */
    const assignPriest = async (row, priestId) => {
        setBusyId(row._id);
        setNotice(null);
        try {
            await axios.patch(`${cfg.path}/${row._id}/priest`, { priestId: priestId || null });
            const who = (config?.priests || []).find(p => p._id === priestId);
            setNotice({ tone: 'ok', message: who ? `${who.label} will preside — he has been notified.` : 'No priest is set for this booking now.' });
            list.reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not assign the priest.' });
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

                {/* Searching, filtering and acting on the list all belong to
                    the same thought, so they share one line. The search box
                    takes whatever width the rest leaves it. */}
                <div className="ad-toolbar ad-toolbar--main">
                    <SearchBox value={list.search} onSearch={list.setSearch}
                               placeholder="Enter a name, reference, number or kind" />

                    {!cfg.noStatusFilter && (
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
                        <button className="ad-btn ad-btn--ghost ad-btn--icon" onClick={list.reload} title="Refresh">
                            <FontAwesomeIcon icon={faRotate} />
                        </button>
                        <button className="ad-btn ad-btn--filled" onClick={() => setShowNew(true)}>
                            <FontAwesomeIcon icon={faPlus} /> New request
                        </button>
                    </div>
                </div>

                {/* How many, and what the search matched — a quiet line rather
                    than a row of its own. */}
                <p className="ad-count">
                    {list.search
                        ? `${list.total} match${list.total === 1 ? '' : 'es'} for “${list.search}”`
                        : `${list.total} ${cfg.singular}${list.total === 1 ? '' : 's'}`}
                </p>
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
                                {cfg.assignPriest && <th>Presiding priest</th>}
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
                                    {cfg.assignPriest && (
                                        <td>
                                            {/* Admins and editors alike choose who presides */}
                                            {isStaff ? (
                                                <PriestSelect
                                                    className="ad-select ad-select--sm"
                                                    priests={config?.priests || []}
                                                    dow={dowOfBooking(row.preferredDate)}
                                                    value={row.priestId}
                                                    disabled={busyId === row._id}
                                                    emptyLabel="Not drawn yet"
                                                    onChange={v => assignPriest(row, v)}
                                                />
                                            ) : (row.priest || <span className="ad-muted">—</span>)}
                                        </td>
                                    )}
                                    <td><StatusBadge status={row.status} /></td>
                                    <td>
                                        <div className="ad-row-actions">
                                            {/* Everything this parishioner filled in */}
                                            {cfg.details && (
                                                <button
                                                    type="button"
                                                    className="ad-btn ad-btn--ghost ad-btn--sm ad-view-btn"
                                                    onClick={() => setViewing(row)}
                                                >
                                                    <FontAwesomeIcon icon={faEye} /> View details
                                                </button>
                                            )}
                                            {/* A status that follows payment is shown, not set.
                                                For a sacrament, what the office does set is
                                                whether the papers are in. */}
                                            {(cfg.requirements || cfg.paidTick) && !['cancelled', 'rejected'].includes(row.status) ? (
                                                /* A sacrament: either tick approves it, both complete it.
                                                   A blessing or an occasional Mass: "Paid" completes it. */
                                                <div className="ad-checks">
                                                    {cfg.requirements && (
                                                        <label className="ad-check" title="Papers complete and paid = completed">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(row.requirementsComplete)}
                                                                disabled={busyId === row._id}
                                                                onChange={e => setRequirements(row, e.target.checked)}
                                                            />
                                                            Papers complete
                                                        </label>
                                                    )}
                                                    <label className="ad-check" title={cfg.requirements
                                                        ? 'Tick once the payment is verified. Papers complete and paid = completed'
                                                        : 'Tick once the payment is verified — the booking is then completed'}>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(row.paymentVerified)}
                                                            disabled={busyId === row._id}
                                                            onChange={e => setPaid(row, e.target.checked)}
                                                        />
                                                        Paid
                                                    </label>
                                                </div>
                                            ) : cfg.ready && !row.createdByStaff ? (
                                                /* Not for one the office entered itself: it is handed
                                                   over at the counter, completed once paid */
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

            {viewing && (
                <Modal
                    title={`${cfg.singular.replace(/^./, c => c.toUpperCase())} — ${viewing.requestorName || viewing.guest?.name || 'details'}`}
                    wide
                    onClose={() => setViewing(null)}
                >
                    <BookingDetails resource={resource} row={viewing} />
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
        /* The intention block keeps its own shapes, which a flat field list
           cannot seed: the kinds ticked, a name per kind, and the souls. */
        // Where an occasional Mass is held is typed into its details
        if (cfg.hasOccasion) base.venue = '';
        if (cfg.intentionFields) {
            Object.assign(base, {
                intentionType: '', intentionTypes: [], intentionNames: {},
                intentionFor: '', souls: [], purpose: '',
            });
        }
        return base;
    }, [cfg]);

    const [form,    setForm]    = useState(initial);
    const [details, setDetails] = useState({});
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const set = (name, value) => setForm(f => ({ ...f, [name]: value }));

    /* A walk-in with no number of their own: the field starts with the
       parish's number (Configuration → Parish), so nothing is filed blank */
    const parishField = cfg.fields.find(f => f.parishDefault);
    const [parishNumber, setParishNumber] = useState('');
    useEffect(() => {
        if (!parishField) return;
        let alive = true;
        axios.get('/admin-api/config/parish').then(res => {
            const n = String(res.data?.contactPhone || res.data?.visit?.mobile || '').trim();
            if (!alive || !n) return;
            setParishNumber(n);
            setForm(f => (f[parishField.name] ? f : { ...f, [parishField.name]: n }));
        }).catch(() => {});
        return () => { alive = false; };
    }, [axios, parishField]);

    // Sacraments show extra fields once a type is picked (baptism, wedding, …);
    // an occasional Mass the details of its occasion
    const detailFields = cfg.hasDetails     ? expandDetailFields(getDetailFields(form.sacramentType), details)
                       : cfg.hasOccasion    ? getOccasionFields(form.massType)
                       : cfg.hasDocDetails  ? getDocumentFields(form.documentType)
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
        /* The same checks the parishioner's form makes, before anything is
           sent: a kind chosen, every soul named, and a name against each
           kind that takes one. */
        if (cfg.intentionFields) {
            const kinds = form.intentionTypes || [];
            if (!kinds.length) { setError('Choose at least one kind of intention.'); return; }
            if (kinds.some(isNamedSouls)) {
                const problem = soulsProblem(form.souls || []);
                if (problem) { setError(problem); return; }
            }
            const unnamed = missingIntentionNames(kinds, form.intentionNames);
            if (unnamed.length) { setError('Say who the ' + unnamed[0] + ' is offered for.'); return; }
        }
        if (cfg.hasOccasion && asksWhere(form.massType) && !String(form.venue || '').trim()) {
            setError('Say where the Mass will be held.'); return;
        }

        setSaving(true);
        setError('');
        try {
            await axios.post(cfg.path, {
                ...form,
                ...(cfg.hasDetails || cfg.hasOccasion || cfg.hasDocDetails ? { details } : {}),
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

            {/* The kinds, their names and the departed — the same block the
                parishioner fills in, so the counter records the same thing. */}
            {cfg.intentionFields && (
                <div className="ad-form__grid ad-form__grid--intentions">
                    <IntentionFields
                        items={(config?.serviceCategories || []).find(c => /mass intention/i.test(c.name))?.items || []}
                        types={form.intentionTypes || []}
                        souls={form.souls || []}
                        names={form.intentionNames || {}}
                        purpose={form.purpose || ''}
                        onTypes={v => setForm(f => ({
                            ...f, intentionTypes: v, intentionType: v.join(', '),
                            intentionFor: summariseIntentions(v, f.intentionNames, f.souls),
                        }))}
                        onSouls={v => setForm(f => ({
                            ...f, souls: v,
                            intentionFor: summariseIntentions(f.intentionTypes, f.intentionNames, v),
                        }))}
                        onNames={v => setForm(f => ({
                            ...f, intentionNames: v,
                            intentionFor: summariseIntentions(f.intentionTypes, v, f.souls),
                        }))}
                        onPurpose={v => setForm(f => ({ ...f, purpose: v }))}
                    />
                </div>
            )}

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
                                    placeholder={field.placeholder || enterPlaceholder(field.label)}
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
                                    placeholder={field.placeholder || enterPlaceholder(field.label)}
                                    value={form[field.name]}
                                    required={field.required}
                                    onChange={e => set(field.name, e.target.value)}
                                />
                            )}
                            {field.parishDefault && (
                                <small className="ad-field__hint">
                                    {parishNumber
                                        ? (form[field.name] === parishNumber
                                            ? "The parish's number, for a walk-in with none. Replace it if they have one."
                                            : <>Leave it as the parish's number (<button type="button" className="ad-linkbtn" onClick={() => set(field.name, parishNumber)}>{parishNumber}</button>) if they have none.</>)
                                        : 'The parish has no contact number saved (Configuration → Parish), so enter one.'}
                                </small>
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
                                        placeholder={f.placeholder || enterPlaceholder(f.label)}
                                        onChange={e => setDetails(d => ({ ...d, [f.key]: e.target.value }))}
                                    />
                                    )
                                )}
                            </label>
                            ))
                        ])}
                        {/* The same question the parishioner's form asks, in the same place */}
                        {cfg.hasOccasion && asksWhere(form.massType) && (
                            <label className="ad-field ad-field--full">
                                <span className="ad-field__label">Where will the Mass be held?<em> *</em></span>
                                <input
                                    className="ad-input"
                                    value={form.venue || ''}
                                    required
                                    placeholder={wherePlaceholder(form.massType)}
                                    onChange={e => set('venue', e.target.value)}
                                />
                            </label>
                        )}
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
