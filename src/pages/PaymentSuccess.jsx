import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck, faSpinner, faQrcode, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

// Aggressive early polls, then slow back-off — covers ~3 minutes total.
// QRPH confirmation from PayMongo can lag 30 s – 2 min after the redirect
// because PayMongo redirects the user before the bank fully confirms.
const POLL_SCHEDULE_MS = [
    2000, 2000, 3000,           // 0–7 s   (first 3 polls)
    5000, 5000, 5000,           // 7–22 s
    10000, 10000, 10000,        // 22–52 s
    15000, 15000, 15000, 15000, // 52–112 s (~2 min)
    20000, 20000,               // 112–152 s (~2.5 min)
    30000,                      // 152–182 s (~3 min)
];

export default function PaymentSuccess() {
    const [searchParams]        = useSearchParams();
    const navigate              = useNavigate();
    const axios                 = useAxiosPrivate();
    const paymentId             = searchParams.get('payment_id');

    // checking → pending (auto-polls) → succeeded | timedout
    const [phase,     setPhase]     = useState('checking');
    const [payment,   setPayment]   = useState(null);
    const [checking,  setChecking]  = useState(false); // manual retry spinner
    const pollCount   = useRef(0);
    const pollTimer   = useRef(null);

    const verify = useCallback(async () => {
        if (!paymentId) { setPhase('timedout'); return; }
        try {
            const res = await axios.get(`/payment/${paymentId}/verify`);
            setPayment(res.data.payment);
            if      (res.data.status === 'paid')   setPhase('succeeded');
            else if (res.data.status === 'failed')  setPhase('timedout');
            else                                    setPhase('pending');
        } catch {
            // Network error — don't hard-fail, stay in pending so polling continues
            setPhase(p => p === 'checking' ? 'pending' : p);
        }
    }, [paymentId]); // eslint-disable-line

    // Immediate first check on mount
    useEffect(() => { verify(); }, []); // eslint-disable-line

    // Auto-poll while pending / checking
    useEffect(() => {
        if (phase !== 'pending' && phase !== 'checking') return;
        const idx = pollCount.current;
        if (idx >= POLL_SCHEDULE_MS.length) {
            setPhase('timedout'); // poll window exhausted — show manual retry
            return;
        }
        pollTimer.current = setTimeout(() => {
            pollCount.current += 1;
            verify();
        }, POLL_SCHEDULE_MS[idx]);
        return () => clearTimeout(pollTimer.current);
    }, [phase, verify]);

    // Manual "Check Again" — resets poll counter and tries immediately
    const handleRetry = useCallback(async () => {
        setChecking(true);
        pollCount.current = 0;
        try {
            const res = await axios.get(`/payment/${paymentId}/verify`);
            setPayment(res.data.payment);
            if (res.data.status === 'paid') {
                setPhase('succeeded');
            } else if (res.data.status === 'failed') {
                setPhase('timedout');
            } else {
                // Still pending — restart auto-polling from the beginning
                setPhase('pending');
            }
        } catch {
            // keep current phase
        } finally {
            setChecking(false);
        }
    }, [paymentId]); // eslint-disable-line

    const fmtPHP = n => n != null ? `₱${Number(n).toLocaleString()}` : '—';

    /* ── Checking / polling ── */
    if (phase === 'checking' || phase === 'pending') return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--pending">
                    <FontAwesomeIcon icon={faSpinner} spin />
                </div>
                <h2 className="pay-result-card__title">
                    {phase === 'checking' ? 'Verifying payment…' : 'Waiting for confirmation…'}
                </h2>
                <p className="pay-result-card__sub">
                    Your QR payment is being processed. This page checks automatically —
                    QR Ph confirmation can take up to a few minutes.
                </p>
            </div>
        </div>
    );

    /* ── Success ── */
    if (phase === 'succeeded') return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--success">
                    <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <h2 className="pay-result-card__title">Payment Confirmed!</h2>
                <p className="pay-result-card__sub">Your payment has been recorded.</p>

                {payment && (
                    <div className="pay-result-card__details">
                        <div className="pay-detail-row">
                            <span className="pay-detail-row__label">Amount</span>
                            <span className="pay-detail-row__val pay-detail-row__val--amount">
                                {fmtPHP(payment.amount)}
                            </span>
                        </div>
                        <div className="pay-detail-row">
                            <span className="pay-detail-row__label">Description</span>
                            <span className="pay-detail-row__val">{payment.description}</span>
                        </div>
                        <div className="pay-detail-row">
                            <span className="pay-detail-row__label">Method</span>
                            <span className="pay-detail-row__val">QR Ph</span>
                        </div>
                        <div className="pay-detail-row">
                            <span className="pay-detail-row__label">Reference</span>
                            <span className="pay-detail-row__val pay-detail-row__val--mono">
                                {payment.paymongoPaymentId || payment.paymongoCheckoutId || '—'}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    className="btn btn--primary btn--full"
                    onClick={() => navigate('/dashboard', { replace: true })}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    /* ── Timed out — show manual retry, NOT a hard failure ── */
    return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--pending">
                    <FontAwesomeIcon icon={faQrcode} />
                </div>
                <h2 className="pay-result-card__title">Still Processing…</h2>
                <p className="pay-result-card__sub">
                    Your QR payment may still be on its way. Bank confirmation can sometimes
                    take a few minutes. Click <strong>Check Again</strong> after completing
                    the scan in your banking app.
                </p>
                <button
                    className="btn btn--primary btn--full"
                    onClick={handleRetry}
                    disabled={checking}
                    style={{ marginBottom: '10px' }}
                >
                    {checking
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Checking…</>
                        : 'Check Again'}
                </button>
                <button
                    className="btn btn--ghost btn--full"
                    onClick={() => navigate('/dashboard', { replace: true })}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
