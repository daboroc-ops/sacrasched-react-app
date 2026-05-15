import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import useConfig from '../../hooks/useConfig';
import PayButton from '../PayButton';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

/* Type-specific detail fields — keyed by sacrament type name (case-insensitive match) */
const DETAIL_FIELDS = {
    wedding: [
        { key: 'groom',       label: "Groom's Full Name" },
        { key: 'groomAge',    label: "Groom's Age",      type: 'number' },
        { key: 'groomFather', label: "Groom's Father" },
        { key: 'groomMother', label: "Groom's Mother" },
        { key: 'bride',       label: "Bride's Full Name" },
        { key: 'brideAge',    label: "Bride's Age",      type: 'number' },
        { key: 'brideFather', label: "Bride's Father" },
        { key: 'brideMother', label: "Bride's Mother" },
        { key: 'sponsor_1',   label: 'Principal Sponsor 1' },
        { key: 'sponsor_2',   label: 'Principal Sponsor 2' },
        { key: 'minister',    label: 'Minister / Priest', priest: true },
    ],
    baptism: [
        { key: 'fullName',  label: "Child's Full Name" },
        { key: 'father',    label: "Father's Name" },
        { key: 'mother',    label: "Mother's Name" },
        { key: 'bornin',    label: 'Born In' },
        { key: 'birthdate', label: 'Birth Date',        type: 'date' },
        { key: 'sponsor_1', label: 'Godfather (Ninong)' },
        { key: 'sponsor_2', label: 'Godmother (Ninang)' },
        { key: 'minister',  label: 'Minister / Priest', priest: true },
    ],
    confirmation: [
        { key: 'fullName',  label: "Candidate's Full Name" },
        { key: 'father',    label: "Father's Name" },
        { key: 'mother',    label: "Mother's Name" },
        { key: 'sponsor_1', label: 'Sponsor 1' },
        { key: 'sponsor_2', label: 'Sponsor 2' },
        { key: 'minister',  label: 'Minister / Priest', priest: true },
    ],
    funeral: [
        { key: 'fullName',   label: "Deceased's Full Name" },
        { key: 'age',        label: 'Age',              type: 'number' },
        { key: 'residence',  label: 'Residence' },
        { key: 'status',     label: 'Civil Status' },
        { key: 'father',     label: "Father's Name" },
        { key: 'mother',     label: "Mother's Name" },
        { key: 'marriedto',  label: 'Married To' },
        { key: 'deathDate',  label: 'Date of Death',   type: 'date' },
        { key: 'burialDate', label: 'Burial Date',     type: 'date' },
    ],
};

function getDetailFields(sacramentTypeName) {
    if (!sacramentTypeName) return [];
    const key = sacramentTypeName.toLowerCase();
    // match by contained keyword
    for (const [k, fields] of Object.entries(DETAIL_FIELDS)) {
        if (key.includes(k)) return fields;
    }
    return [];
}

const blank = auth => ({
    sacramentType:   '',
    requestorName:   auth?.user ? `${auth.user.firstname} ${auth.user.lastname}` : '',
    contactNumber:   '',
    recipientName:   '',
    preferredDate:   '',
    preferredTime:   '',
    additionalNotes: ''
});

export default function SacramentForm() {
    const axios                              = useAxiosPrivate();
    const { auth }                           = useAuth();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig();
    const [form,    setForm]                 = useState(blank(auth));
    const [details, setDetails]              = useState({});
    const [status,  setStatus]               = useState(null);
    const [msg,     setMsg]                  = useState('');
    const [loading, setLoading]              = useState(false);
    const [payInfo, setPayInfo]              = useState(null);

    const sacramentItems = getCategoryItems('sacrament');
    const selectedItem   = sacramentItems.find(i => i.name === form.sacramentType);
    const fee            = selectedItem?.fee ?? 0;
    const detailFields   = getDetailFields(form.sacramentType);
    const priests        = config?.priests || [];

    const set    = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
    const setDet = k => e => setDetails(p => ({ ...p, [k]: e.target.value }));

    const handleTypeChange = e => {
        setForm(p => ({ ...p, sacramentType: e.target.value }));
        setDetails({});
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/sacrament', { ...form, fee, details });
            setStatus('ok');
            setMsg('Sacrament request submitted! The parish office will contact you soon.');
            if (fee > 0) {
                setPayInfo({
                    amount:      fee,
                    description: `${form.sacramentType} — ${form.recipientName}`,
                    serviceType: 'sacrament',
                    referenceId: res.data.data._id
                });
            }
            setForm(blank(auth));
            setDetails({});
        } catch (err) {
            setStatus('err');
            setMsg(err?.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="booking-form" onSubmit={handleSubmit}>
            <h3 className="form-section-title">Sacrament Request</h3>

            {status === 'ok'  && <div className="form-alert form-alert--success">{msg}</div>}
            {status === 'err' && <div className="form-alert form-alert--error">{msg}</div>}
            {status === 'ok' && payInfo && <PayButton {...payInfo} />}

            {/* Priest datalist for minister fields */}
            {priests.length > 0 && (
                <datalist id="priest-list">
                    {priests.map(p => <option key={p.name || p} value={p.name || p} />)}
                </datalist>
            )}

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

            {/* ── Sacrament Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Sacrament Information</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Sacrament Type <span className="req">*</span></label>
                        <select className="form-select" value={form.sacramentType}
                            onChange={handleTypeChange} required disabled={cfgLoading}>
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
                            value={form.recipientName} onChange={set('recipientName')} required />
                    </div>
                </div>
            </section>

            {/* ── Schedule ── */}
            <section className="form-section">
                <h4 className="form-section__label">Schedule</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Preferred Date <span className="req">*</span></label>
                        <input className="form-input" type="date"
                            value={form.preferredDate} onChange={set('preferredDate')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Preferred Time <span className="req">*</span></label>
                        <input className="form-input" type="time"
                            value={form.preferredTime} onChange={set('preferredTime')} required />
                    </div>
                </div>
            </section>

            {/* ── Type-specific Details ── */}
            {detailFields.length > 0 && (
                <section className="form-section">
                    <h4 className="form-section__label">{form.sacramentType} Details</h4>
                    <div className="form-grid">
                        {detailFields.map(f => (
                            <div key={f.key} className="form-group">
                                <label className="form-label">{f.label}</label>
                                <input
                                    className="form-input"
                                    type={f.type || 'text'}
                                    value={details[f.key] || ''}
                                    onChange={setDet(f.key)}
                                    list={f.priest && priests.length > 0 ? 'priest-list' : undefined}
                                    placeholder={f.priest ? 'Type or select a priest…' : undefined}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

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
