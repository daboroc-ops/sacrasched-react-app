import { useContext, useEffect } from 'react';
import ParishContext from '../context/ParishContext';

/**
 * The parish this site belongs to, or null on the platform host.
 * See context/ParishContext.jsx.
 */
const useParish = () => useContext(ParishContext);

/** Keeps the browser tab title in step with the tenant. */
export function usePageTitle(page) {
    const { siteName } = useContext(ParishContext);

    useEffect(() => {
        document.title = page ? `${page} · ${siteName}` : siteName;
    }, [page, siteName]);
}

export default useParish;
