import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

/**
 * Downloads the PDF receipt for a paid payment.
 *
 * The route is authenticated and the token lives in memory, so a plain link
 * would 401 — the file is fetched with the token and saved from a blob.
 */
export default function ReceiptButton({ paymentId, compact = false, className = '' }) {
    const axios = useAxiosPrivate();
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');

    const download = async () => {
        setBusy(true); setErr('');
        try {
            const res = await axios.get(`/payment/${paymentId}/receipt`, { responseType: 'blob', timeout: 60000 });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = `receipt-${String(paymentId).slice(-8).toUpperCase()}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setErr('Could not get the receipt.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button type="button" className={`btn btn--ghost ${compact ? 'btn--sm' : ''} ${className}`}
                    onClick={download} disabled={busy} title="Download the PDF receipt">
                <FontAwesomeIcon icon={faFileArrowDown} /> {busy ? 'Preparing…' : 'Receipt'}
            </button>
            {err && <span className="form-error">{err}</span>}
        </>
    );
}
