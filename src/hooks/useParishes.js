import { useState, useEffect, useRef } from 'react';
import useAxiosPrivate from './useAxiosPrivate';

// Shared in-flight request so all instances fetch the parish list once.
let _parishPromise = null;

export default function useParishes() {
    const axiosPrivate = useAxiosPrivate();
    const [parishes, setParishes] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        if (!_parishPromise) {
            _parishPromise = axiosPrivate.get('/parishes')
                .then(r => r.data)
                .catch(() => {
                    _parishPromise = null; // allow retry on next mount
                    return [];
                });
        }

        _parishPromise.then(data => {
            if (mountedRef.current) {
                setParishes(Array.isArray(data) ? data : []);
                setLoading(false);
            }
        });

        return () => { mountedRef.current = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- axiosPrivate is a stable singleton

    return { parishes, loading };
}
