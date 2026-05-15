import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faSpinner, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import usePayment from '../hooks/usePayment';

/**
 * Props:
 *   amount      – number   PHP pesos (e.g. 500)
 *   description – string   shown on the checkout page
 *   serviceType – string   enum matching Payment model
 *   referenceId – string   _id of the related service record
 *   compact     – boolean  render just the button (no fee info block)
 */
export default function PayButton({ amount, description, serviceType, referenceId, compact = false }) {
    const { checkout }      = usePayment();
    const [busy, setBusy]   = useState(false);
    const [err,  setErr]    = useState('');

    const handlePay = async () => {
        setBusy(true);
        setErr('');
        try {
            await checkout({ amount, description, serviceType, referenceId });
            // checkout() does window.location.href — code below only runs on failure
        } catch (e) {
            setErr(e?.response?.data?.message || 'Could not start payment. Please try again.');
            setBusy(false);
        }
    };

    /* ── Compact mode: just the button (used inside cards) ── */
    if (compact) return (
        <>
            {err && (
                <span className="pay-compact__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </span>
            )}
            <button className="btn btn--pay btn--sm" onClick={handlePay} disabled={busy}>
                {busy
                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Redirecting…</>
                    : <><FontAwesomeIcon icon={faQrcode} /> Pay Now</>
                }
            </button>
        </>
    );

    /* ── Full mode: info block + button (used after form submit) ── */
    return (
        <div className="pay-prompt">
            <div className="pay-prompt__info">
                <div className="pay-prompt__label">Outstanding Fee</div>
                <div className="pay-prompt__amount">
                    ₱{Number(amount).toLocaleString()}
                </div>
                <div className="pay-prompt__method">
                    <FontAwesomeIcon icon={faQrcode} />
                    <span>QR Ph — GCash · Maya · UnionBank · and more</span>
                </div>
            </div>

            {err && (
                <div className="pay-prompt__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </div>
            )}

            <button className="btn btn--pay" onClick={handlePay} disabled={busy}>
                {busy
                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Redirecting…</>
                    : <><FontAwesomeIcon icon={faQrcode} /> Pay with QR Ph</>
                }
            </button>
        </div>
    );
}
