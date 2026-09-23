/**
 * Where a blessing or an occasional Mass will be — one of the parish's
 * venues, or a place of the requester's own.
 *
 * A venue may be on offer only on certain dates (a cemetery on All Saints'
 * and All Souls' Day); only the ones open on the chosen date are listed.
 */
const openOn = (venue, date) => {
    if (!venue?.dates?.length) return true;
    if (!date) return false;
    const [y, m, d] = String(date).split('-').map(Number);
    const t = Date.UTC(y, m - 1, d);
    return venue.dates.some(r => {
        const from = new Date(r.from), to = new Date(r.to);
        return t >= Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
            && t <= Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    });
};

export default function VenueSelect({ venues = [], date = '', value = '', onChange, label = 'Where', hint, required = false }) {
    const open = venues.filter(v => openOn(v, date));
    const custom = value && !open.some(v => v.name === value);

    return (
        <div className="form-group form-group--full">
            <label className="form-label">{label}{required && <> <span className="req">*</span></>}</label>
            {open.length > 0 ? (
                <>
                    <select className="form-select" value={custom ? '__other' : value} onChange={e => onChange(e.target.value === '__other' ? ' ' : e.target.value)}>
                        <option value="">Choose…</option>
                        {open.map(v => <option key={v.name} value={v.name}>{v.name}{v.description ? ` — ${v.description}` : ''}</option>)}
                        <option value="__other">Somewhere else…</option>
                    </select>
                    {custom && (
                        <input className="form-input" style={{ marginTop: 8 }} value={value.trim()} autoFocus
                               onChange={e => onChange(e.target.value || ' ')} placeholder="Address or place" />
                    )}
                </>
            ) : (
                <input className="form-input" value={value} onChange={e => onChange(e.target.value)}
                       placeholder="Address or place — leave blank for the church" />
            )}
            {hint && <p className="form-hint">{hint}</p>}
        </div>
    );
}
