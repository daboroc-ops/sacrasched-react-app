import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSliders, faClock, faChevronDown, faChevronUp, faXmark, faCalendarDays, faImage, faUpload } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { mediaUrl } from '../../utils/media';
import { Banner, Loading, ErrorText, Empty } from '../../components/admin/AdminUI';
import { fmtPeso } from '../../utils/format';
import SpecificMassesPanel from './SpecificMassesPanel';

/* Sunday first, matching Date#getDay() and the API's `days` object. */
const DAYS = [
    ['sun', 'Sunday'], ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'],
    ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'],
];
const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const TABS = [
    { id: 'mass-schedule', label: 'Mass Schedule' },
    { id: 'priests',       label: 'Priests' },
    { id: 'services',      label: 'Services & Fees' },
    { id: 'venues',        label: 'Venues' },
    { id: 'parish',        label: 'Parish' },
];

/* What the office left the page at — the tab, and which service
   categories it folded away — kept in the browser so coming back (or
   going back) finds it as it was, until it is changed by hand. */
const remembered = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};
const remember = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

/**
 * Parish configuration — the same four sections the EJS admin had, each
 * saved independently through its own PUT so a mistake in one doesn't
 * clobber the others.
 */
export default function AdminConfig() {
    const axios = useAxiosPrivate();

    const [config,  setConfig]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [tab,     setTabState] = useState(() => (TABS.some(t => t.id === remembered('ss.config.tab', '')) ? remembered('ss.config.tab', '') : 'mass-schedule'));
    const setTab = id => { setTabState(id); remember('ss.config.tab', id); };
    const [notice,  setNotice]  = useState(null);
    const [saving,  setSaving]  = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [res, parish] = await Promise.all([
                    axios.get('/admin-api/config'),
                    axios.get('/admin-api/config/parish').catch(() => ({ data: null }))
                ]);
                if (alive) setConfig({ ...res.data, parish: parish.data });
            } catch (err) {
                if (alive) setError(err?.response?.data?.message || 'Failed to load configuration.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    const save = async (section, body, label) => {
        setSaving(section);
        setNotice(null);
        try {
            const res = await axios.put(`/admin-api/config/${section}`, body);
            setConfig(c => (section === 'parish' ? { ...c, parish: res.data } : { ...c, ...res.data }));
            setNotice({ tone: 'ok', message: `${label} saved.` });
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || `Failed to save ${label.toLowerCase()}.` });
        } finally {
            setSaving('');
        }
    };

    if (loading) return <Loading label="Loading configuration…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;

    return (
        <>
            {/* Pinned under the header: the tabs stay put while a long section scrolls */}
            <div className="ad-tabs ad-tabs--sticky">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`ad-tab ${tab === t.id ? 'ad-tab--active' : ''}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {tab === 'mass-schedule' && (
                <>
                    <MassScheduleSection
                        value={config.massSchedule}
                        saving={saving === 'mass-schedule'}
                        onSave={v => save('mass-schedule', v, 'Mass schedule')}
                    />
                    {/* One-off Masses, kept separate from the recurring pattern */}
                    <SpecificMassesPanel />
                </>
            )}
            {tab === 'priests' && (
                <PriestsSection
                    value={config.priests}
                    saving={saving === 'priests'}
                    onSave={v => save('priests', { priests: v }, 'Priests')}
                />
            )}
            {tab === 'services' && (
                <ServicesSection
                    value={config.serviceCategories}
                    saving={saving === 'services'}
                    onSave={v => save('services', { serviceCategories: v }, 'Services')}
                />
            )}
            {tab === 'venues' && (
                <VenuesSection
                    value={config.venues}
                    saving={saving === 'venues'}
                    onSave={v => save('venues', { venues: v }, 'Venues')}
                />
            )}
            {tab === 'parish' && (
                <ParishSection
                    value={config.parish}
                    saving={saving === 'parish'}
                    onSave={v => save('parish', v, 'Parish settings')}
                />
            )}
        </>
    );
}

/* ── Mass schedule ───────────────────────────────────────────── */

/* Each day of the week has its own list. St. Stephen's Wednesday Masses are
   in the other language, its Friday evening one is later, its Saturday
   evening one is the anticipated Sunday Mass — none of which "weekdays /
   Saturdays / Sundays" could say. */
function MassScheduleSection({ value, saving, onSave }) {
    const [days, setDays] = useState(() =>
        Object.fromEntries(DAYS.map(([k]) => [k, (value?.days?.[k] || []).map(t => ({ time: t.time, label: t.label || '' }))]))
    );

    const update = (day, index, patch) => setDays(d => ({
        ...d,
        [day]: d[day].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
    const add    = day => setDays(d => ({ ...d, [day]: [...d[day], { time: '', label: '' }] }));
    const remove = (day, index) => setDays(d => ({ ...d, [day]: d[day].filter((_, i) => i !== index) }));

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Mass schedule</h3>
                <span className="ad-card__meta">Day by day — a Mass intention is offered only the Masses said on that day</span>
            </header>

            <p className="ad-time-note"><FontAwesomeIcon icon={faClock} /> Times are in 24-hour (military) format: 06:30 is 6:30 AM, 17:15 is 5:15 PM.</p>

            <div className="ad-week">
                {DAYS.map(([day, label]) => (
                    <div className="ad-config-col ad-week__day" key={day}>
                        <p className="ad-config-col__title">{label}</p>

                        {days[day].length === 0 && <p className="ad-config-col__empty">No Mass.</p>}

                        {days[day].map((row, i) => (
                            <div className="ad-repeat-row" key={i}>
                                <input
                                    className="ad-input ad-input--time"
                                    type="time"
                                    value={row.time}
                                    onChange={e => update(day, i, { time: e.target.value })}
                                />
                                <input
                                    className="ad-input"
                                    placeholder="Label — English, Bikol…"
                                    value={row.label || ''}
                                    onChange={e => update(day, i, { label: e.target.value })}
                                />
                                <button className="ad-icon-btn ad-icon-btn--danger" onClick={() => remove(day, i)} aria-label="Remove">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        ))}

                        <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => add(day)}>
                            <FontAwesomeIcon icon={faPlus} /> Add time
                        </button>
                    </div>
                ))}
            </div>

            <div className="ad-form__actions">
                <button className="ad-btn ad-btn--filled" disabled={saving} onClick={() => onSave({ days })}>
                    {saving ? 'Saving…' : 'Save mass schedule'}
                </button>
            </div>
        </section>
    );
}

/* ── Priests ─────────────────────────────────────────────────── */

function PriestsSection({ value, saving, onSave }) {
    const [rows, setRows] = useState(value || []);

    const update = (i, patch) => setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Priests</h3>
                <span className="ad-card__meta">
                    Requesters do not pick a priest — the office assigns one. The parish priest is the default,
                    and nothing that needs him is booked on his day off.
                </span>
            </header>

            {rows.length === 0 && <p className="ad-config-col__empty">No priests configured yet.</p>}

            {rows.map((row, i) => (
                <div className="ad-repeat-row" key={i}>
                    <input
                        className="ad-input ad-input--short"
                        placeholder="Title (Fr., Msgr.)"
                        value={row.title || ''}
                        onChange={e => update(i, { title: e.target.value })}
                    />
                    <input
                        className="ad-input"
                        placeholder="Full name"
                        value={row.name || ''}
                        onChange={e => update(i, { name: e.target.value })}
                    />
                    <label className="ad-check" title="The kura paroko — the default celebrant">
                        <input type="radio" name="parish-priest" checked={Boolean(row.parishPriest)}
                               onChange={() => setRows(r => r.map((x, idx) => ({ ...x, parishPriest: idx === i })))} />
                        Parish priest
                    </label>
                    <select
                        className="ad-input ad-input--short"
                        value={row.dayOff ?? ''}
                        onChange={e => update(i, { dayOff: e.target.value === '' ? null : Number(e.target.value) })}
                        title="Day off"
                    >
                        <option value="">No day off</option>
                        {DAYS.map(([k, label]) => <option key={k} value={DAY_INDEX[k]}>Off on {label}s</option>)}
                    </select>
                    <button
                        className="ad-icon-btn ad-icon-btn--danger"
                        onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                        aria-label="Remove"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                </div>
            ))}

            <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setRows(r => [...r, { title: '', name: '' }])}>
                <FontAwesomeIcon icon={faPlus} /> Add priest
            </button>

            <div className="ad-form__actions">
                <button className="ad-btn ad-btn--filled" disabled={saving} onClick={() => onSave(rows)}>
                    {saving ? 'Saving…' : 'Save priests'}
                </button>
            </div>
        </section>
    );
}

/* ── Services & fees ─────────────────────────────────────────── */

function ServicesSection({ value, saving, onSave }) {
    const [cats, setCats] = useState(value || []);

    const updateCat  = (ci, patch) => setCats(c => c.map((cat, i) => (i === ci ? { ...cat, ...patch } : cat)));
    const updateItem = (ci, ii, patch) => setCats(c => c.map((cat, i) =>
        i !== ci ? cat : { ...cat, items: cat.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }
    ));
    const addItem = ci => setCats(c => c.map((cat, i) =>
        i !== ci ? cat : { ...cat, items: [...(cat.items || []), { name: '', fee: 0, slots: [], days: [], requirements: [] }] }
    ));
    const [open, setOpen] = useState(null);   // "ci-ii" of the item whose extras are showing
    // Categories minimised out of the way — by name, and remembered, so they
    // stay minimised across visits until the office opens them again
    const [folded, setFoldedState] = useState(() => remembered('ss.config.folded', {}));
    const setFolded = fn => setFoldedState(f => { const next = fn(f); remember('ss.config.folded', next); return next; });

    /* "08:00, 09:30, 11:00" ⇄ ['08:00', '09:30', '11:00'] */
    const parseTimes = text => text.split(/[,\s]+/).map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t));
    const parseLines = text => text.split('\n').map(t => t.trim()).filter(Boolean);
    const removeItem = (ci, ii) => setCats(c => c.map((cat, i) =>
        i !== ci ? cat : { ...cat, items: cat.items.filter((_, j) => j !== ii) }
    ));

    const total = cats.reduce((sum, c) => sum + (c.items?.length || 0), 0);

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Services & fees</h3>
                <span className="ad-card__meta">{cats.length} categories · {total} services</span>
            </header>

            {cats.map((cat, ci) => (
                <div className="ad-config-group" key={ci}>
                    <div className="ad-repeat-row">
                        <input
                            className="ad-input ad-input--bold"
                            placeholder="Category name"
                            value={cat.name || ''}
                            onChange={e => updateCat(ci, { name: e.target.value })}
                        />
                        <button type="button" className="ad-cat__toggle"
                                onClick={() => setFolded(f => ({ ...f, [cat.name || ci]: !f[cat.name || ci] }))}
                                title={folded[cat.name || ci] ? 'Show the services' : 'Minimise'}>
                            <FontAwesomeIcon icon={folded[cat.name || ci] ? faChevronDown : faChevronUp} />
                            {folded[cat.name || ci] ? `${(cat.items || []).length} services` : 'Minimise'}
                        </button>
                        <button
                            className="ad-icon-btn ad-icon-btn--danger"
                            onClick={() => setCats(c => c.filter((_, i) => i !== ci))}
                            aria-label="Remove category"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>

                    {folded[cat.name || ci] ? null : <div className="ad-config-items">
                        {(cat.items || []).map((item, ii) => (
                            <div className="ad-item" key={ii}>
                                <div className="ad-repeat-row">
                                <input
                                    className="ad-input"
                                    placeholder="Service name"
                                    value={item.name || ''}
                                    onChange={e => updateItem(ci, ii, { name: e.target.value })}
                                />
                                <input
                                    className="ad-input ad-input--short"
                                    type="number"
                                    min="0"
                                    placeholder="Fee"
                                    value={item.fee ?? 0}
                                    onChange={e => updateItem(ci, ii, { fee: e.target.value })}
                                />
                                <span className="ad-fee-preview">{fmtPeso(item.fee)}</span>
                                <button
                                    type="button"
                                    className={`ad-btn ad-btn--ghost ad-btn--sm${(item.slots?.length || item.days?.length || item.requirements?.length) ? ' ad-btn--marked' : ''}`}
                                    onClick={() => setOpen(o => (o === `${ci}-${ii}` ? null : `${ci}-${ii}`))}
                                    title="When it can be booked and what it needs"
                                >
                                    <FontAwesomeIcon icon={faSliders} /> Rules
                                </button>
                                <button
                                    className="ad-icon-btn ad-icon-btn--danger"
                                    onClick={() => removeItem(ci, ii)}
                                    aria-label="Remove service"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                                </div>

                                {/* When it can be booked, and what it needs. Empty means
                                    office hours, any day, nothing to upload. */}
                                {open === `${ci}-${ii}` && (
                                    <div className="ad-rules">
                                        <p className="ad-time-note"><FontAwesomeIcon icon={faClock} /> 24-hour (military) time: 08:00 is 8 AM, 13:30 is 1:30 PM.</p>
                                        <label className="ad-rules__field">
                                            <span>Fixed times</span>
                                            <input
                                                className="ad-input"
                                                placeholder="e.g. 08:00, 09:30, 11:00, 13:30, 15:00 — blank for office hours"
                                                defaultValue={(item.slots || []).join(', ')}
                                                onBlur={e => updateItem(ci, ii, { slots: parseTimes(e.target.value) })}
                                            />
                                        </label>
                                        <div className="ad-rules__field">
                                            <span>Days it can be booked</span>
                                            <div className="ad-rules__days">
                                                {DAYS.map(([k, label]) => {
                                                    const n = DAY_INDEX[k];
                                                    const on = (item.days || []).includes(n);
                                                    return (
                                                        <label key={k} className={`ad-chip${on ? ' ad-chip--on' : ''}`}>
                                                            <input type="checkbox" checked={on}
                                                                   onChange={() => updateItem(ci, ii, {
                                                                       days: on ? item.days.filter(d => d !== n) : [...(item.days || []), n].sort()
                                                                   })} />
                                                            {label.slice(0, 3)}
                                                        </label>
                                                    );
                                                })}
                                                <small>None ticked = any day</small>
                                            </div>
                                        </div>
                                        <label className="ad-rules__field">
                                            <span>Notice needed</span>
                                            <div className="ad-inline">
                                                <span>at least</span>
                                                <input className="ad-input ad-input--short" type="number" min={0} max={365}
                                                       value={item.minLeadDays || 0}
                                                       onChange={e => updateItem(ci, ii, { minLeadDays: parseInt(e.target.value, 10) || 0 })} />
                                                <span>days ahead</span>
                                                <small>60 for two months; 0 for none</small>
                                            </div>
                                        </label>
                                        <label className="ad-rules__field">
                                            <span>Requirements to upload (one per line)</span>
                                            <textarea
                                                className="ad-input"
                                                rows={3}
                                                placeholder={'e.g.\nBirth certificate\nParents\' marriage certificate'}
                                                defaultValue={(item.requirements || []).join('\n')}
                                                onBlur={e => updateItem(ci, ii, { requirements: parseLines(e.target.value) })}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => addItem(ci)}>
                            <FontAwesomeIcon icon={faPlus} /> Add service
                        </button>
                    </div>}
                </div>
            ))}

            <button
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() => setCats(c => [...c, { name: '', items: [] }])}
            >
                <FontAwesomeIcon icon={faPlus} /> Add category
            </button>

            <div className="ad-form__actions">
                <button className="ad-btn ad-btn--filled" disabled={saving} onClick={() => onSave(cats)}>
                    {saving ? 'Saving…' : 'Save services'}
                </button>
            </div>
        </section>
    );
}

/* ── Venues ──────────────────────────────────────────────────── */

function VenuesSection({ value, saving, onSave }) {
    const [rows, setRows] = useState(value || []);

    const update = (i, patch) => setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Venues</h3>
                <span className="ad-card__meta">Places a service can be held</span>
            </header>

            {rows.length === 0 && <p className="ad-config-col__empty">No venues configured yet.</p>}

            {rows.map((row, i) => (
                <div className="ad-venue" key={i}>
                    <div className="ad-repeat-row">
                        <input
                            className="ad-input ad-input--short"
                            placeholder="Venue name"
                            value={row.name || ''}
                            onChange={e => update(i, { name: e.target.value })}
                        />
                        <input
                            className="ad-input"
                            placeholder="Description (optional)"
                            value={row.description || ''}
                            onChange={e => update(i, { description: e.target.value })}
                        />
                        <button
                            className="ad-icon-btn ad-icon-btn--danger"
                            onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                            aria-label="Remove"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>

                    {/* Only on certain dates — a cemetery on All Saints' and All
                        Souls' Day. No dates means always. */}
                    <div className="ad-venue__dates">
                        {(row.dates || []).map((d, di) => (
                            <div className="ad-inline" key={di}>
                                <input className="ad-input ad-input--short" type="date" value={d.from ? String(d.from).slice(0, 10) : ''}
                                       onChange={e => update(i, { dates: row.dates.map((x, k) => (k === di ? { ...x, from: e.target.value } : x)) })} />
                                <span>to</span>
                                <input className="ad-input ad-input--short" type="date" value={d.to ? String(d.to).slice(0, 10) : ''}
                                       onChange={e => update(i, { dates: row.dates.map((x, k) => (k === di ? { ...x, to: e.target.value } : x)) })} />
                                <button className="ad-icon-btn" onClick={() => update(i, { dates: row.dates.filter((_, k) => k !== di) })} aria-label="Remove dates">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                        ))}
                        <button type="button" className="ad-link-btn" onClick={() => update(i, { dates: [...(row.dates || []), { from: '', to: '' }] })}>
                            <FontAwesomeIcon icon={faCalendarDays} /> {row.dates?.length ? 'Add more dates' : 'Only on certain dates…'}
                        </button>
                        {!row.dates?.length && <small className="ad-muted">Available any day.</small>}
                    </div>

                    {/* Mass said here on particular days — Undas at the cemetery:
                        a Mass intention may then be offered here, at these times.
                        The church itself keeps its regular schedule. */}
                    <div className="ad-venue__masses">
                        <span className="ad-venue__masses-hd">Special Mass schedule at this venue</span>
                        {(row.masses || []).map((m, mi) => (
                            <div className="ad-inline" key={mi}>
                                <input className="ad-input ad-input--short" type="date" value={m.date ? String(m.date).slice(0, 10) : ''}
                                       onChange={e => update(i, { masses: row.masses.map((x, k) => (k === mi ? { ...x, date: e.target.value } : x)) })} />
                                <input className="ad-input" placeholder="Times, 24-hour — e.g. 17:00, 18:30"
                                       value={Array.isArray(m.times) ? m.times.join(', ') : (m.times || '')}
                                       onChange={e => update(i, { masses: row.masses.map((x, k) => (k === mi ? { ...x, times: e.target.value } : x)) })} />
                                <button className="ad-icon-btn" onClick={() => update(i, { masses: row.masses.filter((_, k) => k !== mi) })} aria-label="Remove this day">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                        ))}
                        <button type="button" className="ad-link-btn" onClick={() => update(i, { masses: [...(row.masses || []), { date: '', times: '' }] })}>
                            <FontAwesomeIcon icon={faClock} /> {row.masses?.length ? 'Add another day' : 'Add a day with Mass here…'}
                        </button>
                        {!row.masses?.length && <small className="ad-muted">No Mass of its own — intentions are not offered here.</small>}
                    </div>
                </div>
            ))}

            <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setRows(r => [...r, { name: '', description: '', dates: [], masses: [] }])}>
                <FontAwesomeIcon icon={faPlus} /> Add venue
            </button>

            <div className="ad-form__actions">
                <button className="ad-btn ad-btn--filled" disabled={saving} onClick={() => onSave(rows)}>
                    {saving ? 'Saving…' : 'Save venues'}
                </button>
            </div>
        </section>
    );
}

/* ── The parish itself ───────────────────────────────────────── */

/* How far ahead it books, whether Mass intentions are paid online, and the
   activities it wants on its page — SAKOP on Saturdays, the Living Rosary,
   Youth Day — written the way the office writes them on the board. */
/* The parish's logo: uploaded here, it takes the place of the initials
   everywhere the parish is shown — the navbar, the main landing page's
   cards and carousel, the receipts. Published straight to the
   "Parish logo" content slot, the same one Content → Parish logo uses. */
function LogoCard({ logo, onUploaded }) {
    const axios = useAxiosPrivate();
    const input = useRef(null);
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');

    const upload = async file => {
        if (!file) return;
        setBusy(true); setErr('');
        const body = new FormData();
        body.append('image', file);
        body.append('slot', 'parish-logo');
        try {
            const res = await axios.post('/admin-api/media', body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
            onUploaded(res.data?.url || '');
        } catch (e) {
            setErr(e?.response?.data?.message || 'The upload failed. Use a PNG or JPG.');
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    };

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Parish logo</h3>
                <span className="ad-card__meta">Shown in place of the parish's initials — on its page, on the main SacraSched page and on receipts.</span>
            </header>

            <div className="ad-logo">
                <div className={`ad-logo__frame${logo ? '' : ' ad-logo__frame--empty'}`}>
                    {logo ? <img src={mediaUrl(logo)} alt="" /> : <FontAwesomeIcon icon={faImage} />}
                </div>
                <div className="ad-logo__text">
                    <p>{logo ? 'Your logo is published.' : 'No logo yet — the parish\'s initials stand in for it.'}</p>
                    <small>Square works best: a PNG with a transparent background, at least 400 × 400px.</small>
                    {err && <p className="ad-form__error">{err}</p>}
                    <button className="ad-btn ad-btn--filled ad-btn--sm" disabled={busy} onClick={() => input.current?.click()}>
                        <FontAwesomeIcon icon={faUpload} /> {busy ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
                    </button>
                    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden
                           onChange={e => upload(e.target.files?.[0])} />
                </div>
            </div>
        </section>
    );
}

function ParishSection({ value, saving, onSave }) {
    const [logo, setLogo] = useState(value?.logo || '');
    const [settings, setSettings] = useState(() => ({
        advanceMonths:        value?.settings?.advanceMonths ?? 3,
        intentionsPaidOnline: value?.settings?.intentionsPaidOnline !== false,
    }));
    const [diocese, setDiocese] = useState(value?.diocese || '');
    // Where to find us — shown at the foot of the parish's landing page
    const [visit, setVisit] = useState(() => ({
        address:      value?.address      || '',
        contactPhone: value?.contactPhone || '',
        contactEmail: value?.contactEmail || '',
        officeHours:  value?.visit?.officeHours || '',
        mobile:       value?.visit?.mobile      || '',
        map:          value?.visit?.map         || '',
        directions:   value?.visit?.directions  || '',
        facebook:     value?.visit?.facebook    || ''
    }));
    const setV = k => e => setVisit(v => ({ ...v, [k]: e.target.value }));
    const payload = () => ({
        settings, diocese, activities: acts,
        address: visit.address, contactPhone: visit.contactPhone, contactEmail: visit.contactEmail,
        visit: { officeHours: visit.officeHours, mobile: visit.mobile, map: visit.map, directions: visit.directions, facebook: visit.facebook }
    });
    const [acts, setActs] = useState(() => (value?.activities || []).map(a => ({
        name: a.name || '', schedule: a.schedule || ''
    })));

    const update = (i, patch) => setActs(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

    return (
        <>
            <LogoCard logo={logo} onUploaded={setLogo} />

            <section className="ad-card">
                <header className="ad-card__head">
                    <h3>Bookings</h3>
                    <span className="ad-card__meta">The parish's own rules for taking requests</span>
                </header>

                <div className="ad-grid ad-grid--2">
                    <label className="ad-field">
                        <span>Advance booking</span>
                        <div className="ad-inline">
                            <span>up to</span>
                            <input className="ad-input ad-input--short" type="number" min={1} max={24}
                                   value={settings.advanceMonths}
                                   onChange={e => setSettings(s => ({ ...s, advanceMonths: e.target.value }))} />
                            <span>months ahead</span>
                        </div>
                        <small>Same-day bookings are allowed for whatever is still ahead of the clock; Mass intentions close at 4:00 PM.</small>
                    </label>

                    <label className="ad-field">
                        <span>Diocese</span>
                        <input className="ad-input" placeholder="e.g. Diocese of Legazpi" value={diocese}
                               onChange={e => setDiocese(e.target.value)} />
                        <small>Printed on receipts, between the parish's logo and the diocese's (Content → logos).</small>
                    </label>
                </div>

                <div className="ad-form__actions">
                    <button className="ad-btn ad-btn--filled" disabled={saving}
                            onClick={() => onSave(payload())}>
                        {saving ? 'Saving…' : 'Save parish settings'}
                    </button>
                </div>
            </section>

            <section className="ad-card">
                <header className="ad-card__head">
                    <h3>Where to find us</h3>
                    <span className="ad-card__meta">At the foot of the parish page, beside a map. Leave blank what does not apply.</span>
                </header>

                <div className="ad-grid ad-grid--2">
                    <label className="ad-field ad-field--full">
                        <span>Address</span>
                        <input className="ad-input" placeholder="Street, barangay, city, province" value={visit.address} onChange={setV('address')} />
                    </label>
                    <label className="ad-field">
                        <span>Office hours</span>
                        <input className="ad-input" placeholder="e.g. Monday to Saturday, 8:00 AM – 5:00 PM" value={visit.officeHours} onChange={setV('officeHours')} />
                    </label>
                    <label className="ad-field">
                        <span>Phone</span>
                        <input className="ad-input" type="tel" placeholder="Landline — e.g. (052) 123 4567" value={visit.contactPhone} onChange={setV('contactPhone')} />
                    </label>
                    <label className="ad-field">
                        <span>Mobile number</span>
                        <input className="ad-input" type="tel" placeholder="e.g. 0917 000 0000" value={visit.mobile} onChange={setV('mobile')} />
                    </label>
                    <label className="ad-field">
                        <span>Email</span>
                        <input className="ad-input" type="email" placeholder="office@parish.ph" value={visit.contactEmail} onChange={setV('contactEmail')} />
                    </label>
                    <label className="ad-field">
                        <span>Facebook page</span>
                        <input className="ad-input" type="url" placeholder="https://www.facebook.com/…" value={visit.facebook} onChange={setV('facebook')} />
                    </label>
                    <label className="ad-field ad-field--full">
                        <span>Map</span>
                        <input className="ad-input" placeholder="Google Maps embed link, or coordinates like 13.2409, 123.5321 — blank uses the address"
                               value={visit.map} onChange={setV('map')} />
                        <small>In Google Maps: Share → Embed a map → copy the link inside src="…". Coordinates or a place name work too.</small>
                    </label>
                    <label className="ad-field ad-field--full">
                        <span>How to get there</span>
                        <textarea className="ad-input" rows={3} placeholder="Landmarks and directions — e.g. Beside the public market, jeepneys bound for Guilid stop at the gate."
                                  value={visit.directions} onChange={setV('directions')} />
                    </label>
                </div>

                <div className="ad-form__actions">
                    <button className="ad-btn ad-btn--filled" disabled={saving}
                            onClick={() => onSave(payload())}>
                        {saving ? 'Saving…' : 'Save where to find us'}
                    </button>
                </div>
            </section>

            <ChatbotCard value={value?.chatbot} saving={saving} onSave={c => onSave({ chatbot: c })} />
            <MessengerCard value={value?.messenger} saving={saving} onSave={m => onSave({ messenger: m })} />
            <SmsCard />

            <section className="ad-card">
                <header className="ad-card__head">
                    <h3>Parish activities</h3>
                    <span className="ad-card__meta">Shown on the parish page, under the news, and on the devotees' dashboard.</span>
                </header>

                {acts.length === 0 && <p className="ad-config-col__empty">No activities yet.</p>}

                {acts.map((row, i) => (
                    <div className="ad-repeat-row" key={i}>
                        <input className="ad-input" placeholder="Activity — e.g. SAKOP"
                               value={row.name} onChange={e => update(i, { name: e.target.value })} />
                        <input className="ad-input" placeholder="When, in words — e.g. Every Saturday | 5:15 PM"
                               value={row.schedule} onChange={e => update(i, { schedule: e.target.value })} />
                        <button className="ad-icon-btn ad-icon-btn--danger"
                                onClick={() => setActs(r => r.filter((_, idx) => idx !== i))} aria-label="Remove">
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>
                ))}

                <button className="ad-btn ad-btn--ghost ad-btn--sm"
                        onClick={() => setActs(r => [...r, { name: '', schedule: '' }])}>
                    <FontAwesomeIcon icon={faPlus} /> Add activity
                </button>

                <div className="ad-form__actions">
                    <button className="ad-btn ad-btn--filled" disabled={saving}
                            onClick={() => onSave(payload())}>
                        {saving ? 'Saving…' : 'Save activities'}
                    </button>
                </div>
            </section>
        </>
    );
}

/* ── Booking over Messenger ──────────────────────────────────────
   The parish's Facebook Page, connected to the booking bot. The page's
   id says which parish a message is for; the page access token lets the
   bot answer as the page. The token is written here and never shown
   again — the API only says whether one is on file. */
/**
 * The parish's own JotForm assistant.
 *
 * Only the id is kept. The office may paste the whole embed link — that is
 * what JotForm gives them to copy — so the server takes the id out of it.
 */
function ChatbotCard({ value, saving, onSave }) {
    const saved = value?.jotformAgentId || '';
    const [agentId, setAgentId] = useState(saved);

    /* What was saved is the truth: when it changes under us — a reload, a
       save from another tab — the box follows it. Adjusted during the
       render that brings the new value rather than in an effect afterwards,
       so there is no first paint showing the old one. */
    const [lastSaved, setLastSaved] = useState(saved);
    if (lastSaved !== saved) { setLastSaved(saved); setAgentId(saved); }

    const changed = agentId.trim() !== saved;

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Parish assistant (chatbot)</h3>
                <span className="ad-card__meta">{saved ? 'Showing on your parish page' : 'Not set up'}</span>
            </header>

            <p className="ad-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                A chat bubble on your parish page that answers visitors&rsquo; questions — Mass times, requirements,
                office hours — in your parish&rsquo;s own words. Build the agent at <b>jotform.com</b> under AI Agents,
                then paste its link or id here. It appears on your parish page only, never on the booking
                pages or the dashboard. Leave this empty and no bubble shows.
            </p>

            <label className="ad-field">
                <span>JotForm agent link or ID</span>
                <input className="ad-input" autoComplete="off"
                       placeholder="https://agent.jotform.com/0198… — or just the id"
                       value={agentId} onChange={e => setAgentId(e.target.value)} />
                <small>
                    From the agent&rsquo;s Publish tab. Pasting the whole link is fine; the id is taken out of it.
                </small>
            </label>

            <div className="ad-form__actions">
                {saved && (
                    <button className="ad-btn ad-btn--ghost" disabled={saving}
                            onClick={() => { if (window.confirm('Remove the assistant from your parish page?')) { setAgentId(''); onSave({ jotformAgentId: '' }); } }}>
                        Remove
                    </button>
                )}
                <button className="ad-btn ad-btn--filled" disabled={saving || !changed}
                        onClick={() => onSave({ jotformAgentId: agentId.trim() })}>
                    {saving ? 'Saving…' : saved ? 'Update assistant' : 'Add assistant'}
                </button>
            </div>
        </section>
    );
}

function MessengerCard({ value, saving, onSave }) {
    const [pageId, setPageId] = useState(value?.pageId || '');
    const [token,  setToken]  = useState('');
    const connected = Boolean(value?.connected);

    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>Booking over Messenger</h3>
                <span className="ad-card__meta">
                    {connected
                        ? `Connected to page ${value.pageId}${value.connectedAt ? ' since ' + new Date(value.connectedAt).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : ''}`
                        : 'Not connected'}
                </span>
            </header>

            <p className="ad-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Parishioners message your Facebook Page and the bot books for them — Mass intentions, blessings,
                sacraments, documents — with the same rules and fees as the website. Set it up once in the
                Meta app: subscribe the page to the webhook{value?.webhookUrl ? <> <code>{value.webhookUrl}</code></> : null},
                then paste the page's id and access token here.
            </p>

            <div className="ad-grid ad-grid--2">
                <label className="ad-field">
                    <span>Facebook Page ID</span>
                    <input className="ad-input" placeholder="e.g. 103456789012345" value={pageId}
                           onChange={e => setPageId(e.target.value)} inputMode="numeric" />
                    <small>Page → About → Page transparency, or the Meta app's Messenger settings.</small>
                </label>
                <label className="ad-field">
                    <span>Page access token</span>
                    <input className="ad-input" type="password" autoComplete="off"
                           placeholder={connected ? 'On file — paste a new one to replace it' : 'Paste the token from the Meta app'}
                           value={token} onChange={e => setToken(e.target.value)} />
                    <small>Generated in the Meta app under Messenger → Access Tokens. Kept on the server only.</small>
                </label>
            </div>

            <div className="ad-form__actions">
                {connected && (
                    <button className="ad-btn ad-btn--ghost" disabled={saving}
                            onClick={() => { if (window.confirm('Disconnect the page? The bot will stop answering.')) onSave({ disconnect: true }); }}>
                        Disconnect
                    </button>
                )}
                <button className="ad-btn ad-btn--filled" disabled={saving || !pageId.trim() || (!connected && !token.trim())}
                        onClick={() => { onSave({ pageId: pageId.trim(), pageAccessToken: token.trim() }); setToken(''); }}>
                    {saving ? 'Saving…' : connected ? 'Update connection' : 'Connect page'}
                </button>
            </div>
        </section>
    );
}

/* ── SMS notifications ───────────────────────────────────────────
   Texts are sent for three things only — a document ready for pickup,
   an unsettled offering near its deadline, a sacrament's papers still to
   come — so credits are not drained. This card shows how texting is set
   up right now (live, dry-run, or routed to a test number), the last
   texts the system tried to send, and a button to send one test. */
const SMS_PURPOSE_LABEL = {
    'document-ready':        'Document ready for pickup',
    'payment-reminder':      'Payment reminder',
    'requirements-reminder': 'Sacrament requirements',
    'test':                  'Test',
    'otp':                   'Confirmation code',
    'other':                 'Other'
};
const SMS_STATUS_TONE = { sent: 'ok', 'dry-run': 'info', refused: 'muted', failed: 'bad', 'no-key': 'warn' };

function SmsCard() {
    const axios = useAxiosPrivate();
    const [data,   setData]   = useState(null);
    const [error,  setError]  = useState('');
    const [to,     setTo]     = useState('');
    const [busy,   setBusy]   = useState(false);
    const [note,   setNote]   = useState('');

    const load = useCallback(() => axios.get('/admin-api/sms-log', { params: { limit: 40 } })
        .then(res => { setData(res.data); setError(''); })
        .catch(err => setError(err?.response?.data?.message || 'Could not load the SMS log.')), [axios]);
    useEffect(() => { let alive = true; load().finally(() => { if (!alive) return; }); return () => { alive = false; }; }, [load]);

    const test = async () => {
        setBusy(true); setNote('');
        try {
            const res = await axios.post('/admin-api/sms-test', { to });
            setNote(res.data.ok ? 'Sent — check the phone (or the log below in dry-run).' : 'Not sent — see the log below for why.');
            load();
        } catch (err) { setNote(err?.response?.data?.message || 'Could not send.'); }
        finally { setBusy(false); }
    };

    const mode = data?.mode;
    return (
        <section className="ad-card">
            <header className="ad-card__head">
                <h3>SMS notifications</h3>
                <span className="ad-card__meta">
                    {!mode ? '…' : !mode.configured ? 'No SMS key configured'
                     : mode.dryRun ? 'Dry-run — texts are logged, not sent'
                     : mode.testNumber ? `Test mode — every text goes to ${mode.testNumber}`
                     : 'Live — texts go to parishioners'}
                </span>
            </header>

            <p className="ad-muted" style={{ fontSize: 13, marginBottom: 10 }}>
                To keep credits, the system texts for these only:
                {' '}<b>a document ready for pickup</b>, <b>an unsettled payment near its deadline</b>, and
                {' '}<b>sacrament requirements still to be submitted</b>. Booking confirmations, status changes and
                codes are shown on the website and in Messenger instead.
            </p>

            <div className="ad-inline" style={{ marginBottom: 12 }}>
                <input className="ad-input ad-input--short" placeholder="09XXXXXXXXX" value={to} onChange={e => setTo(e.target.value)} inputMode="numeric" style={{ maxWidth: 180 }} />
                <button className="ad-btn ad-btn--ghost ad-btn--sm" disabled={busy || !to.trim()} onClick={test}>{busy ? 'Sending…' : 'Send a test text'}</button>
                {note && <span className="ad-muted" style={{ fontSize: 12.5 }}>{note}</span>}
            </div>

            {error ? <ErrorText>{error}</ErrorText>
             : !data ? <Loading rows={3} cols={4} />
             : data.items.length === 0 ? <Empty>No texts yet. They will appear here as the system sends them.</Empty>
             : (
                <div className="ad-table-wrap">
                    <table className="ad-table">
                        <thead><tr><th>When</th><th>For</th><th>To</th><th>Result</th><th>Message</th></tr></thead>
                        <tbody>
                            {data.items.map(row => (
                                <tr key={row._id}>
                                    <td>{new Date(row.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td>{SMS_PURPOSE_LABEL[row.purpose] || row.purpose}</td>
                                    <td className="ad-mono">{row.to}{row.sentTo && row.sentTo !== row.to ? <><br /><small className="ad-muted">→ {row.sentTo}</small></> : null}</td>
                                    <td><span className={`ad-badge ad-badge--${SMS_STATUS_TONE[row.status] || 'muted'}`}>{row.status}</span>{row.error && <><br /><small className="ad-muted">{row.error}</small></>}</td>
                                    <td style={{ maxWidth: 360, whiteSpace: 'normal', fontSize: 12.5 }}>{row.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
