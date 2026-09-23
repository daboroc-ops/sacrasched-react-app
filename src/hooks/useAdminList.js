import { useState, useEffect, useCallback } from 'react';
import useAxiosPrivate from './useAxiosPrivate';

/**
 * Paged + filtered list state for the admin tables.
 *
 * Every /admin-api list endpoint answers with the same envelope:
 *   { items, page, limit, total, totalPages, ...extras }
 * so one hook covers users, payments and all five request collections.
 */
export default function useAdminList(path, { status = 'all', search = '', type = 'all' } = {}) {
    const axios = useAxiosPrivate();

    const [data,    setData]    = useState({ items: [], page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    const [page,    setPageState]   = useState(1);
    const [statusF, setStatusState] = useState(status);
    const [searchF, setSearchState] = useState(search);
    const [typeF,   setTypeState]   = useState(type);     // the tab over the list
    const [nonce,   setNonce]       = useState(0);   // bumped to force a refetch

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const res = await axios.get(path, {
                    params: {
                        page,
                        ...(statusF && statusF !== 'all' ? { status: statusF } : {}),
                        ...(searchF ? { search: searchF } : {}),
                        ...(typeF && typeF !== 'all' ? { type: typeF } : {}),
                    }
                });
                if (!alive) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!alive) return;
                setError(
                    err?.response?.status === 403
                        ? 'You do not have permission to view this section.'
                        : err?.response?.data?.message || 'Failed to load records.'
                );
                setData({ items: [], page: 1, totalPages: 1, total: 0 });
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [axios, path, page, statusF, searchF, typeF, nonce]);

    /* The spinner is raised by whatever triggered the fetch, so the effect
       itself never has to call setState synchronously. */
    const setPage = value => { setLoading(true); setPageState(value); };
    const reload  = useCallback(() => { setLoading(true); setNonce(n => n + 1); }, []);

    // Filter changes always restart at page 1
    const setStatus = value => { setLoading(true); setStatusState(value); setPageState(1); };
    const setSearch = value => { setLoading(true); setSearchState(value); setPageState(1); };
    const setType   = value => { setLoading(true); setTypeState(value);   setPageState(1); };

    return {
        ...data,
        loading,
        error,
        page,
        status: statusF,
        search: searchF,
        type:   typeF,
        setPage,
        setStatus,
        setSearch,
        setType,
        reload,
    };
}
