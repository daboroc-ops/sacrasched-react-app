import { useState, useEffect } from 'react';
import useAxiosPrivate from './useAxiosPrivate';
import { isoKey } from '../utils/liturgical';

/**
 * Today's entry in the Church calendar — season, celebration, colour.
 *
 * The API answers a whole month at a time and caches it, so asking for one
 * day costs the same as asking for thirty. Returns null while it loads and
 * whenever the upstream calendar is unreachable: the banner simply drops the
 * strip rather than showing a broken one.
 */
export default function useLiturgicalDay() {
    const axios = useAxiosPrivate();

    // Fixed for the life of the dashboard — a session does not cross midnight
    // often enough to be worth a timer.
    const [today] = useState(() => new Date());
    const [day, setDay] = useState(null);

    const year  = today.getFullYear();
    const month = today.getMonth() + 1;

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/user/liturgical', { params: { year, month } });
                if (alive) setDay(res.data?.days?.[isoKey(today)] || null);
            } catch {
                // Decorative — never let it break the dashboard
                if (alive) setDay(null);
            }
        })();
        return () => { alive = false; };
    }, [axios, today, year, month]);

    return day;
}
