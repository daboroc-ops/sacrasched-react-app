import { useState } from 'react';
import BlessingForm        from './forms/BlessingForm';
import MassIntentionForm   from './forms/MassIntentionForm';
import SacramentForm       from './forms/SacramentForm';
import DocumentRequestForm from './forms/DocumentRequestForm';
import OccasionalMassForm  from './forms/OccasionalMassForm';
import ServicePicker       from './ServicePicker';
import useParishes         from '../hooks/useParishes';
import useParish           from '../hooks/useParish';

const FORMS = {
    blessing:  BlessingForm,
    intention: MassIntentionForm,
    sacrament: SacramentForm,
    occasional: OccasionalMassForm,
    document:  DocumentRequestForm,
};

/**
 * Two screens, not one: pick a service, then fill it in.
 *
 * The old sub-tab bar put four forms behind four tabs, which meant the first
 * one was always half-open before the devotee had chosen anything. Choosing
 * first makes the choice the page, and lets each form take over completely
 * once it is made.
 */
export default function BookServices({ initialDate = '', onCalendar }) {
    const [chosen, setChosen] = useState(null);
    const { parishes, loading: parishLoading } = useParishes();
    const { parish, isTenant } = useParish();
    const [picked, setPicked] = useState('');

    // On a parish's own site there is nothing to choose — the host decides
    const parishId = isTenant ? parish._id : picked;
    const ActiveForm = chosen ? FORMS[chosen] : null;

    return (
        <div>
            {!chosen ? (
                <div className="bk-stage" key="picker">
                    <p className="page-intro">
                        Choose a service to request. The parish office will review and
                        confirm your booking.
                    </p>

                    {/* ── Parish ── */}
                    {isTenant ? (
                        <div className="parish-picker parish-picker--fixed">
                            <span className="parish-picker__label">Parish</span>
                            <p className="parish-picker__value">
                                {parish.name}{parish.code ? ` (${parish.code})` : ''}
                            </p>
                            <p className="parish-picker__hint">
                                You are booking on this parish&rsquo;s own site.
                            </p>
                        </div>
                    ) : (
                        <div className="parish-picker">
                            <label className="parish-picker__label">Parish</label>
                            <select
                                className="form-select"
                                value={picked}
                                onChange={e => setPicked(e.target.value)}
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
                    )}

                    {/* Nothing can be filed without a parish to file it at, so the
                        cards stay shut until one is chosen. */}
                    <ServicePicker
                        onPick={setChosen}
                        disabled={!parishId}
                        disabledHint="Choose a parish first."
                    />
                    {!parishId && (
                        <p className="bk-picker__gate">Select a parish above to continue.</p>
                    )}
                </div>
            ) : (
                <div className="bk-stage bk-stage--form" key={chosen}>
                    <ActiveForm parishId={parishId} initialDate={initialDate} onExit={() => setChosen(null)} onCalendar={onCalendar} />
                </div>
            )}
        </div>
    );
}
