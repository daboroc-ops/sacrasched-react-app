import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useConfig from '../../hooks/useConfig';
import useRequestor from './useRequestor';
import BookingWizard from '../BookingWizard';
import PayButton from '../PayButton';
import useAvailability from '../../hooks/useAvailability';
import WhenFields from './WhenFields';
import IntentionFields from './IntentionFields';
import MassVenueSelect from './MassVenueSelect';
import OfferingStep from './OfferingStep';
import BookingNotice from './BookingNotice';
import { whenProblem } from '../../utils/booking';
import { intentionFee, isNamedSouls, soulsProblem, needsForWhom, amountDue, offeringProblem } from '../../utils/intentions';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = (requestor, date = '') => ({
    ...requestor,
    intentionType:   '',
    intentionTypes:  [],
    souls:           [],
    intentionFor:    '',
    purpose:         '',
    venue:           '',
    wantsDonation:   false,
    offering:        '',
    preferredDate:   date,
    preferredTime:   '',
    additionalNotes: ''
});

/**
 * A signed-in devotee offering a Mass intention: which Mass first, then the
 * kinds of intention (as many as apply) and who it is for — a list of souls
 * for the departed, a married couple counting as one offering. Paid online.
 */
export default function MassIntentionForm({ parishId, onExit, initialDate, onCalendar }) {
    const axios = useAxiosPrivate();
    const { requestor, needsContact } = useRequestor();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig(parishId);

    const [form,    setForm]    = useState(() => blank(requestor, initialDate));
    const [status,  setStatus]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);
    const [payInfo, setPayInfo] = useState(null);

    const intentionItems = getCategoryItems('mass intention');
    // The same sums the API works out from the parish's price list
    const listFee = intentionFee(intentionItems, form.intentionTypes, form.souls);
    const fee     = amountDue(listFee, form.offering, form.wantsDonation);

    /* Only the Masses said on that day, still ahead of the clock if that
       day is today, inside the parish's booking window — and none today
       after 4:00 PM. */
    const avail  = useAvailability({ service: 'intention', date: form.preferredDate, venue: form.venue || '', parishId });
    const months = config?.settings?.advanceMonths || 3;

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const submit = async () => {
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/mass-intention', { ...form, offering: form.wantsDonation ? form.offering : '', parishId });
            const saved = res.data.data;
            setStatus('ok');
            setMsg('Mass intention submitted! It is confirmed once the offering is paid.');
            if (saved.fee > 0) {
                setPayInfo({
                    amount:      saved.fee,
                    description: `Mass Intention: ${saved.intentionType} — ${saved.intentionFor}`,
                    serviceType: 'massIntention',
                    referenceId: saved._id
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
            title: 'Which Mass?',
            sub: 'Only the Masses said on that day are offered. Same-day intentions close at 4:00 PM.',
            validate: () => whenProblem(form, avail),
            render: () => (
                <WhenFields form={form} setForm={setForm} fixedDate={Boolean(initialDate)}
                            avail={avail} months={months} timeLabel="Mass Time"
                            beforeTime={
                                /* Undas: Mass at the cemeteries too, at their own times */
                                <MassVenueSelect venues={avail.venues} value={form.venue}
                                                 onChange={v => setForm(p => ({ ...p, venue: v, preferredTime: '' }))} />
                            } />
            ),
        },
        {
            title: 'What would you like offered?',
            sub: 'Choose the kinds of intention and say who it is offered for.',
            validate: () => {
                const kinds = form.intentionTypes.filter(Boolean);
                if (!kinds.length) return 'Choose at least one kind of intention.';
                if (kinds.some(isNamedSouls)) { const p = soulsProblem(form.souls); if (p) return p; }
                if (needsForWhom(kinds) && !form.intentionFor.trim()) return 'Enter who the intention is for.';
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
                    <div className="form-group form-group--full">
                        <label className="form-label">Offered by</label>
                        <div className="fee-display fee-display--active">{form.requestorName}</div>
                    </div>
                    <IntentionFields
                        items={intentionItems}
                        types={form.intentionTypes}
                        souls={form.souls}
                        forWhom={form.intentionFor}
                        purpose={form.purpose}
                        onTypes={v => setForm(p => ({ ...p, intentionTypes: v, intentionType: v.join(', ') }))}
                        onSouls={v => setForm(p => ({ ...p, souls: v }))}
                        onForWhom={v => setForm(p => ({ ...p, intentionFor: v }))}
                        onPurpose={v => setForm(p => ({ ...p, purpose: v }))}
                    />
                </>
            ),
        },
        {
            title: 'The offering',
            sub: 'What your intentions come to — and, if you wish, a little more.',
            validate: () => (form.wantsDonation ? offeringProblem(listFee, form.offering) : null),
            render: () => (
                <>
                    <OfferingStep
                        items={intentionItems}
                        types={form.intentionTypes}
                        souls={form.souls}
                        wants={form.wantsDonation}
                        offering={form.offering}
                        onWants={v => setForm(p => ({ ...p, wantsDonation: v, ...(v ? {} : { offering: '' }) }))}
                        onOffering={v => setForm(p => ({ ...p, offering: v }))}
                    />
                    <div className="form-group">
                        <label className="form-label">You will give</label>
                        <div className={`fee-display${fee ? ' fee-display--active' : ''}`}>
                            {fmtFee(fee)}
                        </div>
                    </div>
                </>
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
                            value={form.additionalNotes} onChange={set('additionalNotes')} />
                    </div>
                    <BookingNotice />
                </>
            ),
        },
    ];

    return (
        <BookingWizard
            title="Mass Intention"
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
