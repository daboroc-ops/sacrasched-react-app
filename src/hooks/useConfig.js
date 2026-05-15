import { useState, useEffect } from 'react';
import useAxiosPrivate from './useAxiosPrivate';

// Module-level cache — fetched once per session
let _cache = null;

export default function useConfig() {
    const axios = useAxiosPrivate();
    const [config, setConfig]   = useState(_cache);
    const [loading, setLoading] = useState(!_cache);

    useEffect(() => {
        if (_cache) return;
        axios.get('/user/config')
            .then(r => { _cache = r.data; setConfig(r.data); })
            .catch(() => {
                // fallback so forms still render
                const fallback = { massSchedule: { weekdays: [], saturdays: [], sundays: [] }, priests: [], venues: [], serviceCategories: [] };
                _cache = fallback;
                setConfig(fallback);
            })
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line

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
