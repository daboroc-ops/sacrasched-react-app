/** Shared presentational pieces used by all booking forms. */

export const fmtPHP = n =>
    `₱ ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Radio-style card grid for picking a service type */
export function TypeCardPicker({ items, selected, onSelect, fallbackItems, fallbackValue, onFallbackChange }) {
    if (items.length > 0) {
        return (
            <div className="type-grid">
                {items.map(item => (
                    <button
                        key={item.name}
                        type="button"
                        className={`type-card ${selected === item.name ? 'type-card--selected' : ''}`}
                        onClick={() => onSelect(item)}
                    >
                        <span className="type-card__name">{item.name}</span>
                        <span className="type-card__fee">
                            {item.fee > 0 ? fmtPHP(item.fee) : 'Free'}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    // Fallback: simple select when no config items are found
    if (fallbackItems?.length) {
        return (
            <div className="form-group" style={{ marginBottom: 14 }}>
                <select className="form-select" value={fallbackValue} onChange={onFallbackChange} required>
                    <option value="">— Select type —</option>
                    {fallbackItems.map(t => <option key={t}>{t}</option>)}
                </select>
            </div>
        );
    }

    return <p className="config-note">No types configured yet. Contact the parish office.</p>;
}

/** Fee breakdown card shown below the form */
export function FeeSummary({ rows }) {
    const valid = rows.filter(r => r.amount > 0);
    if (!valid.length) return null;
    const total = valid.reduce((s, r) => s + r.amount, 0);
    return (
        <div className="fee-summary">
            <p className="fee-summary__title">Service Fee Estimate</p>
            {valid.map((r, i) => (
                <div key={i} className="fee-row">
                    <span className="fee-row__label">{r.label}</span>
                    <span className="fee-amount">{fmtPHP(r.amount)}</span>
                </div>
            ))}
            <div className="fee-row fee-row--total">
                <span className="fee-row__label">Total</span>
                <span className="fee-amount fee-amount--total">{fmtPHP(total)}</span>
            </div>
        </div>
    );
}

/** Priest dropdown — hidden when no priests configured */
export function PriestSelect({ priests, value, onChange }) {
    if (!priests?.length) return null;
    return (
        <div className="form-group">
            <label className="form-label">Officiant / Priest</label>
            <select className="form-select" value={value} onChange={onChange}>
                <option value="">— Any available —</option>
                {priests.map(p => {
                    const full = `${p.title} ${p.name}`.trim();
                    return <option key={full} value={full}>{full}</option>;
                })}
            </select>
        </div>
    );
}

/** Venue dropdown — hidden when no venues configured */
export function VenueSelect({ venues, value, onChange }) {
    if (!venues?.length) return null;
    return (
        <div className="form-group">
            <label className="form-label">Venue</label>
            <select className="form-select" value={value} onChange={onChange}>
                <option value="">— Select venue —</option>
                {venues.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                ))}
            </select>
        </div>
    );
}
