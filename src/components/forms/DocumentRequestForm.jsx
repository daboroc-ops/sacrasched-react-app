import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import useConfig from '../../hooks/useConfig';
import PayButton from '../PayButton';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

const blank = auth => ({
    documentType:    '',
    requestorName:   auth?.user ? `${auth.user.firstname} ${auth.user.lastname}` : '',
    contactNumber:   '',
    purpose:         '',
    copies:          1,
    additionalNotes: ''
});

export default function DocumentRequestForm() {
    const axios                              = useAxiosPrivate();
    const { auth }                           = useAuth();
    const { loading: cfgLoading, getCategoryItems } = useConfig();
    const [form,    setForm]                 = useState(blank(auth));
    const [status,  setStatus]               = useState(null);
    const [msg,     setMsg]                  = useState('');
    const [loading, setLoading]              = useState(false);
    const [payInfo, setPayInfo]              = useState(null);

    const docItems     = getCategoryItems('document');
    const selectedItem = docItems.find(i => i.name === form.documentType);
    const baseFee      = selectedItem?.fee ?? 0;
    const copies       = Math.max(1, Number(form.copies) || 1);
    const totalFee     = baseFee * copies;

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/document-request', { ...form, fee: totalFee });
            setStatus('ok');
            setMsg('Document request submitted! Please allow 3–5 business days for processing.');
            if (totalFee > 0) {
                setPayInfo({
                    amount:      totalFee,
                    description: `${form.documentType} (${copies} ${copies === 1 ? 'copy' : 'copies'})`,
                    serviceType: 'documentRequest',
                    referenceId: res.data.data._id
                });
            }
            setForm(blank(auth));
        } catch (err) {
            setStatus('err');
            setMsg(err?.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="booking-form" onSubmit={handleSubmit}>
            <h3 className="form-section-title">Document Request</h3>

            {status === 'ok'  && <div className="form-alert form-alert--success">{msg}</div>}
            {status === 'err' && <div className="form-alert form-alert--error">{msg}</div>}
            {status === 'ok' && payInfo && <PayButton {...payInfo} />}

            {/* ── Requestor Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Requestor Information</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Requestor Name <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            value={form.requestorName} onChange={set('requestorName')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact Number <span className="req">*</span></label>
                        <input className="form-input" type="tel" placeholder="09XXXXXXXXX"
                            value={form.contactNumber} onChange={set('contactNumber')} required />
                    </div>
                </div>
            </section>

            {/* ── Document Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Document Information</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Document Type <span className="req">*</span></label>
                        <select className="form-select" value={form.documentType}
                            onChange={set('documentType')} required disabled={cfgLoading}>
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
                            value={form.purpose} onChange={set('purpose')} required />
                    </div>
                </div>
            </section>

            {/* ── Additional Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Additional Information</h4>
                <div className="form-grid">
                    <div className="form-group form-group--full">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={3}
                            value={form.additionalNotes} onChange={set('additionalNotes')} />
                    </div>
                </div>
            </section>

            <div className="form-actions">
                <button type="submit" className="btn btn--primary" disabled={loading || cfgLoading}>
                    {loading ? 'Submitting…' : 'Submit Request'}
                </button>
            </div>
        </form>
    );
}
