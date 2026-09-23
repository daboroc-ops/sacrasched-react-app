import { useState, useEffect } from 'react';
import axiosPublic from '../api/axios';
import useAxiosPrivate from './useAxiosPrivate';

/**
 * The times a booking form may offer for a day — by the parish's rules,
 * from the server that will enforce them.
 *
 * Answers { loading, ok, reason, times, window, venues }. `reason` says why a day is
 * closed ("Wednesday is the parish priest's day off", "That day has already
 * passed") so the form can say it instead of showing an empty list.
 *
 * Guest forms hit the public route; a signed-in devotee the private one. The
 * public route takes the parish from the host, or from `subdomain` on the
 * platform's preview page where there is no parish host.
 *
 * For an intention, `venues` lists the places with a Mass of their own
 * that day (the cemeteries on Undas); pass one back as `venue` and the
 * times are that venue's instead of the church's.
 *
 * `refresh()` asks again — for when the server turns a booking down because
 * the hour went to someone else while the form was being filled in.
 */
export default function useAvailability({ service, type = '', date, venue = '', guest = false, subdomain = '', parishId = '' }) {
    const axiosPrivate = useAxiosPrivate();
    const [state, setState] = useState({ loading: false, ok: false, reason: '', times: [], window: null, venues: [] });
    const [round, setRound] = useState(0);

    useEffect(() => {
        let alive = true;

        (async () => {
            if (!date || !service || service === 'document') {
                setState({ loading: false, ok: false, reason: '', times: [], window: null, venues: [] });
                return;
            }
            setState(s => ({ ...s, loading: true }));

            const api = guest ? axiosPublic : axiosPrivate;
            const url = guest ? '/site/availability' : '/user/availability';
            // A devotee on the platform host names the parish they picked;
            // on a parish site or for staff the server already knows.
            const params = { service, type, date, ...(venue && { venue }), ...(guest && subdomain && { subdomain }), ...(!guest && parishId && { parishId }) };

            try {
                const res = await api.get(url, { params });
                if (!alive) return;
                const d = res.data || {};
                setState({ loading: false, ok: Boolean(d.ok), reason: d.reason || '', times: d.times || [], window: d.window || null, venues: d.venues || [] });
            } catch (err) {
                if (!alive) return;
                setState({ loading: false, ok: false, reason: err?.response?.data?.message || 'Could not load the available times.', times: [], window: null, venues: [] });
            }
        })();

        return () => { alive = false; };
    }, [service, type, date, venue, guest, subdomain, parishId, axiosPrivate, round]);

    return { ...state, refresh: () => setRound(n => n + 1) };
}
