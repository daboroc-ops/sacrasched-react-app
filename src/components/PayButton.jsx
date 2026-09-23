import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faQrcode, faSpinner, faCircleExclamation,
    faMoneyBillWave, faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import usePayment from '../hooks/usePayment';

/* Which way each service is paid: Mass intentions and documents online,
   the rest at the parish office. The API enforces the same split. */
const ONLINE = new Set(['massIntention', 'documentRequest']);

/**
 * How the offering for a request gets settled — one way, never a choice:
 * online (QR Ph / GCash) for a Mass intention or a document, at the parish
 * office for a sacrament, a blessing or an occasional Mass. Pressing the
 * office button records that choice, which is what makes the booking count.
 *
 * Props:
 *   amount      – number   PHP pesos (e.g. 500) — shown; the API charges the record's own fee
 *   description – string   shown on the checkout page
 *   serviceType – string   enum matching Payment model
 *   referenceId – string   _id of the related service record
 *   compact     – boolean  render just the button (no fee info block)
 *   onsiteChosen – boolean the office was already chosen (from a lookup)
 */
export default function PayButton({ amount, description, serviceType, referenceId, compact = false, onsiteChosen = false }) {
    const { checkout, payCash } = usePayment();
    const [busy,     setBusy]     = useState('');   // '' | 'online' | 'cash'
    const [err,      setErr]      = useState('');
    const [cashDone, setCashDone] = useState(onsiteChosen);

    const online = ONLINE.has(serviceType);

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
            setErr(e?.response?.data?.message || 'Could not record that. Please try again.');
        } finally {
            setBusy('');
        }
    };

    /* ── The office it is — nothing more to press ── */
    if (cashDone) return (
        <div className="pay-cash-done">
            <FontAwesomeIcon icon={faCircleCheck} className="pay-cash-done__icon" />
            <div>
                <strong>Pay at the parish office</strong>
                <p>Please settle ₱{Number(amount).toLocaleString()} at the parish office. Your request stays pending until the office records it.</p>
            </div>
        </div>
    );

    const button = online ? (
        <button className={`btn btn--pay${compact ? ' btn--sm' : ''}`} onClick={handlePay} disabled={!!busy}>
            {busy === 'online'
                ? <><FontAwesomeIcon icon={faSpinner} spin /> Redirecting…</>
                : <><FontAwesomeIcon icon={faQrcode} /> {compact ? 'Pay Online' : 'Pay online — QR Ph / GCash'}</>
            }
        </button>
    ) : (
        <button className={`btn btn--pay${compact ? ' btn--sm' : ''}`} onClick={handleCash} disabled={!!busy}>
            {busy === 'cash'
                ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving…</>
                : <><FontAwesomeIcon icon={faMoneyBillWave} /> Pay at the parish office</>
            }
        </button>
    );

    /* ── Compact mode: just the button (used inside cards) ── */
    if (compact) return (
        <>
            {err && (
                <span className="pay-compact__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </span>
            )}
            <div className="pay-compact__btns">{button}</div>
        </>
    );

    /* ── Full mode: info block + button (used after form submit) ── */
    return (
        <div className="pay-prompt">
            <div className="pay-prompt__info">
                <div className="pay-prompt__label">Offering</div>
                <div className="pay-prompt__amount">
                    ₱{Number(amount).toLocaleString()}
                </div>
                <div className="pay-prompt__method">
                    <FontAwesomeIcon icon={online ? faQrcode : faMoneyBillWave} />
                    <span>{online ? 'Paid online — QR Ph, GCash, Maya, UnionBank' : 'Settled in cash at the parish office'}</span>
                </div>
            </div>

            {err && (
                <div className="pay-prompt__error">
                    <FontAwesomeIcon icon={faCircleExclamation} /> {err}
                </div>
            )}

            <div className="pay-prompt__btns">{button}</div>
        </div>
    );
}
