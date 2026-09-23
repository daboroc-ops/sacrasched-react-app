import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck, faSpinner, faQrcode, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { usePageTitle } from '../hooks/useParish';
import ResultPage from '../components/ResultPage';
import ReceiptButton from '../components/ReceiptButton';

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

    usePageTitle('Payment');

    // checking → pending (auto-polls) → succeeded | timedout
    const [phase,     setPhase]     = useState('checking');
    const [payment,   setPayment]   = useState(null);
    const [parish,    setParish]    = useState(null);   // whose church — for the banner
    const [checking,  setChecking]  = useState(false); // manual retry spinner
    const pollCount   = useRef(0);
    const pollTimer   = useRef(null);

    const verify = useCallback(async () => {
        if (!paymentId) { setPhase('timedout'); return; }
        try {
            const res = await axios.get(`/payment/${paymentId}/verify`);
            setPayment(res.data.payment);
            if (res.data.parish) setParish(res.data.parish);
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
            if (res.data.parish) setParish(res.data.parish);
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

    const toDashboard = (
        <button
            className="btn btn--primary"
            onClick={() => navigate('/dashboard', { replace: true })}
        >
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Calendar
        </button>
    );

    /* ── Checking / polling ── */
    if (phase === 'checking' || phase === 'pending') return (
        <ResultPage
            parish={parish}
            eyebrow="Paying"
            tone="pending"
            icon={faSpinner}
            iconSpin
            title={phase === 'checking' ? 'Verifying payment…' : 'Waiting for confirmation…'}
            sub="Your QR payment is being processed. This page checks on its own — QR Ph confirmation can take a few minutes."
        />
    );

    /* ── Success ── */
    if (phase === 'succeeded') return (
        <ResultPage
            parish={parish}
            eyebrow="Paid to"
            tone="ok"
            icon={faCircleCheck}
            title="Payment confirmed"
            sub="Your offering has been recorded. Download the receipt for your records."
            actions={<>
                <ReceiptButton paymentId={paymentId} />
                {toDashboard}
            </>}
        >
            {payment && (
                <dl className="res__facts">
                    <div>
                        <dt>Amount</dt>
                        <dd className="res__amount">{fmtPHP(payment.amount)}</dd>
                    </div>
                    <div>
                        <dt>For</dt>
                        <dd>{payment.description}</dd>
                    </div>
                    <div>
                        <dt>Method</dt>
                        <dd>QR Ph</dd>
                    </div>
                    <div>
                        <dt>Reference</dt>
                        <dd className="res__mono">
                            {payment.paymongoPaymentId || payment.paymongoCheckoutId || '—'}
                        </dd>
                    </div>
                </dl>
            )}
        </ResultPage>
    );

    /* ── Timed out — a manual retry, not a hard failure ── */
    return (
        <ResultPage
            parish={parish}
            eyebrow="Paying"
            tone="pending"
            icon={faQrcode}
            title="Still processing"
            sub={<>
                Your QR payment may still be on its way — bank confirmation can take a
                few minutes. Once you have finished the scan in your banking app,
                check again.
            </>}
            actions={<>
                <button className="btn btn--primary" onClick={handleRetry} disabled={checking}>
                    {checking
                        ? <><FontAwesomeIcon icon={faSpinner} spin /> Checking…</>
                        : 'Check again'}
                </button>
                {toDashboard}
            </>}
        />
    );
}
