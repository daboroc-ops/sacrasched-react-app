import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';

/**
 * The parish's own activities — SAKOP on Saturdays, the Living Rosary,
 * Youth Day — as the office writes them on the board: a name and when, in
 * words. Sits under the news on the landing page; absent until the office
 * has entered any.
 */
export default function ParishActivities({ subdomain = '' }) {
    const [acts, setActs] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const now = new Date();
                const res = await axiosPublic.get('/site/events', {
                    params: { year: now.getFullYear(), month: now.getMonth() + 1, ...(subdomain && { subdomain }) }
                });
                if (alive) setActs(res.data?.activities || []);
            } catch {
                if (alive) setActs([]);
            }
        })();
        return () => { alive = false; };
    }, [subdomain]);

    if (!acts || acts.length === 0) return null;

    return (
        <section className="lp-section lp-section--alt" id="activities">
            <div className="lp-section__inner">
                <div className="lp-section__hd">
                    <h2>Parish activities</h2>
                </div>
                <ul className="pa">
                    {acts.map((a, i) => (
                        <li key={i} className="pa__item">
                            <span className="pa__icon"><FontAwesomeIcon icon={faPeopleGroup} /></span>
                            <span className="pa__body">
                                <b>{a.name}</b>
                                {a.schedule && <span>{a.schedule}</span>}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
