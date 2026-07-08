import { useState } from 'react';
import BlessingForm        from './forms/BlessingForm';
import MassIntentionForm   from './forms/MassIntentionForm';
import SacramentForm       from './forms/SacramentForm';
import DocumentRequestForm from './forms/DocumentRequestForm';
import useParishes         from '../hooks/useParishes';

const TABS = [
    { id: 'blessing',  label: 'Blessing'        },
    { id: 'intention', label: 'Mass Intention'   },
    { id: 'sacrament', label: 'Sacrament'        },
    { id: 'document',  label: 'Document Request' },
];

export default function BookServices() {
    const [active, setActive] = useState('blessing');
    const { parishes, loading: parishLoading } = useParishes();
    const [parishId, setParishId] = useState('');

    return (
        <div>
            <p className="page-intro">
                Submit a request below. The parish office will review and confirm your booking.
            </p>

            {/* ── Parish selector ── */}
            <div className="parish-picker">
                <label className="parish-picker__label">Parish</label>
                <select
                    className="form-select"
                    value={parishId}
                    onChange={e => setParishId(e.target.value)}
                    disabled={parishLoading}
                >
                    <option value="">
                        {parishLoading ? 'Loading parishes…' : '— Select a parish —'}
                    </option>
                    {parishes.map(p => (
                        <option key={p._id} value={p._id}>
                            {p.name}{p.code ? ` (${p.code})` : ''}
                        </option>
                    ))}
                </select>
                <p className="parish-picker__hint">
                    Choose which parish you are booking with.
                </p>
            </div>

            {/* Sub-tab bar */}
            <div className="sub-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`sub-tab ${active === t.id ? 'sub-tab--active' : ''}`}
                        onClick={() => setActive(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="book-panel">
                {active === 'blessing'  && <BlessingForm        parishId={parishId} />}
                {active === 'intention' && <MassIntentionForm   parishId={parishId} />}
                {active === 'sacrament' && <SacramentForm       parishId={parishId} />}
                {active === 'document'  && <DocumentRequestForm parishId={parishId} />}
            </div>
        </div>
    );
}
