/**
 * Who presides — one of the parish's priests (from /admin-api/config).
 *
 * Given the day of the week, a priest who is off that day is listed but
 * cannot be chosen; the server refuses it too.
 */
export default function PriestSelect({
    priests = [], dow = null, value, onChange, disabled = false,
    className = 'ad-input ad-input--short', emptyLabel = 'No priest set',
}) {
    return (
        <select
            className={className}
            value={value || ''}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            title="Presiding priest"
            aria-label="Presiding priest"
        >
            <option value="">{emptyLabel}</option>
            {priests.map(p => {
                const off = dow != null && (p.daysOff || []).includes(dow);
                return (
                    <option key={p._id} value={p._id} disabled={off}>
                        {p.label}{off ? ' (day off)' : ''}
                    </option>
                );
            })}
        </select>
    );
}
