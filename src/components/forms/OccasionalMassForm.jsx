import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useConfig from '../../hooks/useConfig';
import useRequestor from './useRequestor';
import BookingWizard from '../BookingWizard';
import PayButton from '../PayButton';
import useAvailability from '../../hooks/useAvailability';
import WhenFields from './WhenFields';
import DetailFields from './DetailFields';
import BookingNotice from './BookingNotice';
import { whenProblem } from '../../utils/booking';
import { missingDetail } from '../../utils/documentDetails';
import { MASS_TYPES, REQUESTER_FIELDS, getOccasionFields, isForDeceased, asksWhere } from '../../utils/occasionalDetails';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = (requestor, date = '') => ({
    ...requestor,
    massType:        '',
    venue:           '',
    preferredDate:   date,
    preferredTime:   '',
    additionalNotes: ''
});

/**
 * A signed-in devotee reserving an occasional Mass — a funeral Mass, a wake
 * Mass, a Mass for an office or a school. A reservation: the office confirms
 * it, and the offering is settled there. For a funeral or a wake the
 * requester is asked about first, on a step of its own.
 */
export default function OccasionalMassForm({ parishId, onExit, initialDate, onCalendar }) {
    const axios = useAxiosPrivate();
    const { requestor, needsContact } = useRequestor();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig(parishId);

    const [form,    setForm]    = useState(() => blank(requestor, initialDate));
    const [details, setDetails] = useState({});
    const [status,  setStatus]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);
    const [payInfo, setPayInfo] = useState(null);

    const items = getCategoryItems('occasional');
    const fee   = items.find(i => i.name === form.massType)?.fee ?? 0;
    const detailFields = getOccasionFields(form.massType);

    const avail  = useAvailability({ service: 'occasional', type: form.massType, date: form.preferredDate, parishId });
    const months = config?.settings?.advanceMonths || 3;

    const set    = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
    const setDet = (k, v) => setDetails(p => ({ ...p, [k]: v }));

    const submit = async () => {
        setLoading(true); setStatus(null);
        try {
            const { relationship, ...rest } = details;
            const res = await axios.post('/occasional-mass', { ...form, relationship, details: rest, parishId });
            const saved = res.data.data;
            setStatus('ok');
            setMsg('Reserved. The parish office will confirm the Mass and the arrangements with you.');
            if (saved.fee > 0) {
                setPayInfo({
                    amount:      saved.fee,
                    description: `${saved.massType} — ${saved.details?.deceased || saved.details?.organisation || saved.requestorName}`,
                    serviceType: 'occasionalMass',
                    referenceId: saved._id
                });
            }
            setForm(blank(requestor, initialDate));
            setDetails({});
        } catch (err) {
            setStatus('err');
            setMsg(err?.response?.data?.message || 'Submission failed. Please try again.');
            // The hour went to someone else meanwhile: ask for the day's
            // times again and go back to pick one.
            if (err?.response?.data?.code === 'TIME_NOT_AVAILABLE') {
                setForm(p => ({ ...p, preferredTime: '' }));
                avail.refresh();
                return 0;
            }
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            title: 'Which Mass, and when?',
            sub: 'A funeral, wake, office or school Mass. The office confirms the reservation.',
            validate: () => {
                if (!form.massType) return 'Choose the kind of Mass.';
                if (needsContact && !form.contactNumber.trim()) return 'Enter a contact number.';
                return whenProblem(form, avail);
            },
            render: () => (
                <>
                    {needsContact && (
                        <div className="form-group form-group--full">
                            <label className="form-label">Contact Number <span className="req">*</span></label>
                            <input className="form-input" type="tel" placeholder="09XXXXXXXXX"
                                value={form.contactNumber} onChange={set('contactNumber')} required />
                            <p className="form-hint">Your account has no number saved yet.</p>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Kind of Mass <span className="req">*</span></label>
                        <select className="form-select" value={form.massType} disabled={cfgLoading}
                                onChange={e => { setForm(p => ({ ...p, massType: e.target.value, preferredTime: '' })); setDetails({}); }}>
                            <option value="">— Select —</option>
                            {MASS_TYPES.map(t => {
                                const f = items.find(i => i.name === t)?.fee;
                                return <option key={t} value={t}>{t}{f ? `  —  ₱${Number(f).toLocaleString()}` : ''}</option>;
                            })}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Offering</label>
                        <div className={`fee-display${fee ? ' fee-display--active' : ''}`}>{fmtFee(fee)}</div>
                    </div>
                    <WhenFields form={form} setForm={setForm} fixedDate={Boolean(initialDate)}
                                avail={avail} months={months} />
                </>
            ),
        },
        /* For a funeral or a wake: who is asking, before anything else */
        ...(isForDeceased(form.massType) ? [{
            title: 'Who is requesting?',
            sub: 'The office will speak with you about the arrangements.',
            validate: () => missingDetail(REQUESTER_FIELDS, details),
            render: () => (
                <>
                    <div className="form-group form-group--full">
                        <label className="form-label">Requestor Name</label>
                        <div className="fee-display fee-display--active">{form.requestorName}</div>
                    </div>
                    <DetailFields fields={REQUESTER_FIELDS} values={details} onChange={setDet} />
                </>
            ),
        }] : []),
        ...(detailFields.length ? [{
            title: `${form.massType} details`,
            sub: 'What the office needs for the occasion. All fields are required.',
            validate: () => missingDetail(detailFields, details)
                || (asksWhere(form.massType) && !String(form.venue || '').trim() ? 'Say where the Mass will be held.' : null),
            render: () => (
                <>
                    <DetailFields fields={detailFields} values={details} onChange={setDet} />
                    {/* An office or a school names the place itself; a funeral or a wake is in the church */}
                    {asksWhere(form.massType) && (
                        <div className="form-group form-group--full">
                            <label className="form-label">Where will the Mass be held? <span className="req">*</span></label>
                            <input className="form-input" value={form.venue || ''} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                                   placeholder="e.g. the office's conference hall, the school gym, or the parish church" />
                        </div>
                    )}
                </>
            ),
        }] : []),
        {
            title: 'Anything else we should know?',
            sub: 'Optional — leave it blank if there is nothing to add.',
            render: () => (
                <>
                    <div className="form-group form-group--full">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={3}
                            value={form.additionalNotes} onChange={set('additionalNotes')} />
                    </div>
                    <BookingNotice reservation />
                </>
            ),
        },
    ];

    return (
        <BookingWizard
            title="Occasional Mass"
            steps={steps}
            onSubmit={submit}
            onExit={onExit}
            onCalendar={onCalendar}
            parish={config?.parish}
            submitting={loading}
            disabled={cfgLoading}
            done={status === 'ok'}
            submitLabel="Reserve the Mass"
            banner={
                <>
                    {status === 'ok'  && <div className="form-alert form-alert--success">{msg}</div>}
                    {status === 'err' && <div className="form-alert form-alert--error">{msg}</div>}
                    {status === 'ok' && payInfo && <PayButton {...payInfo} />}
                </>
            }
        />
    );
}
