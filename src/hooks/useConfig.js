import { useState, useEffect, useRef } from 'react';
import useAxiosPrivate from './useAxiosPrivate';

// One in-flight request per parish, shared by every hook instance — cleared
// on error so a retry fetches again.
const _configPromises = new Map();

const FALLBACK = { massSchedule: { weekdays: [], saturdays: [], sundays: [] }, priests: [], venues: [], serviceCategories: [] };

/**
 * The booking-form configuration: service items and fees, Mass times,
 * priests, venues, the parish's settings.
 *
 * On a parish site (or for staff) the server knows the parish. A devotee on
 * the platform host picks one in the form, and passes it here so the fees
 * and times shown are that parish's — the same ones the submit is checked
 * against.
 */
export default function useConfig(parishId = '') {
    const axiosPrivate = useAxiosPrivate();
    // { parishId, data } — a config counts only for the parish it was fetched for
    const [state, setState] = useState({ parishId: null, data: null });
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        const key = parishId || '';
        if (!_configPromises.has(key)) {
            _configPromises.set(key, axiosPrivate.get('/user/config', { params: key ? { parishId: key } : {} })
                .then(r => r.data)
                .catch(() => {
                    _configPromises.delete(key); // allow retry on next mount
                    return FALLBACK;
                }));
        }

        _configPromises.get(key).then(data => {
            if (mountedRef.current) setState({ parishId: key, data });
        });

        return () => { mountedRef.current = false; };
    }, [parishId]); // eslint-disable-line react-hooks/exhaustive-deps -- axiosPrivate is a stable singleton

    // A config for a different parish than the one asked for is stale
    const config  = state.parishId === (parishId || '') ? state.data : null;
    const loading = config === null;

    /**
     * Find service items for a category whose name contains `keyword`.
     * Returns [] if no match, so forms degrade gracefully.
     */
    const getCategoryItems = (keyword) => {
        if (!config?.serviceCategories?.length) return [];
        const kw = keyword.toLowerCase();
        const cat = config.serviceCategories.find(c => c.name.toLowerCase().includes(kw));
        return cat?.items || [];
    };

    return { config, loading, getCategoryItems };
}
