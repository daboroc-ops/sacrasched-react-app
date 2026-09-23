const fmtTime = v => {
    if (!v) return '';
    const [h, m] = String(v).split(':').map(Number);
    if (Number.isNaN(h)) return v;
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const longDate = iso => {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * "When?" — the date and the time, for every booking form.
 *
 * When the date came from the calendar it is shown, not asked again. The
 * times are whatever the parish offers on that day (from useAvailability):
 * its own Masses for an intention, a wedding's fixed slots, office hours —
 * minus anything already taken or already past. A closed day says why.
 */
export default function WhenFields({ form, setForm, fixedDate = false, avail, months = 3, timeLabel = 'Preferred Time', beforeTime = null, children }) {
    return (
        <>
            {fixedDate ? (
                <div className="form-group">
                    <label className="form-label">Date</label>
                    <div className="fee-display fee-display--active">{longDate(form.preferredDate)}</div>
                </div>
            ) : (
                <div className="form-group">
                    <label className="form-label">Preferred Date <span className="req">*</span></label>
                    <input className="form-input" type="date" min={todayStr()} max={avail?.window?.to || undefined}
                           value={form.preferredDate}
                           onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value, preferredTime: '' }))} />
                    <p className="form-hint">Bookings are taken up to {months} month{months === 1 ? '' : 's'} ahead.</p>
                </div>
            )}
            {beforeTime}
            <div className="form-group">
                <label className="form-label">{timeLabel} <span className="req">*</span></label>
                {!form.preferredDate ? (
                    <p className="form-hint">Select a date first to load the available times.</p>
                ) : avail.loading ? (
                    <p className="form-hint">Loading the available times…</p>
                ) : !avail.ok ? (
                    <p className="form-error">{avail.reason}</p>
                ) : (
                    <select className="form-select" value={form.preferredTime}
                            onChange={e => setForm(p => ({ ...p, preferredTime: e.target.value }))}>
                        <option value="">— Select time —</option>
                        {avail.times.map(t => (
                            <option key={t.time} value={t.time}>
                                {fmtTime(t.time)}{t.label ? ` — ${t.label}` : ''}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            {children}
        </>
    );
}
