import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';

/**
 * The parish's standing reminders, on the last step of every booking form:
 * there is no cancelling a booking online, and an occasional Mass is a
 * reservation the office confirms.
 */
export default function BookingNotice({ reservation = false }) {
    return (
        <div className="form-group form-group--full">
            {reservation && (
                <p className="gb__notice gb__notice--info">
                    <FontAwesomeIcon icon={faCircleExclamation} />
                    <span><b>For reservation only.</b> The parish office confirms the Mass and the arrangements with you.</span>
                </p>
            )}
            <p className="gb__notice">
                <FontAwesomeIcon icon={faCircleExclamation} />
                <span><b>No booking cancellation.</b> Once sent, a request cannot be cancelled online — please be sure of the date and time before you submit.</span>
            </p>
        </div>
    );
}
