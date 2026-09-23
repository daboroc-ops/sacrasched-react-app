import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';

/**
 * One contact — a mobile number or an email address — with the send-code /
 * enter-code controls that prove it. Driven by a useGuestCode instance.
 *
 * With `confirm={false}` it is a plain field: the value is taken as given,
 * for when the parish has the code switched off.
 */
export default function ContactConfirm({ label, required = false, type = 'tel', placeholder, valid, state, hint, confirm = true }) {
    const { value, change, token, code, setCode, sent, busy, msg, cooldown, send, verify, reset } = state;

    if (!confirm) return (
        <div className="form-group form-group--full">
            <label className="form-label">{label}{required && <> <span className="req">*</span></>}</label>
            <input className="form-input" type={type} value={value} onChange={e => change(e.target.value)} placeholder={placeholder} />
            {hint && <p className="form-hint">{hint}</p>}
        </div>
    );

    return (
        <div className="form-group form-group--full">
            <label className="form-label">
                {label}{required && <> <span className="req">*</span></>}
                {token && (
                    <span className="gb__ok">
                        <FontAwesomeIcon icon={faCircleCheck} /> Confirmed
                    </span>
                )}
            </label>

            <div className="gb__confirm-row">
                <input
                    className="form-input"
                    type={type}
                    value={value}
                    onChange={e => change(e.target.value)}
                    placeholder={placeholder}
                    readOnly={Boolean(token)}
                />
                {!token && (
                    <button
                        type="button"
                        className="btn btn--ghost gb__send-code"
                        onClick={send}
                        disabled={busy || cooldown > 0 || !valid(value)}
                    >
                        {busy     ? 'Sending…'
                         : cooldown ? `Resend in ${cooldown}s`
                         : sent     ? 'Resend code'
                         : 'Send code'}
                    </button>
                )}
            </div>

            {token ? (
                <p className="form-hint">
                    Confirmed.{' '}
                    <button type="button" className="gb__link-inline" onClick={reset}>Use a different one</button>
                </p>
            ) : sent ? (
                <div className="gb__confirm-row gb__confirm-row--code">
                    <input
                        className="form-input gb__code"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code"
                    />
                    <button type="button" className="btn btn--primary gb__send-code"
                            onClick={verify} disabled={busy || code.length !== 6}>
                        {busy ? 'Checking…' : 'Confirm'}
                    </button>
                </div>
            ) : hint ? (
                <p className="form-hint">{hint}</p>
            ) : null}

            {msg && <p className="gb__code-msg">{msg}</p>}
        </div>
    );
}
