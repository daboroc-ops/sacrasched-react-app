import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useConfig from '../../hooks/useConfig';
import useRequestor from './useRequestor';
import BookingWizard from '../BookingWizard';
import BookingNotice from './BookingNotice';
import PayButton from '../PayButton';
import DetailFields from './DetailFields';
import RequirementUploads from './RequirementUploads';
import { getDocumentFields, missingDetail } from '../../utils/documentDetails';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = requestor => ({
    ...requestor,
    documentType:    '',
    purpose:         '',
    copies:          1,
    additionalNotes: ''
});

export default function DocumentRequestForm({ parishId, onExit, onCalendar }) {
    const axios = useAxiosPrivate();
    const { requestor, needsContact } = useRequestor();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig(parishId);

    const [form,    setForm]    = useState(() => blank(requestor));
    const [status,  setStatus]  = useState(null);
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);
    const [payInfo, setPayInfo] = useState(null);

    const [details,     setDetails]     = useState({});
    const [attachments, setAttachments] = useState([]);
    const setDet = (k, v) => setDetails(p => ({ ...p, [k]: v }));

    const docItems     = getCategoryItems('document');
    const selectedItem = docItems.find(i => i.name === form.documentType);
    const baseFee      = selectedItem?.fee ?? 0;
    const copies       = Math.max(1, Number(form.copies) || 1);
    const totalFee     = baseFee * copies;
    const detailFields = getDocumentFields(form.documentType);
    const requirements = selectedItem?.requirements || [];

    const upload = async (file, requirement) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('requirement', requirement);
        const res = await axios.post('/user/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        return res.data.file;
    };

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const submit = async () => {
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/document-request', { ...form, details, attachments, parishId });
            const saved = res.data.data;
            setStatus('ok');
            setMsg('Document request submitted! Please allow 3–5 business days for processing.');
            if (saved.fee > 0) {
                setPayInfo({
                    amount:      saved.fee,
                    description: `${form.documentType} (${copies} ${copies === 1 ? 'copy' : 'copies'})`,
                    serviceType: 'documentRequest',
                    referenceId: res.data.data._id
                });
            }
            setForm(blank(requestor));
            setDetails({});
            setAttachments([]);
        } catch (err) {
            setStatus('err');
            setMsg(err?.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            title: 'Which document do you need?',
            sub: 'Pick the type and how many copies — the total updates as you go.',
            validate: () => {
                if (!form.documentType)   return 'Choose a document type.';
                if (!form.purpose.trim()) return 'Tell us what the document is for.';
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
                        <label className="form-label">Document Type <span className="req">*</span></label>
                        <select className="form-select" value={form.documentType}
                            onChange={e => { set('documentType')(e); setDetails({}); setAttachments([]); }} disabled={cfgLoading}>
                            <option value="">— Select document type —</option>
                            {docItems.map(i => (
                                <option key={i.name} value={i.name}>
                                    {i.name}{i.fee ? `  —  ₱${Number(i.fee).toLocaleString()}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fee per Copy</label>
                        <div className={`fee-display${baseFee ? ' fee-display--active' : ''}`}>
                            {fmtFee(baseFee)}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Number of Copies</label>
                        <div className="copies-row">
                            <input className="form-input copies-input" type="number" min={1} max={10}
                                value={form.copies} onChange={set('copies')} />
                            <span className="copies-hint">× {fmtFee(baseFee)}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Total Fee</label>
                        <div className={`fee-display${totalFee ? ' fee-display--active fee-display--total' : ''}`}>
                            {fmtFee(totalFee)}
                        </div>
                    </div>
                    <div className="form-group form-group--full">
                        <label className="form-label">Purpose <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            placeholder="e.g. For school enrollment, for employment…"
                            value={form.purpose} onChange={set('purpose')} />
                    </div>
                </>
            ),
        },
        /* The certificate's own particulars, from the parish's verification
           slip for that certificate — the office needs them to find the record. */
        ...(detailFields.length > 0 ? [{
            title: `${form.documentType} details`,
            sub: 'What the office needs to find the record.',
            validate: () => missingDetail(detailFields, details),
            render: () => <DetailFields fields={detailFields} values={details} onChange={setDet} />,
        }] : []),

        /* A baptismal certificate needs a birth certificate, and so on. */
        {
            title: 'Requirements',
            sub: requirements.length
                ? `The parish asks for the following with a ${form.documentType}. Image or PDF.`
                : 'Attach anything the parish asked for, if you have it handy. Image or PDF.',
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
            title="Document Request"
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
