import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faRotateLeft } from '@fortawesome/free-solid-svg-icons';

export default function PaymentCancel() {
    const navigate = useNavigate();

    return (
        <div className="pay-result-page">
            <div className="pay-result-card">
                <div className="pay-result-card__icon pay-result-card__icon--cancelled">
                    <FontAwesomeIcon icon={faRotateLeft} />
                </div>
                <h2 className="pay-result-card__title">Payment Cancelled</h2>
                <p className="pay-result-card__sub">
                    You cancelled the payment session. Your request has still been saved —
                    you can pay later from the <strong>My Requests</strong> tab.
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
