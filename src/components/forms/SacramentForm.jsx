import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useConfig from '../../hooks/useConfig';
import useRequestor from './useRequestor';
import BookingWizard from '../BookingWizard';
import PayButton from '../PayButton';
import useAvailability from '../../hooks/useAvailability';
import WhenFields from './WhenFields';
import { whenProblem } from '../../utils/booking';
import DetailFields from './DetailFields';
import RequirementUploads from './RequirementUploads';
import { missingDetail } from '../../utils/documentDetails';
import { getDetailFields, expandDetailFields } from '../../utils/sacramentDetails';
import BookingNotice from './BookingNotice';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = (requestor, date = '') => ({
    ...requestor,
    sacramentType:   '',
    recipientName:   '',
    preferredDate:   date,
    preferredTime:   '',
    additionalNotes: ''
});

export default function SacramentForm({ parishId, onExit, initialDate, onCalendar }) {
    const axios = useAxiosPrivate();
    const { requestor, needsContact } = useRequestor();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig(parishId);

    const [form,    setForm]    = useState(() => blank(requestor, initialDate));
    const [details,     setDetails]     = useState({});
    const [attachments, setAttachments] = useState([]);
    const [status,  setStatus]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);
    const [payInfo, setPayInfo] = useState(null);

    const sacramentItems = getCategoryItems('sacrament');
    const selectedItem   = sacramentItems.find(i => i.name === form.sacramentType);
    const fee            = selectedItem?.fee ?? 0;
    const detailFields   = expandDetailFields(getDetailFields(form.sacramentType), details);
    const requirements   = selectedItem?.requirements || [];

    /* A wedding's own fixed times, or office hours; never the parish
       priest's day off; never a slot another wedding holds. */
    const avail  = useAvailability({ service: 'sacrament', type: form.sacramentType, date: form.preferredDate, parishId });
    const months = config?.settings?.advanceMonths || 3;

    /* A requirement goes up on its own, before the request */
    const upload = async (file, requirement) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('requirement', requirement);
        const res = await axios.post('/user/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        return res.data.file;
    };

    const set    = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
    const setDet = (k, v) => setDetails(p => ({ ...p, [k]: v }));

    const handleTypeChange = e => {
        setForm(p => ({ ...p, sacramentType: e.target.value, preferredTime: '' }));
        setDetails({});
        setAttachments([]);
    };

    const submit = async () => {
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/sacrament', { ...form, details, attachments, parishId });
            const saved = res.data.data;
            setStatus('ok');
            setMsg('Sacrament request submitted! Confirm below that you will settle the offering at the parish office.');
            if (saved.fee > 0) {
                setPayInfo({
                    amount:      saved.fee,
                    description: `${form.sacramentType} — ${form.recipientName}`,
                    serviceType: 'sacrament',
                    referenceId: res.data.data._id
                });
            }
            setForm(blank(requestor, initialDate));
            setDetails({});
            setAttachments([]);
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
            title: 'Which sacrament, and for whom?',
            sub: 'The fee shown is the offering the parish has set for it.',
            validate: () => {
                if (!form.sacramentType)        return 'Choose a sacrament.';
                if (!form.recipientName.trim()) return 'Enter the name of the recipient.';
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
                        <label className="form-label">Sacrament Type <span className="req">*</span></label>
                        <select className="form-select" value={form.sacramentType}
                            onChange={handleTypeChange} disabled={cfgLoading}>
                            <option value="">— Select sacrament type —</option>
                            {sacramentItems.map(i => (
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
                    <div className="form-group form-group--full">
                        <label className="form-label">Recipient Name <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            placeholder="Name of the recipient"
                            value={form.recipientName} onChange={set('recipientName')} />
                    </div>
                </>
            ),
        },
        {
            title: 'When would you like it?',
            sub: 'A wedding has its own fixed times; the rest follow office hours.',
            validate: () => whenProblem(form, avail),
            render: () => (
                <WhenFields form={form} setForm={setForm} fixedDate={Boolean(initialDate)}
                            avail={avail} months={months} />
            ),
        },

        /* A baptism asks for the parents and godparents, a wedding for the
           other party — the step only exists when the chosen sacrament has
           extras. */
        ...(detailFields.length > 0 ? [{
            title: `${form.sacramentType} details`,
            sub: 'These help the office prepare the record beforehand. All fields are required.',
            validate: () => missingDetail(detailFields, details),
            render: () => <DetailFields fields={detailFields} values={details} onChange={setDet} />,
        }] : []),

        /* The papers the parish asks for with it — a birth certificate for
           a baptism, and so on. Kept private; only the office can open them. */
        {
            title: 'Requirements',
            sub: requirements.length
                ? `The parish asks for the following with a ${form.sacramentType}. Image or PDF.`
                : 'Attach anything the parish asked you to bring, if you have it handy. Image or PDF.',
            render: () => (
                <RequirementUploads requirements={requirements} value={attachments}
                                    onChange={setAttachments} upload={upload} />
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
            title="Sacrament Request"
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
