import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck, faCircleXmark, faSpinner, faQrcode, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

// Poll aggressively at first (every 2 s), then slow down.
// QRPH confirmation from PayMongo can take a few seconds after redirect.
const POLL_SCHEDULE_MS = [2000, 2000, 3000, 3000, 4000, 5000, 5000, 5000, 8000, 10000]; // ~47 s total

export default function PaymentSuccess() {
    const [searchParams]        = useSearchParams();
    const navigate              = useNavigate();
    const axios                 = useAxiosPrivate();
    const paymentId             = searchParams.get('payment_id');

    const [phase,    setPhase]    = useState('checking'); // checking | succeeded | failed | pending
    const [payment,  setPayment]  = useState(null);
    const pollCount  = useRef(0);
    const pollTimer  = useRef(null);

    const verify = useCallback(async () => {
        if (!paymentId) { setPhase('failed'); return; }
        try {
            const res = await axios.get(`/payment/${paymentId}/verify`);
            setPayment(res.data.payment);
            setPhase(res.data.status === 'succeeded' ? 'succeeded'
                   : res.data.status === 'failed'    ? 'failed'
                   :                                   'pending');
        } catch {
            setPhase('failed');
        }
    }, [paymentId]); // eslint-disable-line

    // First call immediately on mount — then the polling effect takes over
    useEffect(() => {
        verify();
    }, []); // eslint-disable-line

    // Poll while still pending/checking, using a back-off schedule
    useEffect(() => {
        if (phase !== 'pending' && phase !== 'checking') return;
        const idx = pollCount.current;
        if (idx >= POLL_SCHEDULE_MS.length) { setPhase('failed'); return; }
        pollTimer.current = setTimeout(() => {
            pollCount.current += 1;
            verify();
        }, POLL_SCHEDULE_MS[idx]);
        return () => clearTimeout(pollTimer.current);
    }, [phase, verify]);

    /* ── render helpers ── */
    const fmtPHP = n => n != null ? `₱${Number(n).toLocaleString()}` : '—';

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
                    {phase === 'pending'
                        ? 'Your QR payment is being processed. This page will update automatically.'
                        : 'Please wait while we check your payment status.'}
                </p>
                {phase === 'pending' && (
                    <div className="pay-result-card__badge">
                        <FontAwesomeIcon icon={faQrcode} />
                        <span>QR Ph</span>
                    </div>
                )}
            </div>
        </div>
    );

    if (phase === 'succeeded') return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--success">
                    <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <h2 className="pay-result-card__title">Payment Successful!</h2>
                <p className="pay-result-card__sub">
                    Your payment has been confirmed and recorded.
                </p>

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
                            <span className="pay-detail-row__val">
                                <FontAwesomeIcon icon={faQrcode} style={{ marginRight: 5 }} />
                                QR Ph
                            </span>
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

    // failed
    return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--failed">
                    <FontAwesomeIcon icon={faCircleXmark} />
                </div>
                <h2 className="pay-result-card__title">Payment Not Confirmed</h2>
                <p className="pay-result-card__sub">
                    We could not confirm your payment. If you completed the QR scan, please
                    check your <strong>My Requests</strong> tab — it may still be processing.
                    Contact the parish office if the issue persists.
                </p>
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
}
