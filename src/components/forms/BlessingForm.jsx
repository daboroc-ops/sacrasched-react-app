import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useConfig from '../../hooks/useConfig';
import useRequestor from './useRequestor';
import BookingWizard from '../BookingWizard';
import PayButton from '../PayButton';
import useAvailability from '../../hooks/useAvailability';
import WhenFields from './WhenFields';
import VenueSelect from './VenueSelect';
import BookingNotice from './BookingNotice';
import { whenProblem } from '../../utils/booking';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = (requestor, date = '') => ({
    ...requestor,
    blessingType:    '',
    blessingFor:     '',
    venue:           '',
    preferredDate:   date,
    preferredTime:   '',
    additionalNotes: ''
});

export default function BlessingForm({ parishId, onExit, initialDate, onCalendar }) {
    const axios = useAxiosPrivate();
    const { requestor, needsContact } = useRequestor();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig(parishId);

    const [form,    setForm]    = useState(() => blank(requestor, initialDate));
    const [status,  setStatus]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);
    const [payInfo, setPayInfo] = useState(null);

    const blessingItems = getCategoryItems('blessing');
    const selectedItem  = blessingItems.find(i => i.name === form.blessingType);
    const fee           = selectedItem?.fee ?? 0;

    /* Office hours on that day, minus what is taken, the priest's day off
       and anything already past. */
    const avail  = useAvailability({ service: 'blessing', type: form.blessingType, date: form.preferredDate, parishId });
    const months = config?.settings?.advanceMonths || 3;

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const submit = async () => {
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/blessing', { ...form, parishId });
            const saved = res.data.data;
            setStatus('ok');
            setMsg('Blessing request submitted! Confirm below that you will settle the offering at the parish office.');
            if (saved.fee > 0) {
                setPayInfo({
                    amount:      saved.fee,
                    description: `${form.blessingType} — ${form.blessingFor}`,
                    serviceType: 'blessing',
                    referenceId: res.data.data._id
                });
            }
            setForm(blank(requestor, initialDate));
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
            title: 'What would you like blessed?',
            sub: 'Pick the kind of blessing and tell us what it is for.',
            validate: () => {
                if (!form.blessingType)      return 'Choose a blessing type.';
                if (!form.blessingFor.trim()) return 'Tell us what the blessing is for.';
                if (!form.venue.trim())      return 'Enter the address where the blessing will be held.';
                if (needsContact && !form.contactNumber.trim()) return 'Enter a contact number.';
                return null;
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
                        <label className="form-label">Blessing Type <span className="req">*</span></label>
                        <select className="form-select" value={form.blessingType}
                            onChange={set('blessingType')} disabled={cfgLoading}>
                            <option value="">— Select blessing type —</option>
                            {blessingItems.map(i => (
                                <option key={i.name} value={i.name}>
                                    {i.name}{i.fee ? `  —  ₱${Number(i.fee).toLocaleString()}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Service Fee</label>
                        <div className={`fee-display${fee ? ' fee-display--active' : ''}`}>
                            {fmtFee(fee)}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Blessing For <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            placeholder="e.g. Our new home, Toyota Fortuner…"
                            value={form.blessingFor} onChange={set('blessingFor')} />
                    </div>
                    <VenueSelect venues={config?.venues || []} date={form.preferredDate} value={form.venue}
                                 onChange={v => setForm(p => ({ ...p, venue: v }))}
                                 label="Address / Location" required
                                 hint="One of the parish's venues, or the complete address where the blessing will be held." />
                </>
            ),
        },
        {
            title: 'When should the priest come?',
            sub: 'The office confirms the date, or offers the nearest one it can.',
            validate: () => whenProblem(form, avail),
            render: () => (
                <WhenFields form={form} setForm={setForm} fixedDate={Boolean(initialDate)}
                            avail={avail} months={months} />
            ),
        },
        {
            title: 'Anything else we should know?',
            sub: 'Optional — leave it blank if there is nothing to add.',
            render: () => (
                <>
                    <div className="form-group form-group--full">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={3}
                            placeholder="Any special instructions…"
                            value={form.additionalNotes} onChange={set('additionalNotes')} />
                    </div>
                    <BookingNotice />
                </>
            ),
        },
    ];

    return (
        <BookingWizard
            title="Blessing Request"
            steps={steps}
            onSubmit={submit}
            onExit={onExit}
            onCalendar={onCalendar}
            parish={config?.parish}
            submitting={loading}
            disabled={cfgLoading}
            done={status === 'ok'}
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
