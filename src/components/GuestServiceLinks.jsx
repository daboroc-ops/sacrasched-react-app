import { Link } from 'react-router-dom';
import useSiteContent from '../hooks/useSiteContent';
import ServiceCard from './ServiceCard';
import { SERVICES } from '../utils/services';

/**
 * The parish's other three services, under the guest Mass-intention form.
 *
 * These are links, not forms. Only Mass intentions can be offered without an
 * account — /guest/* exposes that one route, and a blessing, a sacrament or a
 * document each need a record the parish can tie to a person over time. So
 * each card goes to sign-in rather than pretending to take a booking it
 * cannot file.
 *
 * They share ServiceCard with the devotee's picker, so a photo published to a
 * service's CMS slot shows up in both places.
 */
export default function GuestServiceLinks() {
    const { slots } = useSiteContent();
    const others = SERVICES.filter(s => s.id !== 'intention');

    return (
        <section className="gsl">
            <div className="gsl__hd">
                <h3>Also available from this parish</h3>
                <p>
                    These need an account, so the parish can keep your records together
                    and you can follow every request in one place.
                </p>
            </div>

            <div className="bk-picker gsl__grid">
                {others.map((s, i) => (
                    <ServiceCard
                        key={s.id}
                        service={s}
                        art={slots[s.slot]}
                        as={Link}
                        to="/login"
                        className="gsl__card"
                        style={{ animationDelay: `${i * 55}ms` }}
                    />
                ))}
            </div>

            <p className="gsl__foot">
                No account yet? <Link to="/register">Create one</Link> — it takes a minute.
            </p>
        </section>
    );
}
