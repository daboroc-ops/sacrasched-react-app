import { useState, useEffect, useRef } from 'react';
import useAxiosPrivate from './useAxiosPrivate';

// Promise-level singleton — all hook instances share one in-flight request.
// Cleared on error so a retry triggers a fresh fetch.
let _configPromise = null;

const FALLBACK = { massSchedule: { weekdays: [], saturdays: [], sundays: [] }, priests: [], venues: [], serviceCategories: [] };

export default function useConfig() {
    const axiosPrivate = useAxiosPrivate();
    const [config, setConfig]   = useState(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        if (!_configPromise) {
            _configPromise = axiosPrivate.get('/user/config')
                .then(r => r.data)
                .catch(() => {
                    _configPromise = null; // allow retry on next mount
                    return FALLBACK;
                });
        }

        _configPromise.then(data => {
            if (mountedRef.current) {
                setConfig(data);
                setLoading(false);
            }
        });

        return () => { mountedRef.current = false; };
    }, []); // intentionally empty — fetch once per session, axiosPrivate is a stable singleton

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
