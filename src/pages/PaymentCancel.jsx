import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { usePageTitle } from '../hooks/useParish';
import ResultPage from '../components/ResultPage';

export default function PaymentCancel() {
    const navigate = useNavigate();
    const axios    = useAxiosPrivate();
    const [searchParams] = useSearchParams();
    const paymentId = searchParams.get('payment_id');
    const [parish, setParish] = useState(null);

    usePageTitle('Payment cancelled');

    // Whose church the offering was for — the banner says so
    useEffect(() => {
        if (!paymentId) return;
        let alive = true;
        axios.get(`/payment/${paymentId}/verify`)
            .then(res => { if (alive && res.data?.parish) setParish(res.data.parish); })
            .catch(() => {});
        return () => { alive = false; };
    }, [paymentId, axios]);

    return (
        <ResultPage
            parish={parish}
            eyebrow="Booked with"
            tone="pending"
            icon={faRotateLeft}
            title="Payment cancelled"
            sub={<>
                You cancelled the payment session. Your request has still been
                saved — you can pay for it later from <b>My Requests</b>.
            </>}
            actions={
                <button
                    className="btn btn--primary"
                    onClick={() => navigate('/dashboard', { replace: true })}
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to Calendar
                </button>
            }
        />
    );
}
