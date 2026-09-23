import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import useConfig from '../../hooks/useConfig';
import PayButton from '../PayButton';

function getDayType(dateStr) {
    const dow = new Date(dateStr).getDay();
    if (dow === 0) return 'sundays';
    if (dow === 6) return 'saturdays';
    return 'weekdays';
}

function fmtTime(t) {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function fmtFee(fee) {
    return fee ? '₱' + Number(fee).toLocaleString() : '₱0';
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const blank = auth => ({
    intentionType:   '',
    requestorName:   auth?.user ? `${auth.user.firstname} ${auth.user.lastname}` : '',
    email:           auth?.user?.email          || '',
    contactNumber:   auth?.user?.contactNumber  || '',
    intentionFor:    '',
    preferredDate:   '',
    preferredTime:   '',
    additionalNotes: ''
});

export default function MassIntentionForm({ parishId }) {
    const axios                              = useAxiosPrivate();
    const { auth }                           = useAuth();
    const { config, loading: cfgLoading, getCategoryItems } = useConfig();
    const [form,    setForm]                 = useState(blank(auth));
    const [status,  setStatus]               = useState(null);
    const [msg,     setMsg]                  = useState('');
    const [loading, setLoading]              = useState(false);
    const [payInfo, setPayInfo]              = useState(null);

    const intentionItems = getCategoryItems('mass intention');
    const selectedItem   = intentionItems.find(i => i.name === form.intentionType);
    const fee            = selectedItem?.fee ?? 0;

    const massSchedule   = config?.massSchedule || { weekdays: [], saturdays: [], sundays: [] };
    const availableTimes = form.preferredDate
        ? massSchedule[getDayType(form.preferredDate)] || []
        : [];

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setStatus(null);
        try {
            const res = await axios.post('/mass-intention', { ...form, fee, parishId });
            setStatus('ok');
            setMsg('Mass intention submitted! We will confirm your request shortly.');
            if (fee > 0) {
                setPayInfo({
                    amount:      fee,
                    description: `Mass Intention: ${form.intentionType} — ${form.intentionFor}`,
                    serviceType: 'massIntention',
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
            <h3 className="form-section-title">Mass Intention Request</h3>

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

            {/* ── Intention Information ── */}
            <section className="form-section">
                <h4 className="form-section__label">Intention Information</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Intention Type <span className="req">*</span></label>
                        <select className="form-select" value={form.intentionType}
                            onChange={set('intentionType')} required disabled={cfgLoading}>
                            <option value="">— Select intention type —</option>
                            {intentionItems.map(i => (
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
                        <label className="form-label">Intention For <span className="req">*</span></label>
                        <input className="form-input" type="text"
                            placeholder="Name of person / occasion…"
                            value={form.intentionFor} onChange={set('intentionFor')} required />
                    </div>
                </div>
            </section>

            {/* ── Schedule ── */}
            <section className="form-section">
                <h4 className="form-section__label">Schedule</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Preferred Date <span className="req">*</span></label>
                        <input className="form-input" type="date" min={todayStr()} value={form.preferredDate}
                            onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value, preferredTime: '' }))}
                            required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Mass Time <span className="req">*</span></label>
                        {availableTimes.length > 0 ? (
                            <select className="form-select" value={form.preferredTime}
                                onChange={set('preferredTime')} required>
                                <option value="">— Select mass time —</option>
                                {availableTimes.map(s => (
                                    <option key={s.time} value={s.time}>
                                        {fmtTime(s.time)}{s.label ? ` — ${s.label}` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input className="form-input" type="time" value={form.preferredTime}
                                onChange={set('preferredTime')} required />
                        )}
                        {!form.preferredDate
                            ? <span className="form-hint">Select a date first to load available times</span>
                            : availableTimes.length === 0
                                ? <span className="form-hint">No scheduled times found — enter manually</span>
                                : null}
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
