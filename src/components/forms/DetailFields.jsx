/**
 * The type-specific fields of a sacrament or a certificate, rendered from a
 * definition (utils/sacramentDetails, utils/documentDetails) so the guest
 * form and the devotee's form ask exactly the same questions.
 *
 * A field is { key, label, type?, options?, required?, section? }. `type:
 * 'select'` renders its `options`; anything else is an input of that
 * type. Fields that share a `section` sit under a heading with that name —
 * the wedding's Groom and Bride.
 */
import { groupDetailFields } from '../../utils/sacramentDetails';

export default function DetailFields({ fields, values, onChange }) {
    if (!fields?.length) return null;

    return groupDetailFields(fields).map(({ section, fields: list }) => [
        section && <h4 key={`sec-${section}`} className="form-section form-group--full">{section}</h4>,
        ...list.map(f => (
        <div key={f.key} className="form-group">
            <label className="form-label">
                {f.label}{f.required && <> <span className="req">*</span></>}
            </label>
            {f.type === 'select' ? (
                <select className="form-select" value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)}>
                    <option value="">Choose…</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input
                    className="form-input"
                    type={f.type || 'text'}
                    value={values[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => onChange(f.key, e.target.value)}
                />
            )}
        </div>
        ))
    ]);
}
