import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faQrcode, faSpinner, faCircleExclamation,
    faMoneyBillWave, faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import usePayment from '../hooks/usePayment';

/**
 * Props:
 *   amount      – number   PHP pesos (e.g. 500)
 *   description – string   shown on the checkout page
 *   serviceType – string   enum matching Payment model
 *   referenceId – string   _id of the related service record
 *   compact     – boolean  render just the buttons (no fee info block)
 */
export default function PayButton({ amount, description, serviceType, referenceId, compact = false }) {
    const { checkout, payCash } = usePayment();
    const [busy,     setBusy]     = useState('');   // '' | 'online' | 'cash'
    const [err,      setErr]      = useState('');
    const [cashDone, setCashDone] = useState(false);

    const handlePay = async () => {
        setBusy('online');
        setErr('');
        try {
            await checkout({ amount, description, serviceType, referenceId });
            // checkout() does window.location.href — code below only runs on failure
        } catch (e) {
            setErr(e?.response?.data?.message || 'Could not start payment. Please try again.');
            setBusy('');
        }
    };

    const handleCash = async () => {
        setBusy('cash');
        setErr('');
        try {
            await payCash({ amount, description, serviceType, referenceId });
            setCashDone(true);
        } catch (e) {
            setErr(e?.response?.data?.message || 'Could not record cash payment. Please try again.');
        } finally {
            setBusy('');
        }
    };

    /* ── Cash recorded — show confirmation ── */
    if (cashDone) return (
        <div className="pay-cash-done">
            <FontAwesomeIcon icon={faCircleCheck} className="pay-cash-done__icon" />
            <div>
                <strong>Pay at the parish office</strong>
                <p>Please settle ₱{Number(amount).toLocaleString()} in cash at the parish office. Your request will be confirmed once payment is received.</p>
            </div>
        </div>
    );

    /* ── Compact mode: just the buttons (used inside cards) ── */
    if (compact) return (
        <>
            {err && (
                <span className="pay-compact__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </span>
            )}
            <div className="pay-compact__btns">
                <button className="btn btn--pay btn--sm" onClick={handlePay} disabled={!!busy}>
                    {busy === 'online'
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Redirecting…</>
                        : <><FontAwesomeIcon icon={faQrcode} /> Pay Online</>
                    }
                </button>
                <button className="btn btn--ghost btn--sm" onClick={handleCash} disabled={!!busy}>
                    {busy === 'cash'
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving…</>
                        : <><FontAwesomeIcon icon={faMoneyBillWave} /> Pay at Parish</>
                    }
                </button>
            </div>
        </>
    );

    /* ── Full mode: info block + buttons (used after form submit) ── */
    return (
        <div className="pay-prompt">
            <div className="pay-prompt__info">
                <div className="pay-prompt__label">Outstanding Fee</div>
                <div className="pay-prompt__amount">
                    ₱{Number(amount).toLocaleString()}
                </div>
                <div className="pay-prompt__method">
                    <FontAwesomeIcon icon={faQrcode} />
                    <span>QR Ph — GCash · Maya · UnionBank — or pay cash at the parish</span>
                </div>
            </div>

            {err && (
                <div className="pay-prompt__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </div>
            )}

            <div className="pay-prompt__btns">
                <button className="btn btn--pay" onClick={handlePay} disabled={!!busy}>
                    {busy === 'online'
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Redirecting…</>
                        : <><FontAwesomeIcon icon={faQrcode} /> Pay with QR Ph</>
                    }
                </button>
                <button className="btn btn--ghost" onClick={handleCash} disabled={!!busy}>
                    {busy === 'cash'
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving…</>
                        : <><FontAwesomeIcon icon={faMoneyBillWave} /> Pay at Parish (Cash)</>
                    }
                </button>
            </div>
        </div>
    );
}
