import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useParish, { usePageTitle } from '../hooks/useParish';
import GuestBooking from '../components/GuestBooking';

/**
 * Where the "Check your booking status" link in the confirmation email lands.
 *
 * The reference arrives in ?ref= and is filled in for the visitor, so nothing
 * has to be copied by hand. They confirm their email address and the status
 * appears — that one field is the second factor, which is why the email is
 * kept out of the link: a forwarded message should not open someone's booking.
 */
export default function TrackRequest() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { parish, siteName, isTenant } = useParish();

    /* Back from here is the parish's calendar — on its own site the landing
       page's, on the platform host the parish's page — not the booking cover. */
    const toCalendar = () => navigate(isTenant ? '/#calendar' : parish?.subdomain ? `/parish/${parish.subdomain}#calendar` : '/');

    usePageTitle('Your booking');

    const reference = params.get('ref') || '';
    const token     = params.get('t')   || '';
    const fromLink  = Boolean(reference && token);

    return (
        <div className="lp lp-track">
            <header className="lp-nav">
                <div className="lp-nav__inner">
                    <Link to="/" className="lp-nav__brand">
                        <img src="/favicon.svg" alt="" className="lp-nav__mark" />
                        <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="lp-nav__wordmark" />
                    </Link>
                </div>
            </header>

            <section className="lp-section">
                <div className="lp-section__inner">
                    {/* Opened from the link, the booking speaks for itself —
                        the parish banner heads it, so no heading above. */}
                    {!fromLink && (
                        <div className="lp-section__hd">
                            <span className="lp-eyebrow">Your booking</span>
                            <h2>Check your request</h2>
                            <p>
                                {reference
                                    ? 'Your reference is filled in below. Confirm the email address you booked with to see the status.'
                                    : `Enter the reference ${isTenant ? siteName : 'the parish'} emailed you, along with the address you booked with.`}
                            </p>
                        </div>
                    )}

                    <GuestBooking
                        parishName={siteName}
                        parishId={parish?._id}
                        initialMode="track"
                        initialReference={reference}
                        autoToken={token}
                        onExit={toCalendar}
                    />
                </div>
            </section>
        </div>
    );
}
