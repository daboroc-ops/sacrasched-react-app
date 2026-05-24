import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import useConfig from '../../hooks/useConfig';
import PayButton from '../PayButton';

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Parish office hours: 8 AM – 5 PM, hourly slots
const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
    const h = 8 + i;
    const value = `${String(h).padStart(2,'0')}:00`;
    const label = `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
    return { value, label };
});

const blank = auth => ({
    blessingType:    '',
    requestorName:   auth?.user ? `${auth.user.firstname} ${auth.user.lastname}` : '',
    email:           auth?.user?.email          || '',
    contactNumber:   auth?.user?.contactNumber  || '',
    blessingFor:     '',
    venue:           '',
    preferredDate:   '',
    preferredTime:   '',
    additionalNotes: ''
});

export default function BlessingForm() {
    const axios                              = useAxiosPrivate();
    const { auth }                           = useAuth();
    const { loading: cfgLoading, getCategoryItems } = useConfig();
    const [form,    setForm]                 = useState(blank(auth));
    const [status,  setStatus]               = useState(null);
    const [msg,     setMsg]                  = useState('');
    const [loading, setLoading]              = useState(false);
    const [payInfo, setPayInfo]              = useState(null);

    const blessingItems = getCategoryItems('blessing');
    const selectedItem  = blessingItems.find(i => i.name === form.blessingType);
    const fee           = selectedItem?.fee ?? 0;

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/blessing', { ...form, fee });
            setStatus('ok');
            setMsg('Blessing request submitted! We will contact you to confirm.');
            if (fee > 0) {
                setPayInfo({
                    amount:      fee,
                    description: `${form.blessingType} — ${form.blessingFor}`,
                    serviceType: 'blessing',
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
            <h3 className="form-section-title">Blessing Request</h3>

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
                        <label className="form-label">Email <span className="req">*</span></label>
                        <input className="form-input" type="email"
                            value={form.email} onChange={set('email')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact Number <span className="req">*</span></label>
                        <input className="form-input" type="tel" placeholder="09XXXXXXXXX"
                            value={form.contactNumber} onChange={set('contactNumber')} required />
                    </div>
                </div>
            </section>

            {/* ── Blessing Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Blessing Information</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Blessing Type <span className="req">*</span></label>
                        <select className="form-select" value={form.blessingType}
                            onChange={set('blessingType')} required disabled={cfgLoading}>
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
                            value={form.blessingFor} onChange={set('blessingFor')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address / Location <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            placeholder="Complete address where blessing will be held"
                            value={form.venue} onChange={set('venue')} required />
                    </div>
                </div>
            </section>

            {/* ── Schedule ── */}
            <section className="form-section">
                <h4 className="form-section__label">Schedule</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Preferred Date <span className="req">*</span></label>
                        <input className="form-input" type="date" min={todayStr()}
                            value={form.preferredDate} onChange={set('preferredDate')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Preferred Time <span className="req">*</span></label>
                        <select className="form-select"
                            value={form.preferredTime} onChange={set('preferredTime')} required>
                            <option value="">— Select time —</option>
                            {TIME_SLOTS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
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
                            placeholder="Any special instructions…"
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
