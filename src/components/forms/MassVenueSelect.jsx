/**
 * Where the Mass is, for an intention on a day when Mass is said in more
 * than one place — Undas at the cemeteries. The choices come from the
 * availability answer (`venues`: each place with a Mass of its own that
 * day), so on an ordinary day there is nothing here at all. The church is
 * always the first choice and keeps its regular schedule; a venue's times
 * are its own, which is why the time is picked after.
 */
export default function MassVenueSelect({ venues = [], value = '', onChange }) {
    if (!venues.length) return null;
    return (
        <div className="form-group">
            <label className="form-label">Venue <span className="req">*</span></label>
            <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
                <option value="">Parish church</option>
                {venues.map(v => (
                    <option key={v.name} value={v.name}>{v.name}{v.description ? ` — ${v.description}` : ''}</option>
                ))}
            </select>
            <p className="form-hint">Mass is also said at these places that day, at their own times.</p>
        </div>
    );
}
